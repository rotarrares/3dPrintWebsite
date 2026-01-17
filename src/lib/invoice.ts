import type { Order, Invoice } from '@prisma/client';
import { db } from './db.js';
import { uploadBuffer, deleteFile } from './storage.js';
import { createInvoicePdf, type InvoiceData, type LineItem, type CustomerInfo } from './invoice-pdf.js';
import { getCompanyInfo } from '../config/company.js';

interface ShippingAddress {
  street?: string;
  city?: string;
  county?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Generates a sequential invoice number: FACT-YYYY-NNNN
 * Uses database transaction for thread safety
 */
export async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();

  const result = await db.$transaction(async (tx) => {
    let counter = await tx.invoiceCounter.findUnique({
      where: { id: 'default' },
    });

    if (!counter || counter.year !== currentYear) {
      // Reset counter for new year
      counter = await tx.invoiceCounter.upsert({
        where: { id: 'default' },
        update: { year: currentYear, counter: 1 },
        create: { id: 'default', year: currentYear, counter: 1 },
      });
    } else {
      // Increment existing counter
      counter = await tx.invoiceCounter.update({
        where: { id: 'default' },
        data: { counter: { increment: 1 } },
      });
    }

    return counter;
  });

  const paddedNumber = String(result.counter).padStart(4, '0');
  return `FACT-${result.year}-${paddedNumber}`;
}

/**
 * Creates an invoice for an order
 * Generates the PDF and uploads to R2
 */
export async function createInvoice(orderId: string): Promise<Invoice> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { invoice: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.invoice) {
    throw new Error(`Invoice already exists for order: ${order.orderNumber}`);
  }

  if (!order.price) {
    throw new Error(`Order ${order.orderNumber} has no price set`);
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Calculate totals
  const subtotal = Number(order.price);
  const shippingCost = order.shippingCost ? Number(order.shippingCost) : 0;
  const total = subtotal + shippingCost;

  // Create invoice record
  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      orderId,
      subtotal,
      shippingCost,
      total,
      status: 'DRAFT',
    },
  });

  // Generate and upload PDF
  try {
    const pdfBuffer = await generateInvoicePdf(order, invoice);
    const pdfUrl = await uploadBuffer(
      pdfBuffer,
      `${invoiceNumber}.pdf`,
      'application/pdf',
      'invoices'
    );

    // Update invoice with PDF URL
    const updatedInvoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfUrl,
        status: 'GENERATED',
      },
    });

    console.log(`[Invoice] Generated ${invoiceNumber} for order ${order.orderNumber}`);
    return updatedInvoice;
  } catch (error) {
    // If PDF generation fails, delete the invoice record
    await db.invoice.delete({ where: { id: invoice.id } });
    throw error;
  }
}

/**
 * Regenerates an invoice PDF (keeps the same invoice number)
 */
export async function regenerateInvoice(invoiceId: string): Promise<Invoice> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true },
  });

  if (!invoice || !invoice.order) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Delete old PDF if exists
  if (invoice.pdfUrl) {
    try {
      await deleteFile(invoice.pdfUrl);
    } catch (error) {
      console.error(`[Invoice] Failed to delete old PDF: ${error}`);
    }
  }

  // Recalculate totals from current order data
  const subtotal = invoice.order.price ? Number(invoice.order.price) : 0;
  const shippingCost = invoice.order.shippingCost ? Number(invoice.order.shippingCost) : 0;
  const total = subtotal + shippingCost;

  // Generate new PDF
  const pdfBuffer = await generateInvoicePdf(invoice.order, invoice);
  const pdfUrl = await uploadBuffer(
    pdfBuffer,
    `${invoice.invoiceNumber}.pdf`,
    'application/pdf',
    'invoices'
  );

  // Update invoice
  const updatedInvoice = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      shippingCost,
      total,
      pdfUrl,
      status: 'GENERATED',
    },
  });

  console.log(`[Invoice] Regenerated ${invoice.invoiceNumber}`);
  return updatedInvoice;
}

/**
 * Gets invoice by order ID
 */
export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  return db.invoice.findUnique({
    where: { orderId },
  });
}

/**
 * Marks invoice as sent
 */
export async function markInvoiceAsSent(invoiceId: string): Promise<Invoice> {
  return db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });
}

/**
 * Generates PDF buffer for an invoice
 */
async function generateInvoicePdf(order: Order, invoice: Invoice): Promise<Buffer> {
  const shippingAddress = order.shippingAddress as ShippingAddress | null;

  const customer: CustomerInfo = {
    name: order.customerName,
    address: shippingAddress?.street || '',
    city: shippingAddress?.city || order.customerCity,
    county: shippingAddress?.county || '',
    postalCode: shippingAddress?.postalCode || '',
    country: shippingAddress?.country || 'Romania',
  };

  const lineItems: LineItem[] = [];

  // Main product/service
  const productDescription = order.description || 'Serviciu printare 3D personalizata';
  const productPrice = order.price ? Number(order.price) : 0;

  lineItems.push({
    description: productDescription,
    quantity: 1,
    unitPrice: productPrice,
    total: productPrice,
  });

  // Shipping as separate line item
  const shippingCost = order.shippingCost ? Number(order.shippingCost) : 0;
  if (shippingCost > 0) {
    lineItems.push({
      description: `Transport - ${order.shippingMethod || 'Curier'}`,
      quantity: 1,
      unitPrice: shippingCost,
      total: shippingCost,
    });
  }

  // Get company info from database
  const companyInfo = await getCompanyInfo();

  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    orderNumber: order.orderNumber,
    company: companyInfo,
    customer,
    lineItems,
    totals: {
      subtotal: productPrice,
      shipping: shippingCost,
      total: Number(invoice.total),
    },
  };

  return createInvoicePdf(invoiceData);
}

import PDFDocument from 'pdfkit';
import type { CompanyInfo } from '../config/company.js';

export interface CustomerInfo {
  name: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  shipping: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  orderNumber: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  lineItems: LineItem[];
  totals: InvoiceTotals;
}

export async function createInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Factura ${data.invoiceNumber}`,
          Author: data.company.name,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Draw the invoice
      drawHeader(doc, data);
      drawCompanyAndCustomer(doc, data);
      drawLineItems(doc, data);
      drawTotals(doc, data);
      drawFooter(doc, data);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawHeader(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const pageWidth = doc.page.width - 100; // margins

  // Title
  doc.fontSize(24).font('Helvetica-Bold').text('FACTURA', 50, 50, {
    align: 'center',
    width: pageWidth,
  });

  // Invoice number and date
  doc.fontSize(12).font('Helvetica');
  doc.text(`Nr. ${data.invoiceNumber}`, 50, 85, {
    align: 'center',
    width: pageWidth,
  });

  const formattedDate = data.issueDate.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.text(`Data: ${formattedDate}`, 50, 100, {
    align: 'center',
    width: pageWidth,
  });

  // Order reference
  doc.fontSize(10).fillColor('#666666');
  doc.text(`Comanda: ${data.orderNumber}`, 50, 118, {
    align: 'center',
    width: pageWidth,
  });
  doc.fillColor('#000000');

  // Separator line
  doc.moveTo(50, 140).lineTo(545, 140).stroke();
}

function drawCompanyAndCustomer(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = 155;
  const leftCol = 50;
  const rightCol = 300;
  const colWidth = 220;

  // Furnizor (Seller)
  doc.fontSize(11).font('Helvetica-Bold').text('FURNIZOR:', leftCol, startY);
  doc.font('Helvetica').fontSize(10);

  let y = startY + 18;
  doc.text(data.company.name, leftCol, y);
  y += 14;
  doc.text(`CUI: ${data.company.cui}`, leftCol, y);
  y += 14;
  doc.text(`Reg. Com.: ${data.company.regCom}`, leftCol, y);
  y += 14;
  doc.text(data.company.address, leftCol, y);
  y += 14;
  doc.text(`${data.company.city}, ${data.company.county}`, leftCol, y);
  y += 14;
  doc.text(data.company.postalCode, leftCol, y);
  y += 18;
  doc.text(`IBAN: ${data.company.iban}`, leftCol, y);
  y += 14;
  doc.text(data.company.bankName, leftCol, y);

  // Cumparator (Buyer)
  doc.fontSize(11).font('Helvetica-Bold').text('CUMPARATOR:', rightCol, startY);
  doc.font('Helvetica').fontSize(10);

  y = startY + 18;
  doc.text(data.customer.name, rightCol, y, { width: colWidth });
  y += 14;
  if (data.customer.address) {
    doc.text(data.customer.address, rightCol, y, { width: colWidth });
    y += 14;
  }
  doc.text(`${data.customer.city}, ${data.customer.county}`, rightCol, y, { width: colWidth });
  y += 14;
  if (data.customer.postalCode) {
    doc.text(data.customer.postalCode, rightCol, y, { width: colWidth });
    y += 14;
  }
  doc.text(data.customer.country, rightCol, y, { width: colWidth });

  // Separator line
  doc.moveTo(50, 320).lineTo(545, 320).stroke();
}

function drawLineItems(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = 335;
  const tableLeft = 50;
  const colWidths = {
    nr: 30,
    description: 280,
    qty: 50,
    price: 80,
    total: 80,
  };

  // Table header
  doc.fontSize(10).font('Helvetica-Bold');
  let x = tableLeft;

  doc.text('Nr.', x, startY, { width: colWidths.nr, align: 'center' });
  x += colWidths.nr;
  doc.text('Denumire produs/serviciu', x, startY, { width: colWidths.description });
  x += colWidths.description;
  doc.text('Cant.', x, startY, { width: colWidths.qty, align: 'center' });
  x += colWidths.qty;
  doc.text('Pret unitar', x, startY, { width: colWidths.price, align: 'right' });
  x += colWidths.price;
  doc.text('Total', x, startY, { width: colWidths.total, align: 'right' });

  // Header underline
  doc.moveTo(tableLeft, startY + 15).lineTo(545, startY + 15).stroke();

  // Table rows
  doc.font('Helvetica');
  let y = startY + 25;

  data.lineItems.forEach((item, index) => {
    x = tableLeft;
    doc.text(String(index + 1), x, y, { width: colWidths.nr, align: 'center' });
    x += colWidths.nr;
    doc.text(item.description, x, y, { width: colWidths.description });
    x += colWidths.description;
    doc.text(String(item.quantity), x, y, { width: colWidths.qty, align: 'center' });
    x += colWidths.qty;
    doc.text(formatPrice(item.unitPrice), x, y, { width: colWidths.price, align: 'right' });
    x += colWidths.price;
    doc.text(formatPrice(item.total), x, y, { width: colWidths.total, align: 'right' });
    y += 20;
  });

  // Table bottom line
  doc.moveTo(tableLeft, y + 5).lineTo(545, y + 5).stroke();
}

function drawTotals(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = 450;
  const rightAlign = 465;
  const valueAlign = 545;

  doc.fontSize(10).font('Helvetica');

  // Subtotal
  doc.text('Subtotal:', rightAlign, startY, { width: 80, align: 'right' });
  doc.text(formatPrice(data.totals.subtotal), valueAlign - 80, startY, {
    width: 80,
    align: 'right',
  });

  // Shipping
  if (data.totals.shipping > 0) {
    doc.text('Transport:', rightAlign, startY + 18, { width: 80, align: 'right' });
    doc.text(formatPrice(data.totals.shipping), valueAlign - 80, startY + 18, {
      width: 80,
      align: 'right',
    });
  }

  // Total line
  doc.moveTo(380, startY + 40).lineTo(545, startY + 40).stroke();

  // Total
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('TOTAL:', rightAlign, startY + 50, { width: 80, align: 'right' });
  doc.text(formatPrice(data.totals.total), valueAlign - 80, startY + 50, {
    width: 80,
    align: 'right',
  });
}

function drawFooter(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const footerY = 700;

  doc.fontSize(9).font('Helvetica').fillColor('#666666');

  // Company additional info
  doc.text(`Capital social: ${data.company.capitalSocial}`, 50, footerY);

  // Legal text
  doc.text(
    'Factura este valabila fara semnatura si stampila conform art. 319 alin. (29) din Codul fiscal.',
    50,
    footerY + 20,
    { width: 495 }
  );

  // Contact
  doc.text(`Email: ${data.company.email} | Tel: ${data.company.phone}`, 50, footerY + 45);
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} RON`;
}

import { Resend } from 'resend';
import type { Order, ModelVariant, Invoice } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Print3D <comenzi@print3d.ro>';
const APP_URL = process.env.APP_URL || 'https://print3d.ro';

type OrderWithVariants = Order & { variants: ModelVariant[] };

/**
 * Sends order received confirmation email
 */
export async function sendOrderReceivedEmail(order: Order): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Comandă primită - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comandă primită</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Mulțumim pentru comandă!</h1>
        <p>Dragă ${order.customerName},</p>
        <p>Am primit comanda ta cu numărul <strong>${order.orderNumber}</strong>.</p>
        <p>Echipa noastră de designeri va analiza imaginea trimisă și va crea variante de model 3D personalizat pentru tine.</p>
        <p>Te vom notifica prin email când variantele sunt gata pentru aprobare.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          Poți urmări statusul comenzii tale accesând:<br>
          <a href="${APP_URL}/comanda/${order.id}" style="color: #2563eb;">${APP_URL}/comanda/${order.id}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends approval request email with variant previews
 */
export async function sendApprovalEmail(order: OrderWithVariants): Promise<void> {
  const variantsHtml = order.variants.map((v, i) => `
    <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <img src="${v.previewImageUrl}" alt="Varianta ${i + 1}" style="max-width: 100%; border-radius: 4px;">
      ${v.description ? `<p style="margin-top: 10px; color: #374151;">${v.description}</p>` : ''}
    </div>
  `).join('');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Variantele sunt gata! - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Variante disponibile</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Variantele tale sunt gata!</h1>
        <p>Dragă ${order.customerName},</p>
        <p>Am creat <strong>${order.variants.length} variante</strong> de model 3D personalizat pentru comanda ta.</p>
        <p>Prețul estimat: <strong>${order.price ? `${order.price} RON` : 'De stabilit'}</strong></p>

        <h2 style="color: #374151; margin-top: 30px;">Variante disponibile:</h2>
        ${variantsHtml}

        <div style="margin-top: 30px; text-align: center;">
          <a href="${APP_URL}/comanda/${order.id}/aprobare"
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Alege varianta preferată
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends payment confirmation email
 */
export async function sendPaymentConfirmationEmail(order: Order): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Plată confirmată - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plată confirmată</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Plata a fost confirmată!</h1>
        <p>Dragă ${order.customerName},</p>
        <p>Am primit plata pentru comanda <strong>${order.orderNumber}</strong>.</p>
        <p>Vom începe imediat printarea modelului tău 3D. Te vom notifica când comanda este expediată.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Detalii comandă:</h3>
          <p style="margin: 5px 0;"><strong>Număr comandă:</strong> ${order.orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Total plătit:</strong> ${order.price} RON</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends shipping notification email with tracking number
 */
export async function sendShippingEmail(order: Order): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Comanda ta a fost expediată! - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comandă expediată</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Comanda ta este pe drum!</h1>
        <p>Dragă ${order.customerName},</p>
        <p>Comanda ta <strong>${order.orderNumber}</strong> a fost expediată și este pe drum către tine.</p>

        ${order.trackingNumber ? `
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Tracking:</h3>
          <p style="margin: 5px 0; font-size: 18px;"><strong>${order.trackingNumber}</strong></p>
        </div>
        ` : ''}

        <p>Vei primi coletul în aproximativ 1-3 zile lucrătoare.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends review request email after delivery
 */
export async function sendReviewRequestEmail(order: Order): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Cum ți s-a părut? - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lasă un review</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Cum ți s-a părut cadoul?</h1>
        <p>Dragă ${order.customerName},</p>
        <p>Sperăm că ești încântat(ă) de cadoul personalizat!</p>
        <p>Ne-ar face mare plăcere să aflăm părerea ta. Feedback-ul tău ne ajută să devenim mai buni.</p>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${APP_URL}/comanda/${order.id}/review"
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Lasă un review
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">Mulțumim că ai ales Print3D!<br>Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends order status update notification email
 */
export async function sendOrderStatusUpdateEmail(
  order: Order,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    RECEIVED: 'Primită',
    MODELING: 'În modelare',
    PENDING_APPROVAL: 'Așteaptă aprobare',
    APPROVED: 'Aprobată',
    PAID: 'Plătită',
    PRINTING: 'În printare',
    SHIPPED: 'Expediată',
    DELIVERED: 'Livrată',
    CANCELLED: 'Anulată',
  };

  const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
  const newStatusLabel = statusLabels[newStatus] || newStatus;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Status comandă actualizat - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Status comandă actualizat</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Status comandă actualizat</h1>
        <p>Dragă ${order.customerName},</p>
        <p>Statusul comenzii tale <strong>${order.orderNumber}</strong> a fost actualizat.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #6b7280;">Status anterior: <span style="text-decoration: line-through;">${oldStatusLabel}</span></p>
          <p style="margin: 5px 0; font-size: 18px;"><strong>Status nou: ${newStatusLabel}</strong></p>
        </div>

        <p>Poți urmări statusul comenzii tale accesând:</p>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${APP_URL}/comanda/${order.id}"
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Vezi comanda
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Primești acest email deoarece te-ai abonat la actualizări pentru comanda ta.
          <a href="${APP_URL}/comanda/${order.id}" style="color: #2563eb;">Dezabonează-te</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends contact form notification to admin
 */
export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: 'contact@print3d.ro',
    replyTo: data.email,
    subject: `Mesaj nou de contact de la ${data.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mesaj contact</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Mesaj nou de contact</h1>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Nume:</strong> ${data.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
          ${data.phone ? `<p style="margin: 5px 0;"><strong>Telefon:</strong> ${data.phone}</p>` : ''}
        </div>

        <h3>Mesaj:</h3>
        <p style="white-space: pre-wrap;">${data.message}</p>
      </body>
      </html>
    `,
  });
}

/**
 * Sends shipping notification email with invoice PDF attached
 */
export async function sendShippingEmailWithInvoice(
  order: Order,
  invoice: Invoice
): Promise<void> {
  if (!invoice.pdfUrl) {
    throw new Error('Invoice PDF URL is required');
  }

  // Fetch PDF from R2
  const pdfResponse = await fetch(invoice.pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch invoice PDF: ${pdfResponse.status}`);
  }
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Comanda ta a fost expediata! - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comanda expediata</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Comanda ta este pe drum!</h1>
        <p>Draga ${order.customerName},</p>
        <p>Comanda ta <strong>${order.orderNumber}</strong> a fost expediata si este pe drum catre tine.</p>

        ${order.trackingNumber ? `
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Tracking:</h3>
          <p style="margin: 5px 0; font-size: 18px;"><strong>${order.trackingNumber}</strong></p>
        </div>
        ` : ''}

        <p>Vei primi coletul in aproximativ 1-3 zile lucratoare.</p>

        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Factura ${invoice.invoiceNumber}</strong> este atasata la acest email.</p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `Factura-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
      },
    ],
  });
}

/**
 * Sends invoice email separately (for manual resend)
 */
export async function sendInvoiceEmail(
  order: Order,
  invoice: Invoice
): Promise<void> {
  if (!invoice.pdfUrl) {
    throw new Error('Invoice PDF URL is required');
  }

  // Fetch PDF from R2
  const pdfResponse = await fetch(invoice.pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch invoice PDF: ${pdfResponse.status}`);
  }
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    subject: `Factura ${invoice.invoiceNumber} - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Factura pentru comanda ta</h1>
        <p>Draga ${order.customerName},</p>
        <p>Iti trimitem factura pentru comanda <strong>${order.orderNumber}</strong>.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Numar factura:</strong> ${invoice.invoiceNumber}</p>
          <p style="margin: 5px 0;"><strong>Total:</strong> ${invoice.total} RON</p>
        </div>

        <p>Factura este atasata la acest email in format PDF.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">Cu drag,<br>Echipa Print3D</p>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `Factura-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
      },
    ],
  });
}

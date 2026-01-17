import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { db } from '../../lib/db.js';
import { adminAuth } from '../../middleware/auth.js';
import { formatPrice } from '../../lib/utils.js';
import { uploadFile, deleteFile } from '../../lib/storage.js';
import { sendApprovalEmail, sendShippingEmail, sendReviewRequestEmail, sendShippingEmailWithInvoice, sendInvoiceEmail } from '../../lib/email.js';
import { createInvoice, regenerateInvoice, markInvoiceAsSent } from '../../lib/invoice.js';
import { isValidImageType, isValidFileSize } from '../../lib/utils.js';
import { triggerOrderStatusUpdate } from '../../workers/orderStatusWorker.js';
import {
  OrderListQuerySchema,
  OrderListResponseSchema,
  AdminOrderResponseSchema,
  UpdateOrderSchema,
  VariantIdParamSchema,
  ErrorSchema,
} from '../admin.schemas.js';
import { SuccessSchema, IdParamSchema, ModelVariantSchema } from '../../schemas/common.js';

const app = new OpenAPIHono();

// Apply auth to all routes
app.use('*', adminAuth);

// Helper to format order response
function formatAdminOrderResponse(order: any) {
  return {
    ...order,
    price: formatPrice(order.price),
    shippingCost: formatPrice(order.shippingCost),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    approvedAt: order.approvedAt?.toISOString() || null,
    paidAt: order.paidAt?.toISOString() || null,
    shippedAt: order.shippedAt?.toISOString() || null,
    deliveredAt: order.deliveredAt?.toISOString() || null,
    variants: order.variants?.map((v: any) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    })) || [],
    review: order.review ? {
      ...order.review,
      photoUrls: order.review.photoUrls || null,
      createdAt: order.review.createdAt.toISOString(),
    } : null,
  };
}

// GET /api/admin/orders - List orders with filters
const listOrdersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin Orders'],
  summary: 'Listă comenzi',
  description: 'Returnează lista de comenzi cu filtre și paginare.',
  security: [{ Bearer: [] }],
  request: {
    query: OrderListQuerySchema,
  },
  responses: {
    200: {
      description: 'Listă comenzi',
      content: {
        'application/json': {
          schema: OrderListResponseSchema,
        },
      },
    },
  },
});

app.openapi(listOrdersRoute, async (c) => {
  const { status, search, page, limit, sortBy, sortOrder } = c.req.valid('query');

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { orderNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { variants: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  return c.json({
    orders: orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerCity: o.customerCity,
      price: formatPrice(o.price),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      variantsCount: o.variants.length,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 200);
});

// GET /api/admin/orders/:id - Get order details
const getOrderRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Admin Orders'],
  summary: 'Detalii comandă',
  description: 'Returnează detaliile complete ale unei comenzi.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalii comandă',
      content: {
        'application/json': {
          schema: AdminOrderResponseSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(getOrderRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
    include: { variants: true, review: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  return c.json(formatAdminOrderResponse(order), 200);
});

// PATCH /api/admin/orders/:id - Update order
const updateOrderRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Admin Orders'],
  summary: 'Actualizează comandă',
  description: 'Actualizează statusul, prețul sau alte detalii ale comenzii.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateOrderSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Comandă actualizată',
      content: {
        'application/json': {
          schema: AdminOrderResponseSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(updateOrderRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const existingOrder = await db.order.findUnique({ where: { id } });

  if (!existingOrder) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  // Build update data with automatic timestamp updates
  const updateData: any = { ...data };

  if (data.status === 'SHIPPED' && existingOrder.status !== 'SHIPPED') {
    updateData.shippedAt = new Date();

    // Auto-generate invoice when order is shipped
    try {
      const invoice = await createInvoice(id);
      console.log(`[Invoice] Auto-generated ${invoice.invoiceNumber} for order ${existingOrder.orderNumber}`);
    } catch (error) {
      console.error(`[Invoice] Failed to auto-generate for order ${existingOrder.orderNumber}:`, error);
      // Don't fail the order update if invoice generation fails
    }
  }

  if (data.status === 'DELIVERED' && existingOrder.status !== 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  const order = await db.order.update({
    where: { id },
    data: updateData,
    include: { variants: true, review: true },
  });

  // Trigger order status update notification worker if status changed
  if (data.status && data.status !== existingOrder.status) {
    triggerOrderStatusUpdate({
      order,
      oldStatus: existingOrder.status,
      newStatus: data.status,
    });
  }

  return c.json(formatAdminOrderResponse(order), 200);
});

// POST /api/admin/orders/:id/variants - Upload variants
const uploadVariantsRoute = createRoute({
  method: 'post',
  path: '/{id}/variants',
  tags: ['Admin Orders'],
  summary: 'Upload variante model',
  description: 'Încarcă variante de model 3D pentru o comandă.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            images: z.any().openapi({
              type: 'array',
              items: { type: 'string', format: 'binary' },
              description: 'Fișiere imagine (max 5)',
            }),
            descriptions: z.any().optional().openapi({
              type: 'array',
              items: { type: 'string' },
              description: 'Descrieri pentru fiecare variantă',
            }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Variante create',
      content: {
        'application/json': {
          schema: z.object({
            variants: z.array(ModelVariantSchema),
          }),
        },
      },
    },
    400: {
      description: 'Date invalide',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(uploadVariantsRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({ where: { id } });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  const formData = await c.req.formData();
  const images = formData.getAll('images');
  const descriptionsRaw = formData.getAll('descriptions');
  const descriptions = descriptionsRaw.map(d => String(d));

  if (!images.length) {
    return c.json({
      error: 'no_images',
      message: 'Nu au fost trimise imagini',
    }, 400);
  }

  if (images.length > 5) {
    return c.json({
      error: 'too_many_images',
      message: 'Maximum 5 imagini per încărcare',
    }, 400);
  }

  const variants = [];

  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    if (!(file instanceof File)) continue;

    if (!isValidImageType(file.type)) {
      return c.json({
        error: 'invalid_type',
        message: `Fișierul ${file.name} nu are un format valid`,
      }, 400);
    }

    if (!isValidFileSize(file.size)) {
      return c.json({
        error: 'file_too_large',
        message: `Fișierul ${file.name} este prea mare`,
      }, 400);
    }

    const url = await uploadFile(file, 'variants');

    const variant = await db.modelVariant.create({
      data: {
        orderId: id,
        previewImageUrl: url,
        description: descriptions[i] || null,
      },
    });

    variants.push({
      ...variant,
      createdAt: variant.createdAt.toISOString(),
    });
  }

  // Update order status to PENDING_APPROVAL if it was MODELING
  if (order.status === 'MODELING' || order.status === 'RECEIVED') {
    await db.order.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  return c.json({ variants }, 201);
});

// DELETE /api/admin/orders/:id/variants/:variantId - Delete variant
const deleteVariantRoute = createRoute({
  method: 'delete',
  path: '/{id}/variants/{variantId}',
  tags: ['Admin Orders'],
  summary: 'Șterge variantă',
  description: 'Șterge o variantă de model.',
  security: [{ Bearer: [] }],
  request: {
    params: VariantIdParamSchema,
  },
  responses: {
    200: {
      description: 'Variantă ștearsă',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    404: {
      description: 'Varianta nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteVariantRoute, async (c) => {
  const { id, variantId } = c.req.valid('param');

  const variant = await db.modelVariant.findFirst({
    where: { id: variantId, orderId: id },
  });

  if (!variant) {
    return c.json({ error: 'not_found', message: 'Varianta nu există' }, 404);
  }

  // Delete from storage
  try {
    await deleteFile(variant.previewImageUrl);
  } catch (e) {
    console.error('Failed to delete file from storage:', e);
  }

  // Delete from database
  await db.modelVariant.delete({ where: { id: variantId } });

  return c.json({ success: true, message: 'Variantă ștearsă' }, 200);
});

// POST /api/admin/orders/:id/send-approval-email - Send approval email
const sendApprovalEmailRoute = createRoute({
  method: 'post',
  path: '/{id}/send-approval-email',
  tags: ['Admin Orders'],
  summary: 'Trimite email aprobare',
  description: 'Trimite clientului email cu variantele disponibile pentru aprobare.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Email trimis',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: 'Nu se poate trimite email',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Eroare la trimiterea emailului',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(sendApprovalEmailRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.variants.length === 0) {
    return c.json({
      error: 'no_variants',
      message: 'Nu există variante pentru această comandă',
    }, 400);
  }

  try {
    await sendApprovalEmail(order);
    return c.json({ success: true, message: 'Email trimis' }, 200);
  } catch (e) {
    console.error('Failed to send approval email:', e);
    return c.json({
      error: 'email_failed',
      message: 'Nu s-a putut trimite emailul',
    }, 500);
  }
});

// POST /api/admin/orders/:id/send-shipping-email - Send shipping email
const sendShippingEmailRoute = createRoute({
  method: 'post',
  path: '/{id}/send-shipping-email',
  tags: ['Admin Orders'],
  summary: 'Trimite email expediere',
  description: 'Trimite clientului email cu numărul de tracking.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Email trimis',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: 'Nu se poate trimite email',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Eroare la trimiterea emailului',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(sendShippingEmailRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.status !== 'SHIPPED') {
    return c.json({
      error: 'invalid_status',
      message: 'Comanda nu este în status expediat',
    }, 400);
  }

  try {
    // If invoice exists and has PDF, send shipping email with invoice
    if (order.invoice && order.invoice.pdfUrl) {
      await sendShippingEmailWithInvoice(order, order.invoice);
      // Mark invoice as sent
      await markInvoiceAsSent(order.invoice.id);
    } else {
      // Fallback to regular shipping email
      await sendShippingEmail(order);
    }

    return c.json({ success: true, message: 'Email trimis' }, 200);
  } catch (e) {
    console.error('Failed to send shipping email:', e);
    return c.json({
      error: 'email_failed',
      message: 'Nu s-a putut trimite emailul',
    }, 500);
  }
});

// POST /api/admin/orders/:id/send-review-email - Send review request email
const sendReviewEmailRoute = createRoute({
  method: 'post',
  path: '/{id}/send-review-email',
  tags: ['Admin Orders'],
  summary: 'Trimite email review',
  description: 'Trimite clientului email cu cerere de review.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Email trimis',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: 'Nu se poate trimite email',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Eroare la trimiterea emailului',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(sendReviewEmailRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({ where: { id } });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.status !== 'DELIVERED') {
    return c.json({
      error: 'invalid_status',
      message: 'Comanda nu este în status livrat',
    }, 400);
  }

  try {
    await sendReviewRequestEmail(order);
    return c.json({ success: true, message: 'Email trimis' }, 200);
  } catch (e) {
    console.error('Failed to send review email:', e);
    return c.json({
      error: 'email_failed',
      message: 'Nu s-a putut trimite emailul',
    }, 500);
  }
});

// POST /api/admin/orders/:id/invoice/generate - Generate invoice
const generateInvoiceRoute = createRoute({
  method: 'post',
  path: '/{id}/invoice/generate',
  tags: ['Admin Orders'],
  summary: 'Generează factură',
  description: 'Generează factura PDF pentru o comandă.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Factură generată',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            invoiceNumber: z.string(),
            pdfUrl: z.string(),
          }),
        },
      },
    },
    400: {
      description: 'Nu se poate genera factura',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Comanda nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Eroare la generare',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(generateInvoiceRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.invoice) {
    return c.json({
      error: 'invoice_exists',
      message: 'Factura există deja pentru această comandă',
    }, 400);
  }

  if (!order.price) {
    return c.json({
      error: 'no_price',
      message: 'Comanda nu are preț setat',
    }, 400);
  }

  try {
    const invoice = await createInvoice(id);
    return c.json({
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      pdfUrl: invoice.pdfUrl || '',
    }, 200);
  } catch (e) {
    console.error('Failed to generate invoice:', e);
    return c.json({
      error: 'generation_failed',
      message: 'Nu s-a putut genera factura',
    }, 500);
  }
});

// POST /api/admin/orders/:id/invoice/regenerate - Regenerate invoice
const regenerateInvoiceRoute = createRoute({
  method: 'post',
  path: '/{id}/invoice/regenerate',
  tags: ['Admin Orders'],
  summary: 'Regenerează factură',
  description: 'Regenerează PDF-ul facturii (păstrează același număr).',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Factură regenerată',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            invoiceNumber: z.string(),
            pdfUrl: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Factura nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Eroare la regenerare',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(regenerateInvoiceRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (!order.invoice) {
    return c.json({
      error: 'no_invoice',
      message: 'Nu există factură pentru această comandă',
    }, 404);
  }

  try {
    const invoice = await regenerateInvoice(order.invoice.id);
    return c.json({
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      pdfUrl: invoice.pdfUrl || '',
    }, 200);
  } catch (e) {
    console.error('Failed to regenerate invoice:', e);
    return c.json({
      error: 'regeneration_failed',
      message: 'Nu s-a putut regenera factura',
    }, 500);
  }
});

// POST /api/admin/orders/:id/invoice/send - Send invoice email
const sendInvoiceEmailRoute = createRoute({
  method: 'post',
  path: '/{id}/invoice/send',
  tags: ['Admin Orders'],
  summary: 'Trimite factură email',
  description: 'Trimite factura PDF prin email către client.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Email trimis',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    404: {
      description: 'Factura nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Eroare la trimiterea emailului',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(sendInvoiceEmailRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (!order.invoice || !order.invoice.pdfUrl) {
    return c.json({
      error: 'no_invoice',
      message: 'Nu există factură pentru această comandă',
    }, 404);
  }

  try {
    await sendInvoiceEmail(order, order.invoice);
    await markInvoiceAsSent(order.invoice.id);
    return c.json({ success: true, message: 'Email trimis' }, 200);
  } catch (e) {
    console.error('Failed to send invoice email:', e);
    return c.json({
      error: 'email_failed',
      message: 'Nu s-a putut trimite emailul',
    }, 500);
  }
});

export default app;

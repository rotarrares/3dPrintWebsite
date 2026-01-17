import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../lib/db.js';
import { generateOrderNumber, calculateShippingCost, formatPrice } from '../lib/utils.js';
import { sendOrderReceivedEmail } from '../lib/email.js';
import { createCheckoutSession, getPaymentStatus } from '../lib/stripe.js';
import {
  CreateOrderSchema,
  OrderResponseSchema,
  SelectVariantSchema,
  CheckoutSchema,
  CheckoutResponseSchema,
  PaymentStatusSchema,
  CreateReviewSchema,
  ReviewResponseSchema,
  OrderIdParamSchema,
  SubscriptionSchema,
  SubscriptionResponseSchema,
  DeliveryEstimationSchema,
  ErrorSchema,
} from './orders.schemas.js';

const app = new OpenAPIHono();

// Helper to format order response
function formatOrderResponse(order: any) {
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

// POST /api/orders - Create new order
const createOrderRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Orders'],
  summary: 'Creează o comandă nouă',
  description: 'Clientul trimite o imagine și datele de contact pentru a primi o ofertă de model 3D personalizat.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrderSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Comandă creată cu succes',
      content: {
        'application/json': {
          schema: OrderResponseSchema,
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
  },
});

app.openapi(createOrderRoute, async (c) => {
  const data = c.req.valid('json');

  const order = await db.order.create({
    data: {
      ...data,
      orderNumber: generateOrderNumber(),
    },
    include: { variants: true },
  });

  // Send confirmation email (don't await to not block response)
  sendOrderReceivedEmail(order).catch(console.error);

  return c.json(formatOrderResponse(order), 201);
});

// GET /api/orders/:id - Get order details
const getOrderRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Orders'],
  summary: 'Detalii comandă',
  description: 'Returnează detaliile unei comenzi după ID.',
  request: {
    params: OrderIdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalii comandă',
      content: {
        'application/json': {
          schema: OrderResponseSchema,
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

  return c.json(formatOrderResponse(order), 200);
});

// POST /api/orders/:id/select-variant - Select preferred variant
const selectVariantRoute = createRoute({
  method: 'post',
  path: '/{id}/select-variant',
  tags: ['Orders'],
  summary: 'Selectează varianta preferată',
  description: 'Clientul alege varianta de model 3D preferată.',
  request: {
    params: OrderIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: SelectVariantSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Variantă selectată',
      content: {
        'application/json': {
          schema: OrderResponseSchema,
        },
      },
    },
    400: {
      description: 'Nu se poate selecta varianta',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Comanda sau varianta nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(selectVariantRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { variantId } = c.req.valid('json');

  const order = await db.order.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.status !== 'PENDING_APPROVAL') {
    return c.json({
      error: 'invalid_status',
      message: 'Comanda nu este în așteptare pentru aprobare',
    }, 400);
  }

  const variant = order.variants.find(v => v.id === variantId);
  if (!variant) {
    return c.json({ error: 'not_found', message: 'Varianta nu există' }, 404);
  }

  const updatedOrder = await db.order.update({
    where: { id },
    data: {
      selectedVariantId: variantId,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
    include: { variants: true, review: true },
  });

  return c.json(formatOrderResponse(updatedOrder), 200);
});

// POST /api/orders/:id/checkout - Create Stripe checkout session
const checkoutRoute = createRoute({
  method: 'post',
  path: '/{id}/checkout',
  tags: ['Orders'],
  summary: 'Creează sesiune de plată',
  description: 'Generează un link Stripe Checkout pentru plata comenzii.',
  request: {
    params: OrderIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CheckoutSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'URL checkout generat',
      content: {
        'application/json': {
          schema: CheckoutResponseSchema,
        },
      },
    },
    400: {
      description: 'Nu se poate genera checkout',
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

app.openapi(checkoutRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { shippingAddress, shippingMethod } = c.req.valid('json');

  const order = await db.order.findUnique({
    where: { id },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.status !== 'APPROVED') {
    return c.json({
      error: 'invalid_status',
      message: 'Comanda nu este aprobată pentru plată',
    }, 400);
  }

  if (!order.price) {
    return c.json({
      error: 'no_price',
      message: 'Prețul comenzii nu a fost stabilit',
    }, 400);
  }

  const shippingCost = calculateShippingCost(shippingMethod, shippingAddress.city);

  // Update order with shipping info
  const updatedOrder = await db.order.update({
    where: { id },
    data: {
      shippingAddress,
      shippingMethod,
      shippingCost,
    },
  });

  const session = await createCheckoutSession(updatedOrder, shippingCost);

  return c.json({ checkoutUrl: session.url! }, 200);
});

// GET /api/orders/:id/payment-status - Check payment status
const paymentStatusRoute = createRoute({
  method: 'get',
  path: '/{id}/payment-status',
  tags: ['Orders'],
  summary: 'Verifică status plată',
  description: 'Returnează statusul plății pentru o comandă.',
  request: {
    params: OrderIdParamSchema,
  },
  responses: {
    200: {
      description: 'Status plată',
      content: {
        'application/json': {
          schema: PaymentStatusSchema,
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

app.openapi(paymentStatusRoute, async (c) => {
  const { id } = c.req.valid('param');

  const order = await db.order.findUnique({
    where: { id },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  const paymentStatus = await getPaymentStatus(order);

  return c.json({
    status: paymentStatus.status,
    paidAt: paymentStatus.paidAt?.toISOString() || null,
  }, 200);
});

// POST /api/orders/:id/review - Submit review
const createReviewRoute = createRoute({
  method: 'post',
  path: '/{id}/review',
  tags: ['Orders'],
  summary: 'Trimite review',
  description: 'Clientul trimite un review pentru comanda livrată.',
  request: {
    params: OrderIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateReviewSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Review creat',
      content: {
        'application/json': {
          schema: ReviewResponseSchema,
        },
      },
    },
    400: {
      description: 'Nu se poate trimite review',
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

app.openapi(createReviewRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const order = await db.order.findUnique({
    where: { id },
    include: { review: true },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  if (order.status !== 'DELIVERED') {
    return c.json({
      error: 'invalid_status',
      message: 'Review-ul poate fi trimis doar pentru comenzi livrate',
    }, 400);
  }

  if (order.review) {
    return c.json({
      error: 'already_reviewed',
      message: 'Ai trimis deja un review pentru această comandă',
    }, 400);
  }

  const review = await db.review.create({
    data: {
      orderId: id,
      rating: data.rating,
      comment: data.comment || null,
      photoUrls: data.photoUrls ?? undefined,
    },
  });

  return c.json({
    id: review.id,
    orderId: review.orderId,
    rating: review.rating,
    comment: review.comment,
    photoUrls: review.photoUrls as string[] | null,
    isPublic: review.isPublic,
    createdAt: review.createdAt.toISOString(),
  }, 201);
});

// POST /api/orders/:id/subscription - Subscribe/unsubscribe to order updates
const subscriptionRoute = createRoute({
  method: 'post',
  path: '/{id}/subscription',
  tags: ['Orders'],
  summary: 'Abonare/dezabonare actualizări comandă',
  description: 'Clientul poate să se aboneze sau dezaboneze de la notificări despre statusul comenzii.',
  request: {
    params: OrderIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: SubscriptionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Preferință actualizată',
      content: {
        'application/json': {
          schema: SubscriptionResponseSchema,
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

app.openapi(subscriptionRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { subscribe } = c.req.valid('json');

  const order = await db.order.findUnique({
    where: { id },
  });

  if (!order) {
    return c.json({ error: 'not_found', message: 'Comanda nu există' }, 404);
  }

  await db.order.update({
    where: { id },
    data: { subscribeToUpdates: subscribe },
  });

  const message = subscribe
    ? 'Te-ai abonat la actualizări pentru această comandă'
    : 'Te-ai dezabonat de la actualizări pentru această comandă';

  return c.json({ subscribeToUpdates: subscribe, message }, 200);
});

// GET /api/orders/delivery-estimation - Get delivery time estimation
const HOURS_PER_ORDER = 5;
const WORKING_HOURS_PER_DAY = 8;

const deliveryEstimationRoute = createRoute({
  method: 'get',
  path: '/delivery-estimation',
  tags: ['Orders'],
  summary: 'Estimare timp livrare',
  description: 'Returnează o estimare a timpului de livrare bazată pe numărul de comenzi active în procesare. Fiecare comandă necesită aproximativ 5 ore de procesare.',
  responses: {
    200: {
      description: 'Estimare timp livrare',
      content: {
        'application/json': {
          schema: DeliveryEstimationSchema,
        },
      },
    },
  },
});

app.openapi(deliveryEstimationRoute, async (c) => {
  // Count all orders that are not CANCELLED or DELIVERED
  const activeOrders = await db.order.count({
    where: {
      status: {
        notIn: ['CANCELLED', 'DELIVERED'],
      },
    },
  });

  const estimatedHours = activeOrders * HOURS_PER_ORDER;
  const estimatedDays = Math.round((estimatedHours / WORKING_HOURS_PER_DAY) * 10) / 10;

  return c.json({
    activeOrders,
    estimatedHours,
    estimatedDays,
  }, 200);
});

export default app;

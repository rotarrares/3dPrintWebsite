import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { constructWebhookEvent, handleWebhookEvent } from '../lib/stripe.js';
import { sendPaymentConfirmationEmail } from '../lib/email.js';
import { db } from '../lib/db.js';
import { ErrorSchema, SuccessSchema } from '../schemas/common.js';

const app = new OpenAPIHono();

// POST /api/webhooks/stripe - Stripe webhook
const stripeWebhookRoute = createRoute({
  method: 'post',
  path: '/stripe',
  tags: ['Webhooks'],
  summary: 'Webhook Stripe',
  description: 'Endpoint pentru evenimentele Stripe (plăți).',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook procesat',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    400: {
      description: 'Semnătură invalidă',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(stripeWebhookRoute, async (c) => {
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json({
      error: 'missing_signature',
      message: 'Semnătura Stripe lipsește',
    }, 400);
  }

  try {
    // Get raw body for signature verification
    const payload = await c.req.text();
    const event = constructWebhookEvent(payload, signature);

    // Handle the event
    await handleWebhookEvent(event);

    // Send payment confirmation email if checkout completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await db.order.findUnique({ where: { id: orderId } });
        if (order) {
          sendPaymentConfirmationEmail(order).catch(console.error);
        }
      }
    }

    return c.json({ success: true }, 200);
  } catch (err) {
    console.error('Webhook error:', err);
    return c.json({
      error: 'webhook_error',
      message: 'Eroare la procesarea webhook-ului',
    }, 400);
  }
});

export default app;

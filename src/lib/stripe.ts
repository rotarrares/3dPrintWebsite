import Stripe from 'stripe';
import type { Order } from '@prisma/client';
import { db } from './db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const APP_URL = process.env.APP_URL || 'https://print3d.ro';

/**
 * Creates a Stripe checkout session for an order
 */
export async function createCheckoutSession(
  order: Order,
  shippingCost: number
): Promise<Stripe.Checkout.Session> {
  const totalAmount = Number(order.price || 0) + shippingCost;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'ron',
          product_data: {
            name: `Comandă ${order.orderNumber}`,
            description: 'Cadou personalizat 3D - Print3D.ro',
          },
          unit_amount: Math.round(totalAmount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
    customer_email: order.customerEmail,
    success_url: `${APP_URL}/comanda/${order.id}/confirmare?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/comanda/${order.id}/aprobare`,
  });

  // Update order with session ID
  await db.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return session;
}

/**
 * Retrieves a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Verifies and constructs a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
}

/**
 * Handles Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await db.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            stripePaymentId: session.payment_intent as string,
          },
        });
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Reset session ID so user can try again
        await db.order.update({
          where: { id: orderId },
          data: { stripeSessionId: null },
        });
      }
      break;
    }

    default:
      // Unhandled event type
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Gets payment status for an order
 */
export async function getPaymentStatus(order: Order): Promise<{
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paidAt?: Date;
}> {
  if (order.paidAt) {
    return { status: 'paid', paidAt: order.paidAt };
  }

  if (!order.stripeSessionId) {
    return { status: 'pending' };
  }

  try {
    const session = await getCheckoutSession(order.stripeSessionId);

    if (session.payment_status === 'paid') {
      return { status: 'paid' };
    }

    if (session.status === 'expired') {
      return { status: 'expired' };
    }

    return { status: 'pending' };
  } catch {
    return { status: 'failed' };
  }
}

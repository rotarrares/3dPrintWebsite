import type { Order, OrderStatus } from '@prisma/client';
import { sendOrderStatusUpdateEmail } from '../lib/email.js';

export interface OrderStatusUpdatePayload {
  order: Order;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
}

/**
 * Worker that processes order status updates and sends notifications
 * to subscribed customers.
 *
 * This worker checks if the customer has subscribed to updates
 * and sends an email notification when the order status changes.
 */
export async function processOrderStatusUpdate(
  payload: OrderStatusUpdatePayload
): Promise<{ sent: boolean; reason?: string }> {
  const { order, oldStatus, newStatus } = payload;

  // Skip if status hasn't actually changed
  if (oldStatus === newStatus) {
    return { sent: false, reason: 'status_unchanged' };
  }

  // Skip if customer is not subscribed to updates
  if (!order.subscribeToUpdates) {
    return { sent: false, reason: 'not_subscribed' };
  }

  try {
    await sendOrderStatusUpdateEmail(order, oldStatus, newStatus);
    console.log(`[OrderStatusWorker] Sent status update email for order ${order.orderNumber}: ${oldStatus} -> ${newStatus}`);
    return { sent: true };
  } catch (error) {
    console.error(`[OrderStatusWorker] Failed to send status update email for order ${order.orderNumber}:`, error);
    throw error;
  }
}

/**
 * Fire-and-forget version of the worker that doesn't block the response.
 * Errors are logged but not propagated.
 */
export function triggerOrderStatusUpdate(payload: OrderStatusUpdatePayload): void {
  processOrderStatusUpdate(payload).catch((error) => {
    console.error('[OrderStatusWorker] Background processing failed:', error);
  });
}

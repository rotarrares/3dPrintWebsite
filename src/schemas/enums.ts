import { z } from '@hono/zod-openapi';

export const OrderStatusSchema = z.enum([
  'RECEIVED',
  'MODELING',
  'PENDING_APPROVAL',
  'APPROVED',
  'PAID',
  'PRINTING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]).openapi({
  description: 'Status comandă',
  example: 'RECEIVED',
});

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const ShippingMethodSchema = z.enum([
  'pickup',
  'courier-cluj',
  'courier-national',
]).openapi({
  description: 'Metodă de livrare',
  example: 'courier-national',
});

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

import { z } from '@hono/zod-openapi';
import { OrderStatusSchema, ShippingMethodSchema } from '../schemas/enums.js';
import { ModelVariantSchema, ReviewSchema, ShippingAddressSchema, ErrorSchema } from '../schemas/common.js';

// Create order request
export const CreateOrderSchema = z.object({
  customerName: z.string().min(2).openapi({ example: 'Ion Popescu' }),
  customerEmail: z.string().email().openapi({ example: 'ion@example.com' }),
  customerPhone: z.string().min(10).openapi({ example: '0740123456' }),
  customerCity: z.string().min(2).openapi({ example: 'Cluj-Napoca' }),
  description: z.string().optional().openapi({ example: 'Vreau o figurină cu câinele meu' }),
  sourceImageUrl: z.string().url().openapi({ example: 'https://cdn.print3d.ro/uploads/abc123.jpg' }),
  preferredSize: z.string().optional().openapi({ example: '15cm' }),
  preferredColor: z.string().optional().openapi({ example: 'Alb' }),
  notes: z.string().optional().openapi({ example: 'Să fie cu spatele drept' }),
}).openapi('CreateOrderRequest');

// Order response
export const OrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  customerCity: z.string(),
  description: z.string().nullable(),
  sourceImageUrl: z.string(),
  preferredSize: z.string().nullable(),
  preferredColor: z.string().nullable(),
  notes: z.string().nullable(),
  selectedVariantId: z.string().nullable(),
  price: z.string().nullable(),
  shippingMethod: z.string().nullable(),
  shippingCost: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  subscribeToUpdates: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  shippedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  variants: z.array(ModelVariantSchema),
  review: ReviewSchema.nullable().optional(),
}).openapi('OrderResponse');

// Select variant request
export const SelectVariantSchema = z.object({
  variantId: z.string().min(1).openapi({ example: 'clx9876543210' }),
}).openapi('SelectVariantRequest');

// Checkout request
export const CheckoutSchema = z.object({
  shippingAddress: ShippingAddressSchema,
  shippingMethod: ShippingMethodSchema,
}).openapi('CheckoutRequest');

// Checkout response
export const CheckoutResponseSchema = z.object({
  checkoutUrl: z.string().url().openapi({ example: 'https://checkout.stripe.com/pay/cs_test_...' }),
}).openapi('CheckoutResponse');

// Payment status response
export const PaymentStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'failed', 'expired']),
  paidAt: z.string().datetime().nullable().optional(),
}).openapi('PaymentStatusResponse');

// Create review request
export const CreateReviewSchema = z.object({
  rating: z.number().min(1).max(5).openapi({ example: 5 }),
  comment: z.string().optional().openapi({ example: 'Foarte mulțumit de cadou!' }),
  photoUrls: z.array(z.string().url()).optional().openapi({ example: ['https://cdn.print3d.ro/reviews/photo1.jpg'] }),
}).openapi('CreateReviewRequest');

// Review response
export const ReviewResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  photoUrls: z.array(z.string()).nullable(),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
}).openapi('ReviewResponse');

// Order ID parameter
export const OrderIdParamSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'clx1234567890',
    description: 'ID-ul comenzii',
  }),
});

// Subscription request
export const SubscriptionSchema = z.object({
  subscribe: z.boolean().openapi({ example: true, description: 'true pentru abonare, false pentru dezabonare' }),
}).openapi('SubscriptionRequest');

// Subscription response
export const SubscriptionResponseSchema = z.object({
  subscribeToUpdates: z.boolean(),
  message: z.string(),
}).openapi('SubscriptionResponse');

export { ErrorSchema };

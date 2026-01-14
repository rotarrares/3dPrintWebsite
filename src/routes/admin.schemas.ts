import { z } from '@hono/zod-openapi';
import { OrderStatusSchema } from '../schemas/enums.js';
import { PaginationSchema, ModelVariantSchema, ErrorSchema } from '../schemas/common.js';

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email().openapi({ example: 'admin@print3d.ro' }),
  password: z.string().min(6).openapi({ example: 'password123' }),
}).openapi('LoginRequest');

export const LoginResponseSchema = z.object({
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
}).openapi('LoginResponse');

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
}).openapi('AdminUser');

// Order list schemas
export const OrderListQuerySchema = z.object({
  status: OrderStatusSchema.optional(),
  search: z.string().optional().openapi({
    example: 'ion@example.com',
    description: 'Caută în nume, email, număr comandă',
  }),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => Math.min(val ? parseInt(val, 10) : 20, 100)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'orderNumber']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).openapi('OrderListQuery');

export const OrderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  customerName: z.string(),
  customerEmail: z.string(),
  customerCity: z.string(),
  price: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  variantsCount: z.number(),
}).openapi('OrderListItem');

export const OrderListResponseSchema = z.object({
  orders: z.array(OrderListItemSchema),
  pagination: PaginationSchema,
}).openapi('OrderListResponse');

// Update order schema
export const UpdateOrderSchema = z.object({
  status: OrderStatusSchema.optional(),
  price: z.number().positive().optional().openapi({ example: 150 }),
  trackingNumber: z.string().optional().openapi({ example: 'AWB123456789' }),
  notes: z.string().optional(),
}).openapi('UpdateOrderRequest');

// Full order response for admin (includes more details)
export const AdminOrderResponseSchema = z.object({
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
  shippingAddress: z.any().nullable(),
  shippingMethod: z.string().nullable(),
  shippingCost: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  stripeSessionId: z.string().nullable(),
  stripePaymentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  approvedAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  shippedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  variants: z.array(ModelVariantSchema),
  review: z.object({
    id: z.string(),
    rating: z.number(),
    comment: z.string().nullable(),
    photoUrls: z.array(z.string()).nullable(),
    isPublic: z.boolean(),
    createdAt: z.string().datetime(),
  }).nullable(),
}).openapi('AdminOrderResponse');

// Variant schemas
export const VariantIdParamSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
  variantId: z.string().openapi({ param: { name: 'variantId', in: 'path' } }),
});

// Example schemas for admin
export const CreateExampleSchema = z.object({
  title: z.string().min(2).openapi({ example: 'Figurină câine' }),
  description: z.string().optional().openapi({ example: 'Figurină 3D personalizată după poza câinelui' }),
  imageUrls: z.array(z.string().url()).min(1).openapi({ example: ['https://cdn.print3d.ro/examples/dog1.jpg'] }),
  category: z.string().optional().openapi({ example: 'animale' }),
  sortOrder: z.number().optional().default(0),
}).openapi('CreateExampleRequest');

export const UpdateExampleSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
}).openapi('UpdateExampleRequest');

export const AdminExampleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrls: z.array(z.string()),
  category: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string().datetime(),
}).openapi('AdminExample');

// Stats schema
export const StatsResponseSchema = z.object({
  ordersToday: z.number(),
  ordersThisWeek: z.number(),
  ordersThisMonth: z.number(),
  revenueThisMonth: z.number(),
  pendingApproval: z.number(),
  inProduction: z.number(),
  ordersByStatus: z.array(z.object({
    status: z.string(),
    count: z.number(),
  })),
}).openapi('StatsResponse');

export { ErrorSchema };

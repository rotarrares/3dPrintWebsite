import { z } from '@hono/zod-openapi';

// Error response schema
export const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'validation_error' }),
  message: z.string().openapi({ example: 'Date invalide' }),
  details: z.array(z.object({
    path: z.string(),
    message: z.string(),
  })).optional(),
}).openapi('Error');

// Pagination query parameters
export const PaginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1).openapi({ example: '1' }),
  limit: z.string().optional().transform(val => Math.min(val ? parseInt(val, 10) : 20, 100)).openapi({ example: '20' }),
}).openapi('PaginationQuery');

// Pagination response
export const PaginationSchema = z.object({
  page: z.number().openapi({ example: 1 }),
  limit: z.number().openapi({ example: 20 }),
  total: z.number().openapi({ example: 100 }),
  totalPages: z.number().openapi({ example: 5 }),
}).openapi('Pagination');

// Success response
export const SuccessSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().optional().openapi({ example: 'Operație reușită' }),
}).openapi('Success');

// ID parameter
export const IdParamSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'clx1234567890',
  }),
}).openapi('IdParam');

// Model variant schema
export const ModelVariantSchema = z.object({
  id: z.string(),
  previewImageUrl: z.string().url(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
}).openapi('ModelVariant');

// Review schema
export const ReviewSchema = z.object({
  id: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable(),
  photoUrls: z.array(z.string()).nullable(),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
}).openapi('Review');

// Shipping address schema
export const ShippingAddressSchema = z.object({
  street: z.string().min(3).openapi({ example: 'Str. Exemplu nr. 10' }),
  city: z.string().min(2).openapi({ example: 'Cluj-Napoca' }),
  county: z.string().min(2).openapi({ example: 'Cluj' }),
  postalCode: z.string().min(5).openapi({ example: '400001' }),
  notes: z.string().optional().openapi({ example: 'Etaj 2, apartament 10' }),
}).openapi('ShippingAddress');

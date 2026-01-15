import { z } from '@hono/zod-openapi';
import { PaginationSchema, PaginationQuerySchema } from '../schemas/common.js';

// Product response schema
export const ProductSchema = z.object({
  id: z.string().openapi({ example: 'clx1234567890' }),
  name: z.string().openapi({ example: 'Dragon 3D Model' }),
  description: z.string().nullable().openapi({ example: 'Un dragon detaliat, perfect pentru decor' }),
  price: z.string().openapi({ example: '150.00' }),
  category: z.string().nullable().openapi({ example: 'figurine' }),
  imageUrls: z.array(z.string().url()).openapi({
    example: ['https://storage.example.com/products/dragon-1.jpg']
  }),
  modelUrl: z.string().url().nullable().openapi({
    example: 'https://storage.example.com/models/dragon.stl'
  }),
  modelPreviewUrl: z.string().url().nullable().openapi({
    example: 'https://storage.example.com/previews/dragon-preview.jpg'
  }),
  isFeatured: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
}).openapi('Product');

// Product list query parameters
export const ProductListQuerySchema = PaginationQuerySchema.extend({
  category: z.string().optional().openapi({
    example: 'figurine',
    description: 'Filtrare după categorie'
  }),
  featured: z.string().optional().transform(val => val === 'true').openapi({
    example: 'true',
    description: 'Doar produse recomandate'
  }),
}).openapi('ProductListQuery');

// Product list response
export const ProductListResponseSchema = z.object({
  products: z.array(ProductSchema),
  pagination: PaginationSchema,
}).openapi('ProductListResponse');

// Single product response
export const ProductResponseSchema = z.object({
  product: ProductSchema,
}).openapi('ProductResponse');

// Categories response
export const CategoriesResponseSchema = z.object({
  categories: z.array(z.string()).openapi({ example: ['figurine', 'decoratiuni', 'accesorii'] }),
}).openapi('CategoriesResponse');

import { z } from '@hono/zod-openapi';
import { PaginationSchema, PaginationQuerySchema } from '../schemas/common.js';

// Product variant schema for public API
export const ProductVariantSchema = z.object({
  id: z.string().openapi({ example: 'clx1234567890' }),
  name: z.string().nullable().openapi({ example: 'Red Large' }),
  size: z.string().nullable().openapi({ example: 'L' }),
  color: z.string().nullable().openapi({ example: 'Red' }),
  imageUrls: z.array(z.string().url()).openapi({
    example: ['https://storage.example.com/variants/dragon-red.jpg']
  }),
  price: z.string().openapi({ example: '160.00' }), // Calculated: basePrice + priceAdjustment
}).openapi('ProductVariant');

// Category schema for public API
export const CategorySchema = z.object({
  id: z.string().openapi({ example: 'clx1234567890' }),
  name: z.string().openapi({ example: 'Figurine' }),
  description: z.string().nullable().openapi({ example: 'Figurine 3D personalizate' }),
  imageUrl: z.string().url().nullable().openapi({
    example: 'https://storage.example.com/categories/figurine.jpg'
  }),
}).openapi('Category');

// Product response schema
export const ProductSchema = z.object({
  id: z.string().openapi({ example: 'clx1234567890' }),
  name: z.string().openapi({ example: 'Dragon 3D Model' }),
  description: z.string().nullable().openapi({ example: 'Un dragon detaliat, perfect pentru decor' }),
  basePrice: z.string().openapi({ example: '150.00' }),
  category: CategorySchema.nullable().openapi({ example: null }),
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
  variants: z.array(ProductVariantSchema).openapi({ example: [] }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
}).openapi('Product');

// Product list query parameters
export const ProductListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({
    example: 'dragon',
    description: 'Căutare în nume și descriere produs'
  }),
  category: z.string().optional().openapi({
    example: 'clx1234567890',
    description: 'Filtrare după ID-ul categoriei'
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

// Categories response (full category objects)
export const CategoriesResponseSchema = z.object({
  categories: z.array(CategorySchema),
}).openapi('CategoriesResponse');

// Search suggestion item - lightweight for autocomplete
export const SearchSuggestionSchema = z.object({
  id: z.string().openapi({ example: 'clx1234567890' }),
  name: z.string().openapi({ example: 'Dragon 3D Model' }),
  imageUrl: z.string().url().nullable().openapi({
    example: 'https://storage.example.com/products/dragon-1.jpg'
  }),
  price: z.string().openapi({ example: '150.00' }),
  slug: z.string().nullable().openapi({ example: 'dragon-3d-model' }),
}).openapi('SearchSuggestion');

// Search query parameters
export const SearchQuerySchema = z.object({
  q: z.string().min(1).openapi({
    example: 'dragon',
    description: 'Termen de căutare (minim 1 caracter)'
  }),
  category: z.string().optional().openapi({
    example: 'clx1234567890',
    description: 'Filtrare după ID-ul categoriei'
  }),
  featured: z.string().optional().transform(val => val === 'true').openapi({
    example: 'true',
    description: 'Doar produse recomandate'
  }),
  sortBy: z.enum(['relevance', 'price', 'name', 'createdAt']).optional().default('relevance').openapi({
    example: 'relevance',
    description: 'Sortare după: relevance, price, name, createdAt'
  }),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc').openapi({
    example: 'asc',
    description: 'Ordine sortare: asc sau desc'
  }),
  limit: z.string().optional().transform(val => Math.min(val ? parseInt(val, 10) : 8, 20)).openapi({
    example: '8',
    description: 'Număr maxim de rezultate (default 8, max 20)'
  }),
}).openapi('SearchQuery');

// Search response
export const SearchResponseSchema = z.object({
  results: z.array(SearchSuggestionSchema),
  total: z.number().openapi({ example: 15 }),
}).openapi('SearchResponse');

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { Decimal } from '@prisma/client/runtime/library';
import { db } from '../lib/db.js';
import { formatPrice } from '../lib/utils.js';
import { ErrorSchema, IdParamSchema } from '../schemas/common.js';
import {
  ProductListQuerySchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  CategoriesResponseSchema,
  SearchQuerySchema,
  SearchResponseSchema,
} from './products.schemas.js';

const app = new OpenAPIHono();

// Helper to format category
function formatCategory(category: { id: string; name: string; description: string | null; imageUrl: string | null } | null) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    imageUrl: category.imageUrl,
  };
}

// Helper to format variant with calculated price
function formatVariant(variant: any, basePrice: Decimal) {
  const adjustedPrice = basePrice.add(variant.priceAdjustment);
  return {
    id: variant.id,
    name: variant.name,
    size: variant.size,
    color: variant.color,
    imageUrls: variant.imageUrls as string[],
    price: formatPrice(adjustedPrice) as string,
  };
}

// GET /api/products - List public products
const listProductsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Products'],
  summary: 'Listă produse',
  description: 'Returnează toate produsele disponibile pentru afișare pe site.',
  request: {
    query: ProductListQuerySchema,
  },
  responses: {
    200: {
      description: 'Listă produse',
      content: {
        'application/json': {
          schema: ProductListResponseSchema,
        },
      },
    },
  },
});

app.openapi(listProductsRoute, async (c) => {
  const { page, limit, search, category, featured } = c.req.valid('query');

  const where: any = {
    isActive: true,
    ...(category && { categoryId: category }),
    ...(featured && { isFeatured: true }),
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return c.json({
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: formatPrice(p.basePrice) as string,
      category: formatCategory(p.category),
      imageUrls: p.imageUrls as string[],
      modelUrl: p.modelUrl,
      modelPreviewUrl: p.modelPreviewUrl,
      isFeatured: p.isFeatured,
      variants: p.variants.map(v => formatVariant(v, p.basePrice)),
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 200);
});

// GET /api/products/categories - Get all categories
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['Products'],
  summary: 'Listă categorii',
  description: 'Returnează toate categoriile de produse disponibile.',
  responses: {
    200: {
      description: 'Listă categorii',
      content: {
        'application/json': {
          schema: CategoriesResponseSchema,
        },
      },
    },
  },
});

app.openapi(listCategoriesRoute, async (c) => {
  const categories = await db.productCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return c.json({
    categories: categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      imageUrl: cat.imageUrl,
    })),
  }, 200);
});

// GET /api/products/search - Lightweight search for autocomplete
const searchProductsRoute = createRoute({
  method: 'get',
  path: '/search',
  tags: ['Products'],
  summary: 'Căutare produse (autocomplete)',
  description: 'Endpoint optimizat pentru search bar - returnează date minime pentru sugestii.',
  request: {
    query: SearchQuerySchema,
  },
  responses: {
    200: {
      description: 'Rezultate căutare',
      content: {
        'application/json': {
          schema: SearchResponseSchema,
        },
      },
    },
  },
});

app.openapi(searchProductsRoute, async (c) => {
  const { q, category, featured, sortBy, sortOrder, limit } = c.req.valid('query');

  const where: any = {
    isActive: true,
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ],
    ...(category && { categoryId: category }),
    ...(featured && { isFeatured: true }),
  };

  // Build orderBy based on sortBy
  let orderBy: any;
  switch (sortBy) {
    case 'price':
      orderBy = { basePrice: sortOrder };
      break;
    case 'name':
      orderBy = { name: sortOrder };
      break;
    case 'createdAt':
      orderBy = { createdAt: sortOrder };
      break;
    case 'relevance':
    default:
      // For relevance, prioritize name matches then by sortOrder
      orderBy = [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
      break;
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        imageUrls: true,
        basePrice: true,
        slug: true,
      },
      orderBy,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return c.json({
    results: products.map(p => ({
      id: p.id,
      name: p.name,
      imageUrl: (p.imageUrls as string[])[0] || null,
      price: formatPrice(p.basePrice) as string,
      slug: p.slug,
    })),
    total,
  }, 200);
});

// GET /api/products/:id - Get single product
const getProductRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Products'],
  summary: 'Detalii produs',
  description: 'Returnează detaliile unui produs specific.',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalii produs',
      content: {
        'application/json': {
          schema: ProductResponseSchema,
        },
      },
    },
    404: {
      description: 'Produs negăsit',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(getProductRoute, async (c) => {
  const { id } = c.req.valid('param');

  const product = await db.product.findFirst({
    where: { id, isActive: true },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!product) {
    return c.json({
      error: 'not_found',
      message: 'Produsul nu a fost găsit',
    }, 404);
  }

  return c.json({
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: formatPrice(product.basePrice) as string,
      category: formatCategory(product.category),
      imageUrls: product.imageUrls as string[],
      modelUrl: product.modelUrl,
      modelPreviewUrl: product.modelPreviewUrl,
      isFeatured: product.isFeatured,
      variants: product.variants.map(v => formatVariant(v, product.basePrice)),
      createdAt: product.createdAt.toISOString(),
    },
  }, 200);
});

export default app;

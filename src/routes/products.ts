import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../lib/db.js';
import { formatPrice } from '../lib/utils.js';
import { ErrorSchema, IdParamSchema } from '../schemas/common.js';
import {
  ProductListQuerySchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  CategoriesResponseSchema,
} from './products.schemas.js';

const app = new OpenAPIHono();

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
  const { page, limit, category, featured } = c.req.valid('query');

  const where = {
    isActive: true,
    ...(category && { category }),
    ...(featured && { isFeatured: true }),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
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
      price: formatPrice(p.price) as string,
      category: p.category,
      imageUrls: p.imageUrls as string[],
      modelUrl: p.modelUrl,
      modelPreviewUrl: p.modelPreviewUrl,
      isFeatured: p.isFeatured,
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
  const products = await db.product.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  });

  const categories = products
    .map(p => p.category)
    .filter((c): c is string => c !== null);

  return c.json({ categories }, 200);
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
      price: formatPrice(product.price) as string,
      category: product.category,
      imageUrls: product.imageUrls as string[],
      modelUrl: product.modelUrl,
      modelPreviewUrl: product.modelPreviewUrl,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt.toISOString(),
    },
  }, 200);
});

export default app;

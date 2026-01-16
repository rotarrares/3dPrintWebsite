import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { db } from '../../lib/db.js';
import { adminAuth } from '../../middleware/auth.js';
import { deleteFile } from '../../lib/storage.js';
import { formatPrice } from '../../lib/utils.js';
import {
  CreateProductSchema,
  UpdateProductSchema,
  AdminProductSchema,
  AdminProductDetailSchema,
  CreateVariantSchema,
  UpdateVariantSchema,
  AdminVariantSchema,
  ErrorSchema,
} from '../admin.schemas.js';
import { SuccessSchema, IdParamSchema, PaginationSchema } from '../../schemas/common.js';

const app = new OpenAPIHono();

// Apply auth to all routes
app.use('*', adminAuth);

// Helper to format product for list view
function formatProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: formatPrice(product.basePrice) as string,
    categoryId: product.categoryId,
    categoryName: product.category?.name || null,
    imageUrls: product.imageUrls as string[],
    modelUrl: product.modelUrl,
    modelPreviewUrl: product.modelPreviewUrl,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
    variantsCount: product._count?.variants || 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

// Helper to format variant
function formatVariant(variant: any) {
  return {
    id: variant.id,
    productId: variant.productId,
    name: variant.name,
    size: variant.size,
    color: variant.color,
    imageUrls: variant.imageUrls as string[],
    priceAdjustment: formatPrice(variant.priceAdjustment) as string,
    stock: variant.stock,
    isActive: variant.isActive,
    sortOrder: variant.sortOrder,
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  };
}

// Helper to format product with details
function formatProductDetail(product: any) {
  return {
    ...formatProduct(product),
    variants: product.variants?.map(formatVariant) || [],
    category: product.category ? {
      id: product.category.id,
      name: product.category.name,
      description: product.category.description,
      imageUrl: product.category.imageUrl,
      isActive: product.category.isActive,
      sortOrder: product.category.sortOrder,
      createdAt: product.category.createdAt.toISOString(),
      updatedAt: product.category.updatedAt.toISOString(),
    } : null,
  };
}

// Product list query schema
const ProductListQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => Math.min(val ? parseInt(val, 10) : 20, 100)),
});

// GET /api/admin/products - List all products
const listProductsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin Products'],
  summary: 'Listă produse',
  description: 'Returnează toate produsele (inclusiv inactive).',
  security: [{ Bearer: [] }],
  request: {
    query: ProductListQuerySchema,
  },
  responses: {
    200: {
      description: 'Listă produse',
      content: {
        'application/json': {
          schema: z.object({
            products: z.array(AdminProductSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
  },
});

app.openapi(listProductsRoute, async (c) => {
  const { search, categoryId, isActive, page, limit } = c.req.valid('query');

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        _count: { select: { variants: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return c.json({
    products: products.map(formatProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 200);
});

// POST /api/admin/products - Create product
const createProductRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Admin Products'],
  summary: 'Adaugă produs',
  description: 'Creează un nou produs.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProductSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Produs creat',
      content: {
        'application/json': {
          schema: AdminProductDetailSchema,
        },
      },
    },
    400: {
      description: 'Date invalide',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createProductRoute, async (c) => {
  const data = c.req.valid('json');

  // Verify category exists if provided
  if (data.categoryId) {
    const category = await db.productCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return c.json({
        error: 'invalid_category',
        message: 'Categoria specificată nu există',
      }, 400);
    }
  }

  const product = await db.product.create({
    data: {
      name: data.name,
      description: data.description || null,
      basePrice: data.basePrice,
      categoryId: data.categoryId || null,
      imageUrls: data.imageUrls,
      modelUrl: data.modelUrl || null,
      modelPreviewUrl: data.modelPreviewUrl || null,
      isFeatured: data.isFeatured,
      sortOrder: data.sortOrder,
    },
    include: {
      category: true,
      variants: true,
      _count: { select: { variants: true } },
    },
  });

  return c.json(formatProductDetail(product), 201);
});

// GET /api/admin/products/:id - Get product details
const getProductRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Admin Products'],
  summary: 'Detalii produs',
  description: 'Returnează detaliile unui produs cu variantele sale.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalii produs',
      content: {
        'application/json': {
          schema: AdminProductDetailSchema,
        },
      },
    },
    404: {
      description: 'Produsul nu există',
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

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { variants: true } },
    },
  });

  if (!product) {
    return c.json({ error: 'not_found', message: 'Produsul nu există' }, 404);
  }

  return c.json(formatProductDetail(product), 200);
});

// PATCH /api/admin/products/:id - Update product
const updateProductRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Admin Products'],
  summary: 'Editează produs',
  description: 'Actualizează un produs existent.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateProductSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Produs actualizat',
      content: {
        'application/json': {
          schema: AdminProductDetailSchema,
        },
      },
    },
    400: {
      description: 'Date invalide',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Produsul nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(updateProductRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const existing = await db.product.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'not_found', message: 'Produsul nu există' }, 404);
  }

  // Verify category exists if updating
  if (data.categoryId) {
    const category = await db.productCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return c.json({
        error: 'invalid_category',
        message: 'Categoria specificată nu există',
      }, 400);
    }
  }

  const product = await db.product.update({
    where: { id },
    data,
    include: {
      category: true,
      variants: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { variants: true } },
    },
  });

  return c.json(formatProductDetail(product), 200);
});

// DELETE /api/admin/products/:id - Delete product
const deleteProductRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Admin Products'],
  summary: 'Șterge produs',
  description: 'Șterge un produs și toate variantele sale.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Produs șters',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    404: {
      description: 'Produsul nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteProductRoute, async (c) => {
  const { id } = c.req.valid('param');

  const product = await db.product.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!product) {
    return c.json({ error: 'not_found', message: 'Produsul nu există' }, 404);
  }

  // Try to delete images from storage
  const imageUrls = product.imageUrls as string[];
  for (const url of imageUrls) {
    try {
      await deleteFile(url);
    } catch (e) {
      console.error('Failed to delete product image:', e);
    }
  }

  // Delete variant images
  for (const variant of product.variants) {
    const variantImages = variant.imageUrls as string[];
    for (const url of variantImages) {
      try {
        await deleteFile(url);
      } catch (e) {
        console.error('Failed to delete variant image:', e);
      }
    }
  }

  // Delete model files
  if (product.modelUrl) {
    try {
      await deleteFile(product.modelUrl);
    } catch (e) {
      console.error('Failed to delete model file:', e);
    }
  }
  if (product.modelPreviewUrl) {
    try {
      await deleteFile(product.modelPreviewUrl);
    } catch (e) {
      console.error('Failed to delete model preview:', e);
    }
  }

  await db.product.delete({ where: { id } });

  return c.json({ success: true, message: 'Produs șters' }, 200);
});

// ========== Variant Routes ==========

const VariantParamsSchema = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' } }),
  variantId: z.string().openapi({ param: { name: 'variantId', in: 'path' } }),
});

// POST /api/admin/products/:id/variants - Create variant
const createVariantRoute = createRoute({
  method: 'post',
  path: '/{id}/variants',
  tags: ['Admin Product Variants'],
  summary: 'Adaugă variantă',
  description: 'Creează o nouă variantă pentru un produs.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateVariantSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Variantă creată',
      content: {
        'application/json': {
          schema: AdminVariantSchema,
        },
      },
    },
    404: {
      description: 'Produsul nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createVariantRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const product = await db.product.findUnique({ where: { id } });

  if (!product) {
    return c.json({ error: 'not_found', message: 'Produsul nu există' }, 404);
  }

  const variant = await db.productVariant.create({
    data: {
      productId: id,
      name: data.name || null,
      size: data.size || null,
      color: data.color || null,
      imageUrls: data.imageUrls,
      priceAdjustment: data.priceAdjustment,
      stock: data.stock,
      sortOrder: data.sortOrder,
    },
  });

  return c.json(formatVariant(variant), 201);
});

// PATCH /api/admin/products/:id/variants/:variantId - Update variant
const updateVariantRoute = createRoute({
  method: 'patch',
  path: '/{id}/variants/{variantId}',
  tags: ['Admin Product Variants'],
  summary: 'Editează variantă',
  description: 'Actualizează o variantă existentă.',
  security: [{ Bearer: [] }],
  request: {
    params: VariantParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateVariantSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Variantă actualizată',
      content: {
        'application/json': {
          schema: AdminVariantSchema,
        },
      },
    },
    404: {
      description: 'Varianta nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(updateVariantRoute, async (c) => {
  const { id, variantId } = c.req.valid('param');
  const data = c.req.valid('json');

  const existing = await db.productVariant.findFirst({
    where: { id: variantId, productId: id },
  });

  if (!existing) {
    return c.json({ error: 'not_found', message: 'Varianta nu există' }, 404);
  }

  const variant = await db.productVariant.update({
    where: { id: variantId },
    data,
  });

  return c.json(formatVariant(variant), 200);
});

// DELETE /api/admin/products/:id/variants/:variantId - Delete variant
const deleteVariantRoute = createRoute({
  method: 'delete',
  path: '/{id}/variants/{variantId}',
  tags: ['Admin Product Variants'],
  summary: 'Șterge variantă',
  description: 'Șterge o variantă a unui produs.',
  security: [{ Bearer: [] }],
  request: {
    params: VariantParamsSchema,
  },
  responses: {
    200: {
      description: 'Variantă ștearsă',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    404: {
      description: 'Varianta nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteVariantRoute, async (c) => {
  const { id, variantId } = c.req.valid('param');

  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId: id },
  });

  if (!variant) {
    return c.json({ error: 'not_found', message: 'Varianta nu există' }, 404);
  }

  // Try to delete images from storage
  const imageUrls = variant.imageUrls as string[];
  for (const url of imageUrls) {
    try {
      await deleteFile(url);
    } catch (e) {
      console.error('Failed to delete variant image:', e);
    }
  }

  await db.productVariant.delete({ where: { id: variantId } });

  return c.json({ success: true, message: 'Variantă ștearsă' }, 200);
});

export default app;

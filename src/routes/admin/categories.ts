import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { db } from '../../lib/db.js';
import { adminAuth } from '../../middleware/auth.js';
import { deleteFile } from '../../lib/storage.js';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  AdminCategorySchema,
  ErrorSchema,
} from '../admin.schemas.js';
import { SuccessSchema, IdParamSchema } from '../../schemas/common.js';

const app = new OpenAPIHono();

// Apply auth to all routes
app.use('*', adminAuth);

// Helper to format category
async function formatCategory(category: any) {
  const productCount = await db.product.count({
    where: { categoryId: category.id },
  });

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    productCount,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

// GET /api/admin/categories - List all categories
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin Categories'],
  summary: 'Listă categorii',
  description: 'Returnează toate categoriile (inclusiv inactive).',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Listă categorii',
      content: {
        'application/json': {
          schema: z.object({
            categories: z.array(AdminCategorySchema),
          }),
        },
      },
    },
  },
});

app.openapi(listCategoriesRoute, async (c) => {
  const categories = await db.productCategory.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const formattedCategories = await Promise.all(categories.map(formatCategory));

  return c.json({ categories: formattedCategories }, 200);
});

// POST /api/admin/categories - Create category
const createCategoryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Admin Categories'],
  summary: 'Adaugă categorie',
  description: 'Creează o nouă categorie de produse.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategorySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Categorie creată',
      content: {
        'application/json': {
          schema: AdminCategorySchema,
        },
      },
    },
    400: {
      description: 'Date invalide sau nume duplicat',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createCategoryRoute, async (c) => {
  const data = c.req.valid('json');

  // Check if category name already exists
  const existing = await db.productCategory.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    return c.json({
      error: 'duplicate',
      message: 'O categorie cu acest nume există deja',
    }, 400);
  }

  const category = await db.productCategory.create({
    data: {
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      sortOrder: data.sortOrder,
    },
  });

  return c.json(await formatCategory(category), 201);
});

// GET /api/admin/categories/:id - Get category details
const getCategoryRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Admin Categories'],
  summary: 'Detalii categorie',
  description: 'Returnează detaliile unei categorii.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalii categorie',
      content: {
        'application/json': {
          schema: AdminCategorySchema,
        },
      },
    },
    404: {
      description: 'Categoria nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(getCategoryRoute, async (c) => {
  const { id } = c.req.valid('param');

  const category = await db.productCategory.findUnique({ where: { id } });

  if (!category) {
    return c.json({ error: 'not_found', message: 'Categoria nu există' }, 404);
  }

  return c.json(await formatCategory(category), 200);
});

// PATCH /api/admin/categories/:id - Update category
const updateCategoryRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Admin Categories'],
  summary: 'Editează categorie',
  description: 'Actualizează o categorie existentă.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCategorySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Categorie actualizată',
      content: {
        'application/json': {
          schema: AdminCategorySchema,
        },
      },
    },
    400: {
      description: 'Nume duplicat',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Categoria nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(updateCategoryRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const existing = await db.productCategory.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'not_found', message: 'Categoria nu există' }, 404);
  }

  // Check for name conflicts if updating name
  if (data.name && data.name !== existing.name) {
    const duplicate = await db.productCategory.findUnique({
      where: { name: data.name },
    });
    if (duplicate) {
      return c.json({
        error: 'duplicate',
        message: 'O categorie cu acest nume există deja',
      }, 400);
    }
  }

  const category = await db.productCategory.update({
    where: { id },
    data,
  });

  return c.json(await formatCategory(category), 200);
});

// DELETE /api/admin/categories/:id - Delete category
const deleteCategoryRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Admin Categories'],
  summary: 'Șterge categorie',
  description: 'Șterge o categorie. Produsele vor rămâne fără categorie.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Categorie ștearsă',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    404: {
      description: 'Categoria nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteCategoryRoute, async (c) => {
  const { id } = c.req.valid('param');

  const category = await db.productCategory.findUnique({ where: { id } });

  if (!category) {
    return c.json({ error: 'not_found', message: 'Categoria nu există' }, 404);
  }

  // Try to delete image from storage
  if (category.imageUrl) {
    try {
      await deleteFile(category.imageUrl);
    } catch (e) {
      console.error('Failed to delete category image:', e);
    }
  }

  await db.productCategory.delete({ where: { id } });

  return c.json({ success: true, message: 'Categorie ștearsă' }, 200);
});

export default app;

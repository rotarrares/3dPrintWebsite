import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { db } from '../../lib/db.js';
import { adminAuth } from '../../middleware/auth.js';
import { deleteFile } from '../../lib/storage.js';
import {
  CreateExampleSchema,
  UpdateExampleSchema,
  AdminExampleSchema,
  ErrorSchema,
} from '../admin.schemas.js';
import { SuccessSchema, IdParamSchema } from '../../schemas/common.js';

const app = new OpenAPIHono();

// Apply auth to all routes
app.use('*', adminAuth);

// Helper to format example
function formatExample(example: any) {
  return {
    id: example.id,
    title: example.title,
    description: example.description,
    imageUrls: example.imageUrls as string[],
    category: example.category,
    isActive: example.isActive,
    sortOrder: example.sortOrder,
    createdAt: example.createdAt.toISOString(),
  };
}

// GET /api/admin/examples - List all examples (including inactive)
const listExamplesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin Examples'],
  summary: 'Listă exemple',
  description: 'Returnează toate exemplele (inclusiv inactive).',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Listă exemple',
      content: {
        'application/json': {
          schema: z.object({
            examples: z.array(AdminExampleSchema),
          }),
        },
      },
    },
  },
});

app.openapi(listExamplesRoute, async (c) => {
  const examples = await db.example.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return c.json({
    examples: examples.map(formatExample),
  }, 200);
});

// POST /api/admin/examples - Create example
const createExampleRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Admin Examples'],
  summary: 'Adaugă exemplu',
  description: 'Creează un nou exemplu de lucru.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateExampleSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Exemplu creat',
      content: {
        'application/json': {
          schema: AdminExampleSchema,
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

app.openapi(createExampleRoute, async (c) => {
  const data = c.req.valid('json');

  const example = await db.example.create({
    data: {
      title: data.title,
      description: data.description || null,
      imageUrls: data.imageUrls,
      category: data.category || null,
      sortOrder: data.sortOrder,
    },
  });

  return c.json(formatExample(example), 201);
});

// GET /api/admin/examples/:id - Get example details
const getExampleRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Admin Examples'],
  summary: 'Detalii exemplu',
  description: 'Returnează detaliile unui exemplu.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Detalii exemplu',
      content: {
        'application/json': {
          schema: AdminExampleSchema,
        },
      },
    },
    404: {
      description: 'Exemplul nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(getExampleRoute, async (c) => {
  const { id } = c.req.valid('param');

  const example = await db.example.findUnique({ where: { id } });

  if (!example) {
    return c.json({ error: 'not_found', message: 'Exemplul nu există' }, 404);
  }

  return c.json(formatExample(example), 200);
});

// PATCH /api/admin/examples/:id - Update example
const updateExampleRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Admin Examples'],
  summary: 'Editează exemplu',
  description: 'Actualizează un exemplu existent.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateExampleSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Exemplu actualizat',
      content: {
        'application/json': {
          schema: AdminExampleSchema,
        },
      },
    },
    404: {
      description: 'Exemplul nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(updateExampleRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const existing = await db.example.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ error: 'not_found', message: 'Exemplul nu există' }, 404);
  }

  const example = await db.example.update({
    where: { id },
    data,
  });

  return c.json(formatExample(example), 200);
});

// DELETE /api/admin/examples/:id - Delete example
const deleteExampleRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Admin Examples'],
  summary: 'Șterge exemplu',
  description: 'Șterge un exemplu permanent.',
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Exemplu șters',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
    404: {
      description: 'Exemplul nu există',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteExampleRoute, async (c) => {
  const { id } = c.req.valid('param');

  const example = await db.example.findUnique({ where: { id } });

  if (!example) {
    return c.json({ error: 'not_found', message: 'Exemplul nu există' }, 404);
  }

  // Try to delete images from storage
  const imageUrls = example.imageUrls as string[];
  for (const url of imageUrls) {
    try {
      await deleteFile(url);
    } catch (e) {
      console.error('Failed to delete image:', e);
    }
  }

  await db.example.delete({ where: { id } });

  return c.json({ success: true, message: 'Exemplu șters' }, 200);
});

export default app;

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { db } from '../lib/db.js';

const app = new OpenAPIHono();

// Example response schema
const ExampleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrls: z.array(z.string()),
  category: z.string().nullable(),
  createdAt: z.string().datetime(),
}).openapi('Example');

// List examples response
const ExamplesListSchema = z.object({
  examples: z.array(ExampleSchema),
}).openapi('ExamplesList');

// GET /api/examples - List public examples
const listExamplesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Examples'],
  summary: 'Listă exemple',
  description: 'Returnează toate exemplele active de lucrări anterioare.',
  request: {
    query: z.object({
      category: z.string().optional().openapi({
        example: 'animale',
        description: 'Filtrează după categorie',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Listă exemple',
      content: {
        'application/json': {
          schema: ExamplesListSchema,
        },
      },
    },
  },
});

app.openapi(listExamplesRoute, async (c) => {
  const { category } = c.req.valid('query');

  const examples = await db.example.findMany({
    where: {
      isActive: true,
      ...(category && { category }),
    },
    orderBy: { sortOrder: 'asc' },
  });

  return c.json({
    examples: examples.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      imageUrls: e.imageUrls as string[],
      category: e.category,
      createdAt: e.createdAt.toISOString(),
    })),
  }, 200);
});

export default app;

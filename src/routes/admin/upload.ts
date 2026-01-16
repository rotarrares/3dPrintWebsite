import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { createRoute } from '@hono/zod-openapi';
import { getPresignedUploadUrl } from '../../lib/storage.js';

const app = new OpenAPIHono();

const presignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(['models', 'products', 'examples', 'uploads']),
});

const presignedUrlResponseSchema = z.object({
  uploadUrl: z.string(),
  publicUrl: z.string(),
  key: z.string(),
});

const getPresignedUrlRoute = createRoute({
  method: 'post',
  path: '/presigned-url',
  tags: ['Admin Upload'],
  summary: 'Get presigned URL for direct upload to R2',
  request: {
    body: {
      content: {
        'application/json': {
          schema: presignedUrlSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Presigned URL generated',
      content: {
        'application/json': {
          schema: presignedUrlResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
    },
  },
});

app.openapi(getPresignedUrlRoute, async (c) => {
  const { filename, contentType, folder } = c.req.valid('json');

  const result = await getPresignedUploadUrl(filename, contentType, folder);

  return c.json(result);
});

export default app;

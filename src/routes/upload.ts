import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { uploadFile } from '../lib/storage.js';
import { isValidImageType, isValidFileSize, MAX_FILE_SIZE } from '../lib/utils.js';
import { ErrorSchema } from '../schemas/common.js';

const app = new OpenAPIHono();

// Upload response schema
const UploadResponseSchema = z.object({
  url: z.string().url().openapi({ example: 'https://cdn.print3d.ro/uploads/1234567890-photo.jpg' }),
  filename: z.string().openapi({ example: 'photo.jpg' }),
  size: z.number().openapi({ example: 1048576 }),
}).openapi('UploadResponse');

// POST /api/upload - Upload image
const uploadRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Upload'],
  summary: 'Upload imagine',
  description: 'Încarcă o imagine pentru comandă. Acceptă JPG, PNG, WebP până la 10MB.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().openapi({
              type: 'string',
              format: 'binary',
              description: 'Fișier imagine (jpg, png, webp, max 10MB)',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Imagine încărcată cu succes',
      content: {
        'application/json': {
          schema: UploadResponseSchema,
        },
      },
    },
    400: {
      description: 'Fișier invalid',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(uploadRoute, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return c.json({
      error: 'no_file',
      message: 'Nu a fost trimis niciun fișier',
    }, 400);
  }

  // Validate file type
  if (!isValidImageType(file.type)) {
    return c.json({
      error: 'invalid_type',
      message: 'Tipul fișierului nu este acceptat. Acceptăm doar JPG, PNG sau WebP.',
    }, 400);
  }

  // Validate file size
  if (!isValidFileSize(file.size)) {
    return c.json({
      error: 'file_too_large',
      message: `Fișierul este prea mare. Dimensiunea maximă este ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    }, 400);
  }

  try {
    const url = await uploadFile(file, 'uploads');

    return c.json({
      url,
      filename: file.name,
      size: file.size,
    }, 200);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({
      error: 'upload_failed',
      message: 'Eroare la încărcarea fișierului',
    }, 500);
  }
});

export default app;

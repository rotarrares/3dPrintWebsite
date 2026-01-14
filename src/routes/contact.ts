import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { sendContactNotification } from '../lib/email.js';
import { ErrorSchema, SuccessSchema } from '../schemas/common.js';

const app = new OpenAPIHono();

// Contact form schema
const ContactSchema = z.object({
  name: z.string().min(2).openapi({ example: 'Ion Popescu' }),
  email: z.string().email().openapi({ example: 'ion@example.com' }),
  phone: z.string().optional().openapi({ example: '0740123456' }),
  message: z.string().min(10).openapi({ example: 'Aș dori mai multe informații despre serviciile voastre.' }),
}).openapi('ContactRequest');

// POST /api/contact - Send contact message
const contactRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Contact'],
  summary: 'Trimite mesaj contact',
  description: 'Trimite un mesaj către echipa Print3D.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ContactSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Mesaj trimis',
      content: {
        'application/json': {
          schema: SuccessSchema,
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
    500: {
      description: 'Eroare trimitere',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(contactRoute, async (c) => {
  const data = c.req.valid('json');

  try {
    await sendContactNotification(data);

    return c.json({
      success: true,
      message: 'Mesajul a fost trimis. Te vom contacta în curând.',
    }, 200);
  } catch (error) {
    console.error('Contact email error:', error);
    return c.json({
      error: 'email_failed',
      message: 'Nu am putut trimite mesajul. Încearcă din nou.',
    }, 500);
  }
});

export default app;

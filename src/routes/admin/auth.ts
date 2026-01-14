import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../../lib/db.js';
import { createToken, comparePassword } from '../../lib/auth.js';
import { adminAuth } from '../../middleware/auth.js';
import {
  LoginSchema,
  LoginResponseSchema,
  AdminUserSchema,
  ErrorSchema,
} from '../admin.schemas.js';
import { SuccessSchema } from '../../schemas/common.js';

const app = new OpenAPIHono();

// POST /api/admin/auth/login
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Admin Auth'],
  summary: 'Login admin',
  description: 'Autentificare administrator. Returnează token JWT.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login reușit',
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
    },
    401: {
      description: 'Credențiale invalide',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');

  const admin = await db.adminUser.findUnique({
    where: { email },
  });

  if (!admin) {
    return c.json({
      error: 'invalid_credentials',
      message: 'Email sau parolă incorectă',
    }, 401);
  }

  const isValid = await comparePassword(password, admin.passwordHash);

  if (!isValid) {
    return c.json({
      error: 'invalid_credentials',
      message: 'Email sau parolă incorectă',
    }, 401);
  }

  const token = await createToken(admin.id, admin.email, admin.name);

  return c.json({
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  }, 200);
});

// POST /api/admin/auth/logout
const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Admin Auth'],
  summary: 'Logout admin',
  description: 'Deconectare administrator.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Logout reușit',
      content: {
        'application/json': {
          schema: SuccessSchema,
        },
      },
    },
  },
});

app.openapi(logoutRoute, async (c) => {
  // JWT tokens are stateless, client should discard the token
  return c.json({ success: true, message: 'Logout reușit' }, 200);
});

// GET /api/admin/auth/me
const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Admin Auth'],
  summary: 'Date admin curent',
  description: 'Returnează datele administratorului autentificat.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Date administrator',
      content: {
        'application/json': {
          schema: AdminUserSchema,
        },
      },
    },
    401: {
      description: 'Neautentificat',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Administrator negăsit',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.use('/me', adminAuth);

app.openapi(meRoute, async (c) => {
  const adminId = c.get('adminId');

  const admin = await db.adminUser.findUnique({
    where: { id: adminId },
  });

  if (!admin) {
    return c.json({
      error: 'not_found',
      message: 'Administrator negăsit',
    }, 404);
  }

  return c.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    createdAt: admin.createdAt.toISOString(),
  }, 200);
});

export default app;

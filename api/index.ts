import { handle } from 'hono/vercel';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app.js';
import { createAdminApp } from '../src/admin/index.js';

export const runtime = 'nodejs';

// Create AdminJS Express app
const adminApp = createAdminApp();

// Hono handlers
const honoHandler = handle(app);

// Combined handler that routes to AdminJS or Hono
function createHandler(method: string) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const url = req.url || '/';

    // Route /admin/* to Express AdminJS
    if (url.startsWith('/admin')) {
      return adminApp(req, res);
    }

    // Route everything else to Hono
    return honoHandler(req as any);
  };
}

export const GET = createHandler('GET');
export const POST = createHandler('POST');
export const PUT = createHandler('PUT');
export const PATCH = createHandler('PATCH');
export const DELETE = createHandler('DELETE');
export const OPTIONS = createHandler('OPTIONS');

import { handle } from 'hono/vercel';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app.js';

export const runtime = 'nodejs';

// Hono handler (lightweight, safe to initialize at load time)
const honoHandler = handle(app);

// Lazy admin app - only load AdminJS when needed
let adminApp: import('express').Application | null = null;

async function getAdminApp() {
  if (!adminApp) {
    const { createAdminApp } = await import('../src/admin/index.js');
    adminApp = createAdminApp();
  }
  return adminApp;
}

// Combined handler that routes to AdminJS or Hono
function createHandler(_method: string) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const url = req.url || '/';

    // Route /admin/* to Express AdminJS (lazy loaded)
    if (url.startsWith('/admin')) {
      const admin = await getAdminApp();
      return admin(req, res);
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

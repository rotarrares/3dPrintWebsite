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
    // Get the path - check multiple sources for Vercel compatibility
    const url = req.url || (req.headers['x-vercel-proxy-path'] as string) || '/';
    const path = url.split('?')[0];

    // Debug logging
    console.log('Request URL:', req.url, 'Path:', path);

    // Route /admin/* to Express AdminJS (lazy loaded)
    if (path === '/admin' || path.startsWith('/admin/')) {
      try {
        const admin = await getAdminApp();
        return admin(req, res);
      } catch (error) {
        console.error('AdminJS error:', error);
        res.status(500).json({ error: 'Admin panel error', message: String(error) });
        return;
      }
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

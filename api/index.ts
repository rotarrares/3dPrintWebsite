import { handle } from 'hono/vercel';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app.js';

export const runtime = 'nodejs';

// Hono handler
const honoHandler = handle(app);

// Lazy admin app - only load AdminJS when /admin is accessed
let adminApp: import('express').Application | null = null;

async function getAdminApp() {
  if (!adminApp) {
    const { createAdminApp } = await import('../src/admin/index.js');
    adminApp = createAdminApp();
  }
  return adminApp;
}

// Combined handler
async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.split('?')[0];

  // Route /admin/* to Express AdminJS
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
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const runtime = 'nodejs';

// Everything is lazy-loaded to avoid module initialization issues
let honoHandler: any = null;
let adminApp: any = null;

async function getHonoHandler() {
  if (!honoHandler) {
    const { handle } = await import('hono/vercel');
    const { default: app } = await import('../src/app.js');
    honoHandler = handle(app);
  }
  return honoHandler;
}

async function getAdminApp() {
  if (!adminApp) {
    const { createAdminApp } = await import('../src/admin/index.js');
    adminApp = createAdminApp();
  }
  return adminApp;
}

// Main handler
async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.split('?')[0];

  console.log('[Handler] Path:', path);

  // Route /admin/* to Express AdminJS
  if (path === '/admin' || path.startsWith('/admin/')) {
    console.log('[Handler] -> AdminJS');
    try {
      const admin = await getAdminApp();
      return admin(req, res);
    } catch (error) {
      console.error('[Handler] AdminJS error:', error);
      res.status(500).json({ error: 'Admin panel error', message: String(error) });
      return;
    }
  }

  // Route everything else to Hono
  console.log('[Handler] -> Hono');
  const hono = await getHonoHandler();
  return hono(req);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

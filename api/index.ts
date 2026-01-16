import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy-loaded handlers
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  const hono = await getHonoHandler();
  return hono(req);
}

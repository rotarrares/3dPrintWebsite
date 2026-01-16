import type { VercelRequest, VercelResponse } from '@vercel/node';

// Everything is lazy-loaded
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

// Single default export handler (Vercel standard pattern)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.split('?')[0];

  console.log('=== HANDLER CALLED ===', path);

  // Route /admin/* to Express AdminJS
  if (path === '/admin' || path.startsWith('/admin/')) {
    console.log('=== ROUTING TO ADMIN ===');
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
  console.log('=== ROUTING TO HONO ===');
  const hono = await getHonoHandler();
  return hono(req);
}

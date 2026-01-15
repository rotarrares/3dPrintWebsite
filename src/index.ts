import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import app from './app.js';
import { createAdminApp, adminJs } from './admin/index.js';

const port = Number(process.env.PORT) || 3001;

console.log('Print3D API Server');
console.log('====================');
console.log(`Server:       http://localhost:${port}`);
console.log(`API Docs:     http://localhost:${port}/docs`);
console.log(`OpenAPI:      http://localhost:${port}/openapi.json`);
console.log(`Health:       http://localhost:${port}/health`);
console.log(`Admin Panel:  http://localhost:${port}${adminJs.options.rootPath}`);
console.log('====================');

// Create Express app for AdminJS
const adminApp = createAdminApp();

// Create Hono request listener
const honoListener = getRequestListener(app.fetch);

// Create a single HTTP server that routes to AdminJS or Hono
const server = createServer((req, res) => {
  const url = req.url || '/';

  // Route /admin/* requests to Express AdminJS
  if (url.startsWith('/admin')) {
    adminApp(req, res);
  } else {
    // Route everything else to Hono
    honoListener(req, res);
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

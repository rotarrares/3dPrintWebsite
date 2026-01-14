import { serve } from '@hono/node-server';
import app from './app.js';

const port = Number(process.env.PORT) || 3001;

console.log('🚀 Print3D API Server');
console.log('====================');
console.log(`📡 Server:    http://localhost:${port}`);
console.log(`📚 API Docs:  http://localhost:${port}/docs`);
console.log(`📋 OpenAPI:   http://localhost:${port}/openapi.json`);
console.log(`💚 Health:    http://localhost:${port}/health`);
console.log('====================');

serve({
  fetch: app.fetch,
  port,
});

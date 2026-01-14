import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error.js';

const app = new OpenAPIHono();

// Request logging
app.use('*', logger());

// CORS configuration
app.use('*', cors({
  origin: [
    'https://print3d.ro',
    'https://www.print3d.ro',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api', apiRoutes);

// OpenAPI documentation
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Print3D.ro API',
    version: '1.0.0',
    description: 'API pentru serviciul de cadouri personalizate printate 3D',
    contact: {
      name: 'Print3D Support',
      email: 'contact@print3d.ro',
      url: 'https://print3d.ro',
    },
  },
  servers: [
    { url: 'https://api.print3d.ro', description: 'Production' },
    { url: 'http://localhost:3001', description: 'Development' },
  ],
  tags: [
    { name: 'Orders', description: 'Gestionare comenzi client' },
    { name: 'Upload', description: 'Încărcare fișiere' },
    { name: 'Examples', description: 'Exemple de lucrări' },
    { name: 'Contact', description: 'Formular contact' },
    { name: 'Webhooks', description: 'Webhook-uri externe (Stripe)' },
    { name: 'Admin Auth', description: 'Autentificare administrator' },
    { name: 'Admin Orders', description: 'Gestionare comenzi (admin)' },
    { name: 'Admin Examples', description: 'Gestionare exemple (admin)' },
    { name: 'Admin Stats', description: 'Statistici dashboard' },
  ],
  components: {
    securitySchemes: {
      Bearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT pentru autentificare admin',
      },
    },
  },
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'not_found',
    message: 'Endpoint-ul solicitat nu există',
  }, 404);
});

export default app;

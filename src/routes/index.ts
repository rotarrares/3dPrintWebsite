import { OpenAPIHono } from '@hono/zod-openapi';
import ordersRoutes from './orders.js';
import uploadRoutes from './upload.js';
import examplesRoutes from './examples.js';
import contactRoutes from './contact.js';
import webhooksRoutes from './webhooks.js';
import adminRoutes from './admin/index.js';

const app = new OpenAPIHono();

// Public routes
app.route('/orders', ordersRoutes);
app.route('/upload', uploadRoutes);
app.route('/examples', examplesRoutes);
app.route('/contact', contactRoutes);
app.route('/webhooks', webhooksRoutes);

// Admin routes
app.route('/admin', adminRoutes);

export default app;

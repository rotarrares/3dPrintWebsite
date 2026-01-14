import { OpenAPIHono } from '@hono/zod-openapi';
import authRoutes from './auth.js';
import ordersRoutes from './orders.js';
import examplesRoutes from './examples.js';
import statsRoutes from './stats.js';

const app = new OpenAPIHono();

// Mount admin sub-routes
app.route('/auth', authRoutes);
app.route('/orders', ordersRoutes);
app.route('/examples', examplesRoutes);
app.route('/stats', statsRoutes);

export default app;

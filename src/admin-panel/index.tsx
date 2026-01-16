import { Hono } from 'hono';
import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import ordersRoutes from './orders.js';
import examplesRoutes from './examples.js';
import productsRoutes from './products.js';
import categoriesRoutes from './categories.js';

const app = new Hono();

// Auth routes (login, logout)
app.route('/', authRoutes);

// Dashboard (main page)
app.route('/', dashboardRoutes);

// Resource management routes
app.route('/orders', ordersRoutes);
app.route('/examples', examplesRoutes);
app.route('/products', productsRoutes);
app.route('/categories', categoriesRoutes);

export default app;

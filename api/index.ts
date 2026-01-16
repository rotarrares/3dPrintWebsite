import { handle } from 'hono/vercel';
import app from '../src/app.js';

// Admin panel is not available on Vercel due to rollup native binary issues
// Use local development (npm run dev) to access the admin panel

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

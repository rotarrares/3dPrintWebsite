import { handle } from 'hono/vercel';
import app from '../src/app.js';

export const runtime = 'nodejs';

// Use Hono's Vercel handler directly
// AdminJS is not supported in serverless - use local development for admin panel
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

import { handle } from 'hono/vercel';
import app from '../dist/app.js';

// Admin panel available at /admin
// Uses pre-compiled TypeScript from dist/ folder

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

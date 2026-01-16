import { handle } from 'hono/vercel';
import app from '../src/app-vercel.js';

// Note: Admin panel is only available in local development (run: npm run dev)
// Vercel serverless doesn't properly handle .tsx files

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

import type { Context, Next } from 'hono';
import { verifyToken, extractBearerToken } from '../lib/auth.js';

/**
 * Middleware for admin authentication
 * Verifies JWT token and sets adminId in context
 */
export async function adminAuth(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json(
      { error: 'unauthorized', message: 'Token de autentificare lipsă' },
      401
    );
  }

  try {
    const payload = await verifyToken(token);
    c.set('adminId', payload.sub);
    c.set('adminEmail', payload.email);
    c.set('adminName', payload.name);
    return await next();
  } catch {
    return c.json(
      { error: 'unauthorized', message: 'Token invalid sau expirat' },
      401
    );
  }
}

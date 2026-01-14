import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Creates a JWT token for an admin user
 */
export async function createToken(userId: string, email: string, name: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const payload: JWTPayload = {
    sub: userId,
    email,
    name,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  return sign(payload, JWT_SECRET);
}

/**
 * Verifies and decodes a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const payload = await verify(token, JWT_SECRET) as JWTPayload;
  return payload;
}

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a password with a hash
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Extracts bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

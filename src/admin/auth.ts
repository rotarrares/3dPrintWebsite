import { db } from '../lib/db.js';
import { comparePassword } from '../lib/auth.js';

export interface AdminSession {
  id: string;
  email: string;
  name: string;
}

/**
 * Authenticates an admin user for AdminJS
 * Returns user object if valid, null otherwise
 */
export async function authenticate(
  email: string,
  password: string
): Promise<AdminSession | null> {
  const admin = await db.adminUser.findUnique({
    where: { email },
  });

  if (!admin) {
    return null;
  }

  const isValid = await comparePassword(password, admin.passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
  };
}

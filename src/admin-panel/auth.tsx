import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Layout, Alert } from './layout.js';
import { db } from '../lib/db.js';
import { createToken, comparePassword, verifyToken } from '../lib/auth.js';

const app = new Hono();

// Middleware to check auth
export async function checkAdminAuth(c: any): Promise<{ isLoggedIn: boolean; admin?: any }> {
  const token = getCookie(c, 'admin_token');
  if (!token) {
    return { isLoggedIn: false };
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return { isLoggedIn: false };
    }

    const admin = await db.adminUser.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) {
      return { isLoggedIn: false };
    }

    return { isLoggedIn: true, admin };
  } catch {
    return { isLoggedIn: false };
  }
}

// Login page
app.get('/login', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (isLoggedIn) {
    return c.redirect('/admin');
  }

  const error = c.req.query('error');

  return c.html(
    <Layout title="Login" isLoggedIn={false}>
      <article class="login-card">
        <header>
          <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>🖨️ Print3D Admin</h1>
          <p style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
            Autentificare administrator
          </p>
        </header>

        {error && <Alert type="error" message="Email sau parolă incorectă" />}

        <form method="post" action="/admin/login">
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="admin@print3d.ro"
              required
              autocomplete="email"
            />
          </label>

          <label>
            Parolă
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </label>

          <button type="submit" style={{ width: '100%' }}>
            Autentificare
          </button>
        </form>
      </article>
    </Layout>
  );
});

// Login handler
app.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const email = body.email as string;
  const password = body.password as string;

  if (!email || !password) {
    return c.redirect('/admin/login?error=1');
  }

  const admin = await db.adminUser.findUnique({
    where: { email },
  });

  if (!admin) {
    return c.redirect('/admin/login?error=1');
  }

  const isValid = await comparePassword(password, admin.passwordHash);
  if (!isValid) {
    return c.redirect('/admin/login?error=1');
  }

  const token = await createToken(admin.id, admin.email, admin.name);

  setCookie(c, 'admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return c.redirect('/admin');
});

// Logout
app.get('/logout', async (c) => {
  deleteCookie(c, 'admin_token', { path: '/' });
  return c.redirect('/admin/login');
});

export default app;

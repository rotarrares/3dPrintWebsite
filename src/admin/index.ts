import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSPrisma from '@adminjs/prisma';
import express from 'express';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { resources } from './resources/index.js';
import { authenticate } from './auth.js';

// Register Prisma adapter
AdminJS.registerAdapter({
  Database: AdminJSPrisma.Database,
  Resource: AdminJSPrisma.Resource,
});

const adminJs = new AdminJS({
  rootPath: '/admin',
  resources: resources,
  branding: {
    companyName: 'Print3D.ro Admin',
    withMadeWithLove: false,
  },
  locale: {
    language: 'ro',
    translations: {
      ro: {
        labels: {
          Order: 'Comenzi',
          Product: 'Produse',
          Example: 'Exemple',
          AdminUser: 'Administratori',
          ModelVariant: 'Variante Model',
          Review: 'Recenzii',
        },
        resources: {
          Order: {
            properties: {
              orderNumber: 'Nr. Comanda',
              status: 'Status',
              customerName: 'Nume Client',
              customerEmail: 'Email',
              customerPhone: 'Telefon',
              customerCity: 'Oras',
              price: 'Pret',
              createdAt: 'Data Crearii',
            },
          },
        },
      },
    },
  },
});

const PgStore = ConnectPgSimple(session);

const sessionStore = new PgStore({
  conString: process.env.DATABASE_URL,
  tableName: 'adminjs_sessions',
  createTableIfMissing: true,
});

export const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate,
    cookieName: 'adminjs',
    cookiePassword:
      process.env.ADMINJS_COOKIE_SECRET ||
      'secure-cookie-secret-min-32-characters!!',
  },
  null,
  {
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    secret:
      process.env.SESSION_SECRET || 'session-secret-min-32-characters!!',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }
);

export function createAdminApp(): express.Application {
  const app = express();
  app.use(adminJs.options.rootPath!, adminRouter);
  return app;
}

export { adminJs };

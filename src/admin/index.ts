import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSPrisma from '@adminjs/prisma';
import express from 'express';
import { resources } from './resources/index.js';
import { authenticate } from './auth.js';

// Register Prisma adapter
AdminJS.registerAdapter({
  Database: AdminJSPrisma.Database,
  Resource: AdminJSPrisma.Resource,
});

// Lazy initialization for serverless
let adminApp: express.Application | null = null;
let adminJs: AdminJS | null = null;

function getAdminJs(): AdminJS {
  if (!adminJs) {
    adminJs = new AdminJS({
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
  }
  return adminJs;
}

function createAdminRouter() {
  const admin = getAdminJs();

  // Use memory session store for serverless compatibility
  // PgStore causes issues with cold starts in serverless environments
  return AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName: 'adminjs',
      cookiePassword:
        process.env.ADMINJS_COOKIE_SECRET ||
        'secure-cookie-secret-min-32-characters!!',
    },
    null,
    {
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
}

export function createAdminApp(): express.Application {
  if (!adminApp) {
    adminApp = express();
    const admin = getAdminJs();
    const router = createAdminRouter();
    adminApp.use(admin.options.rootPath!, router);
  }
  return adminApp;
}

export { getAdminJs };

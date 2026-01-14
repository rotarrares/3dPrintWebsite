import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return c.json(
      {
        error: 'validation_error',
        message: 'Date invalide',
        details: issues,
      },
      400
    );
  }

  // Handle HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: 'http_error',
        message: err.message,
      },
      err.status
    );
  }

  // Handle Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      return c.json(
        {
          error: 'conflict',
          message: 'Înregistrare duplicată',
          field: prismaError.meta?.target?.[0],
        },
        409
      );
    }

    if (prismaError.code === 'P2025') {
      return c.json(
        {
          error: 'not_found',
          message: 'Resursa nu a fost găsită',
        },
        404
      );
    }
  }

  // Default server error
  return c.json(
    {
      error: 'server_error',
      message: process.env.NODE_ENV === 'production'
        ? 'Eroare internă de server'
        : err.message,
    },
    500
  );
}

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../../lib/db.js';
import { adminAuth } from '../../middleware/auth.js';
import { StatsResponseSchema, ErrorSchema } from '../admin.schemas.js';

const app = new OpenAPIHono();

// Apply auth to all routes
app.use('*', adminAuth);

// Helper to get start of day/week/month
function getStartOfDay(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  now.setDate(diff);
  now.setHours(0, 0, 0, 0);
  return now;
}

function getStartOfMonth(): Date {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now;
}

// GET /api/admin/stats - Get dashboard statistics
const statsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin Stats'],
  summary: 'Statistici dashboard',
  description: 'Returnează statisticile pentru dashboard-ul admin.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Statistici',
      content: {
        'application/json': {
          schema: StatsResponseSchema,
        },
      },
    },
  },
});

app.openapi(statsRoute, async (c) => {
  const startOfDay = getStartOfDay();
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  // Run all queries in parallel
  const [
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    revenueResult,
    pendingApproval,
    inProduction,
    ordersByStatus,
  ] = await Promise.all([
    // Orders today
    db.order.count({
      where: { createdAt: { gte: startOfDay } },
    }),

    // Orders this week
    db.order.count({
      where: { createdAt: { gte: startOfWeek } },
    }),

    // Orders this month
    db.order.count({
      where: { createdAt: { gte: startOfMonth } },
    }),

    // Revenue this month (sum of paid orders)
    db.order.aggregate({
      where: {
        paidAt: { gte: startOfMonth },
        price: { not: null },
      },
      _sum: { price: true },
    }),

    // Pending approval count
    db.order.count({
      where: { status: 'PENDING_APPROVAL' },
    }),

    // In production count (APPROVED + PAID + PRINTING)
    db.order.count({
      where: {
        status: { in: ['APPROVED', 'PAID', 'PRINTING'] },
      },
    }),

    // Orders by status
    db.order.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
  ]);

  return c.json({
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    revenueThisMonth: Number(revenueResult._sum.price || 0),
    pendingApproval,
    inProduction,
    ordersByStatus: ordersByStatus.map(item => ({
      status: item.status,
      count: item._count.status,
    })),
  }, 200);
});

export default app;

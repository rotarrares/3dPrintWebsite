import { Hono } from 'hono';
import { Layout, StatusBadge } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';
import { formatPrice } from '../lib/utils.js';

const app = new Hono();

// Helper functions for date ranges
function getStartOfDay(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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

// Dashboard page
app.get('/', async (c) => {
  const { isLoggedIn, admin } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const startOfDay = getStartOfDay();
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  // Fetch statistics
  const [
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    revenueResult,
    pendingApproval,
    inProduction,
    ordersByStatus,
    recentOrders,
  ] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: startOfDay } } }),
    db.order.count({ where: { createdAt: { gte: startOfWeek } } }),
    db.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.order.aggregate({
      where: { paidAt: { gte: startOfMonth }, price: { not: null } },
      _sum: { price: true },
    }),
    db.order.count({ where: { status: 'PENDING_APPROVAL' } }),
    db.order.count({ where: { status: { in: ['APPROVED', 'PAID', 'PRINTING'] } } }),
    db.order.groupBy({ by: ['status'], _count: { status: true } }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        price: true,
        createdAt: true,
      },
    }),
  ]);

  const revenue = Number(revenueResult._sum.price || 0);

  return c.html(
    <Layout title="Dashboard" isLoggedIn={true} currentPath="/admin">
      <h1>👋 Bun venit, {admin?.name || 'Admin'}!</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>{ordersToday}</h3>
          <p>Comenzi azi</p>
        </div>
        <div class="stat-card">
          <h3>{ordersThisWeek}</h3>
          <p>Comenzi săptămâna aceasta</p>
        </div>
        <div class="stat-card">
          <h3>{ordersThisMonth}</h3>
          <p>Comenzi luna aceasta</p>
        </div>
        <div class="stat-card">
          <h3>{formatPrice(revenue)}</h3>
          <p>Venituri luna aceasta</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style={{ borderColor: '#fce4ec' }}>
          <h3 style={{ color: '#c2185b' }}>{pendingApproval}</h3>
          <p>Așteaptă aprobare</p>
        </div>
        <div class="stat-card" style={{ borderColor: '#f3e5f5' }}>
          <h3 style={{ color: '#7b1fa2' }}>{inProduction}</h3>
          <p>În producție</p>
        </div>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <div class="header-actions">
          <h2>Comenzi recente</h2>
          <a href="/admin/orders" role="button" class="outline">
            Vezi toate →
          </a>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nr. Comandă</th>
                <th>Client</th>
                <th>Status</th>
                <th>Preț</th>
                <th>Data</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr>
                  <td>
                    <strong>{order.orderNumber}</strong>
                  </td>
                  <td>{order.customerName}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>{order.price ? formatPrice(order.price) : '-'}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString('ro-RO')}</td>
                  <td class="actions-cell">
                    <a href={`/admin/orders/${order.id}`} role="button" class="outline secondary">
                      Detalii
                    </a>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colspan={6} style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
                    Nu există comenzi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Comenzi pe status</h2>
        <div class="stats-grid">
          {ordersByStatus.map((item) => (
            <div class="stat-card">
              <StatusBadge status={item.status} />
              <h3 style={{ marginTop: '0.5rem' }}>{item._count.status}</h3>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
});

export default app;

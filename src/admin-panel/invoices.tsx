import { Hono } from 'hono';
import { Layout, Pagination, Alert } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';
import { formatPrice } from '../lib/utils.js';
import { InvoiceStatus } from '@prisma/client';

const app = new Hono();

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Ciornă',
  GENERATED: 'Generată',
  SENT: 'Trimisă',
  CANCELLED: 'Anulată',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  GENERATED: '#2563eb',
  SENT: '#059669',
  CANCELLED: '#dc2626',
};

// Invoices list
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const status = c.req.query('status') as InvoiceStatus | undefined;
  const search = c.req.query('search') || '';
  const message = c.req.query('message');

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      { order: { customerName: { contains: search, mode: 'insensitive' } } },
      { order: { customerEmail: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
          },
        },
      },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.html(
    <Layout title="Facturi" isLoggedIn={true} currentPath="/admin/invoices">
      <div class="header-actions">
        <h1>📄 Facturi</h1>
        <span style={{ color: 'var(--pico-muted-color)' }}>
          {total} {total === 1 ? 'factură' : 'facturi'}
        </span>
      </div>

      {message === 'sent' && (
        <Alert type="success" message="Factura a fost trimisă prin email!" />
      )}
      {message === 'error' && (
        <Alert type="error" message="A apărut o eroare." />
      )}

      <form method="get" action="/admin/invoices">
        <div class="search-filters">
          <input
            type="search"
            name="search"
            placeholder="Caută după nr. factură, comandă sau client..."
            value={search}
            style={{ flex: 2 }}
          />
          <select name="status" style={{ flex: 1 }}>
            <option value="">Toate statusurile</option>
            <option value="DRAFT" selected={status === 'DRAFT'}>Ciornă</option>
            <option value="GENERATED" selected={status === 'GENERATED'}>Generată</option>
            <option value="SENT" selected={status === 'SENT'}>Trimisă</option>
            <option value="CANCELLED" selected={status === 'CANCELLED'}>Anulată</option>
          </select>
          <button type="submit" style={{ flex: 0 }}>
            🔍 Caută
          </button>
        </div>
      </form>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nr. Factură</th>
              <th>Nr. Comandă</th>
              <th>Client</th>
              <th>Total</th>
              <th>Data emiterii</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr>
                <td>
                  <strong>{invoice.invoiceNumber}</strong>
                </td>
                <td>
                  <a href={`/admin/orders/${invoice.order.id}`}>
                    {invoice.order.orderNumber}
                  </a>
                </td>
                <td>
                  <div>{invoice.order.customerName}</div>
                  <small style={{ color: 'var(--pico-muted-color)' }}>
                    {invoice.order.customerEmail}
                  </small>
                </td>
                <td>{formatPrice(invoice.total)}</td>
                <td>{new Date(invoice.issueDate).toLocaleDateString('ro-RO')}</td>
                <td>
                  <span style={{
                    color: STATUS_COLORS[invoice.status] || '#6b7280',
                    fontWeight: 500,
                  }}>
                    {STATUS_LABELS[invoice.status] || invoice.status}
                  </span>
                </td>
                <td class="actions-cell">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {invoice.pdfUrl && (
                      <a href={invoice.pdfUrl} target="_blank" role="button" class="outline secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                        📥 PDF
                      </a>
                    )}
                    {invoice.status !== 'SENT' && invoice.pdfUrl && (
                      <form method="post" action={`/admin/invoices/${invoice.id}/send`} style={{ margin: 0 }}>
                        <button type="submit" class="outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                          📧 Trimite
                        </button>
                      </form>
                    )}
                    <a href={`/admin/orders/${invoice.order.id}`} role="button" class="outline secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                      🔗 Comandă
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colspan={7} style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
                  Nu s-au găsit facturi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} baseUrl="/admin/invoices" />
    </Layout>
  );
});

// Send invoice email
app.post('/:id/send', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!invoice || !invoice.pdfUrl) {
    return c.redirect('/admin/invoices?message=error');
  }

  try {
    const { sendInvoiceEmail } = await import('../lib/email.js');
    const { markInvoiceAsSent } = await import('../lib/invoice.js');
    await sendInvoiceEmail(invoice.order, invoice);
    await markInvoiceAsSent(invoice.id);
    return c.redirect('/admin/invoices?message=sent');
  } catch (e) {
    console.error('Failed to send invoice:', e);
    return c.redirect('/admin/invoices?message=error');
  }
});

export default app;

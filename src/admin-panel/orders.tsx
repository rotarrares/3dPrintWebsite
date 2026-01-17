import { Hono } from 'hono';
import { Layout, StatusBadge, Pagination, Alert } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';
import { formatPrice } from '../lib/utils.js';
import { OrderStatus } from '@prisma/client';

const app = new Hono();

const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'MODELING',
  'PENDING_APPROVAL',
  'APPROVED',
  'PAID',
  'PRINTING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Primită',
  MODELING: 'Modelare',
  PENDING_APPROVAL: 'Așteaptă Aprobare',
  APPROVED: 'Aprobată',
  PAID: 'Plătită',
  PRINTING: 'În Producție',
  SHIPPED: 'Expediată',
  DELIVERED: 'Livrată',
  CANCELLED: 'Anulată',
};

// Orders list
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const status = c.req.query('status') as OrderStatus | undefined;
  const search = c.req.query('search') || '';
  const message = c.req.query('message');

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { orderNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.html(
    <Layout title="Comenzi" isLoggedIn={true} currentPath="/admin/orders">
      <div class="header-actions">
        <h1>📦 Comenzi</h1>
        <span style={{ color: 'var(--pico-muted-color)' }}>
          {total} {total === 1 ? 'comandă' : 'comenzi'}
        </span>
      </div>

      {message === 'updated' && (
        <Alert type="success" message="Comanda a fost actualizată cu succes!" />
      )}

      <form method="get" action="/admin/orders">
        <div class="search-filters">
          <input
            type="search"
            name="search"
            placeholder="Caută comandă..."
            value={search}
            style={{ flex: 2 }}
          />
          <select name="status" style={{ flex: 1 }}>
            <option value="">Toate statusurile</option>
            {ORDER_STATUSES.map((s) => (
              <option value={s} selected={status === s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
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
              <th>Nr. Comandă</th>
              <th>Client</th>
              <th>Email</th>
              <th>Oraș</th>
              <th>Status</th>
              <th>Variante</th>
              <th>Preț</th>
              <th>Data</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr>
                <td>
                  <strong>{order.orderNumber}</strong>
                </td>
                <td>{order.customerName}</td>
                <td>
                  <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
                </td>
                <td>{order.customerCity}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>{order.variants.length}</td>
                <td>{order.price ? formatPrice(order.price) : '-'}</td>
                <td>{new Date(order.createdAt).toLocaleDateString('ro-RO')}</td>
                <td class="actions-cell">
                  <a href={`/admin/orders/${order.id}`} role="button" class="outline secondary">
                    Detalii
                  </a>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colspan={9} style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
                  Nu s-au găsit comenzi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} baseUrl="/admin/orders" />
    </Layout>
  );
});

// Order detail page
app.get('/:id', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const message = c.req.query('message');

  const order = await db.order.findUnique({
    where: { id },
    include: { variants: true, review: true, invoice: true },
  });

  if (!order) {
    return c.html(
      <Layout title="Comandă negăsită" isLoggedIn={true} currentPath="/admin/orders">
        <Alert type="error" message="Comanda nu a fost găsită" />
        <a href="/admin/orders" role="button">← Înapoi la comenzi</a>
      </Layout>
    );
  }

  const shippingAddress = order.shippingAddress as any;

  return c.html(
    <Layout title={`Comandă ${order.orderNumber}`} isLoggedIn={true} currentPath="/admin/orders">
      <div class="header-actions">
        <div>
          <a href="/admin/orders" style={{ fontSize: '0.875rem' }}>← Înapoi la comenzi</a>
          <h1 style={{ marginTop: '0.5rem' }}>
            Comandă {order.orderNumber}
            <StatusBadge status={order.status} />
          </h1>
        </div>
      </div>

      {message === 'updated' && (
        <Alert type="success" message="Comanda a fost actualizată cu succes!" />
      )}
      {message === 'email_sent' && (
        <Alert type="success" message="Emailul a fost trimis cu succes!" />
      )}
      {message === 'invoice_generated' && (
        <Alert type="success" message="Factura a fost generată cu succes!" />
      )}
      {message === 'invoice_regenerated' && (
        <Alert type="success" message="Factura a fost regenerată cu succes!" />
      )}
      {message === 'invoice_sent' && (
        <Alert type="success" message="Factura a fost trimisă prin email!" />
      )}
      {message === 'invoice_error' && (
        <Alert type="error" message="A apărut o eroare la procesarea facturii." />
      )}

      <div class="order-detail">
        <div>
          {/* Customer Info */}
          <section class="detail-section">
            <h3>👤 Informații client</h3>
            <div class="detail-row">
              <span class="detail-label">Nume</span>
              <span>{order.customerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
            </div>
            <div class="detail-row">
              <span class="detail-label">Telefon</span>
              <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
            </div>
            <div class="detail-row">
              <span class="detail-label">Oraș</span>
              <span>{order.customerCity}</span>
            </div>
          </section>

          {/* Order Details */}
          <section class="detail-section">
            <h3>📋 Detalii comandă</h3>
            {order.description && (
              <div class="detail-row">
                <span class="detail-label">Descriere</span>
                <span>{order.description}</span>
              </div>
            )}
            {order.preferredSize && (
              <div class="detail-row">
                <span class="detail-label">Dimensiune preferată</span>
                <span>{order.preferredSize}</span>
              </div>
            )}
            {order.preferredColor && (
              <div class="detail-row">
                <span class="detail-label">Culoare preferată</span>
                <span>{order.preferredColor}</span>
              </div>
            )}
            {order.notes && (
              <div class="detail-row">
                <span class="detail-label">Note</span>
                <span>{order.notes}</span>
              </div>
            )}
            {order.sourceImageUrl && (
              <div style={{ marginTop: '1rem' }}>
                <span class="detail-label">Imagine sursă:</span>
                <br />
                <img src={order.sourceImageUrl} alt="Imagine sursă" class="image-preview" />
              </div>
            )}
          </section>

          {/* Shipping Address */}
          {shippingAddress && (
            <section class="detail-section">
              <h3>📍 Adresă livrare</h3>
              <div class="detail-row">
                <span class="detail-label">Nume</span>
                <span>{shippingAddress.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Adresă</span>
                <span>{shippingAddress.address}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Oraș</span>
                <span>{shippingAddress.city}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Județ</span>
                <span>{shippingAddress.county}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Cod Poștal</span>
                <span>{shippingAddress.postalCode}</span>
              </div>
              {shippingAddress.phone && (
                <div class="detail-row">
                  <span class="detail-label">Telefon</span>
                  <span>{shippingAddress.phone}</span>
                </div>
              )}
            </section>
          )}

          {/* Variants */}
          <section class="detail-section">
            <h3>🖼️ Variante model ({order.variants.length})</h3>
            {order.variants.length > 0 ? (
              <div class="variant-grid">
                {order.variants.map((variant) => (
                  <div class={`variant-card ${order.selectedVariantId === variant.id ? 'selected' : ''}`}
                       style={order.selectedVariantId === variant.id ? { border: '2px solid var(--pico-primary)' } : {}}>
                    <img src={variant.previewImageUrl} alt="Variantă" />
                    <div class="variant-info">
                      {variant.description && <p>{variant.description}</p>}
                      {order.selectedVariantId === variant.id && (
                        <span style={{ color: 'var(--pico-primary)', fontWeight: 'bold' }}>✓ Selectată</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--pico-muted-color)' }}>Nu există variante încărcate</p>
            )}

            {/* Upload variants form */}
            <details style={{ marginTop: '1rem' }}>
              <summary>Încarcă variante noi</summary>
              <form method="post" action={`/admin/orders/${order.id}/variants`} enctype="multipart/form-data" style={{ marginTop: '1rem' }}>
                <label>
                  Imagini (max 5)
                  <input type="file" name="images" accept="image/*" multiple required />
                </label>
                <button type="submit">📤 Încarcă</button>
              </form>
            </details>
          </section>

          {/* Review */}
          {order.review && (
            <section class="detail-section">
              <h3>⭐ Recenzie</h3>
              <div class="detail-row">
                <span class="detail-label">Rating</span>
                <span>{'⭐'.repeat(order.review.rating)} ({order.review.rating}/5)</span>
              </div>
              {order.review.comment && (
                <div class="detail-row">
                  <span class="detail-label">Comentariu</span>
                  <span>{order.review.comment}</span>
                </div>
              )}
              <div class="detail-row">
                <span class="detail-label">Publică</span>
                <span>{order.review.isPublic ? 'Da' : 'Nu'}</span>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar with actions */}
        <div>
          {/* Status & Price */}
          <section class="detail-section">
            <h3>⚙️ Actualizare comandă</h3>
            <form method="post" action={`/admin/orders/${order.id}/update`}>
              <label>
                Status
                <select name="status" required>
                  {ORDER_STATUSES.map((s) => (
                    <option value={s} selected={order.status === s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Preț (RON)
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  value={order.price ? Number(order.price) : ''}
                  placeholder="0.00"
                />
              </label>

              <label>
                Cost transport (RON)
                <input
                  type="number"
                  name="shippingCost"
                  step="0.01"
                  min="0"
                  value={order.shippingCost ? Number(order.shippingCost) : ''}
                  placeholder="0.00"
                />
              </label>

              <label>
                Număr tracking
                <input
                  type="text"
                  name="trackingNumber"
                  value={order.trackingNumber || ''}
                  placeholder="AWB123456"
                />
              </label>

              <button type="submit" style={{ width: '100%' }}>
                💾 Salvează
              </button>
            </form>
          </section>

          {/* Timestamps */}
          <section class="detail-section">
            <h3>📅 Timeline</h3>
            <div class="detail-row">
              <span class="detail-label">Creată</span>
              <span>{new Date(order.createdAt).toLocaleString('ro-RO')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Actualizată</span>
              <span>{new Date(order.updatedAt).toLocaleString('ro-RO')}</span>
            </div>
            {order.approvedAt && (
              <div class="detail-row">
                <span class="detail-label">Aprobată</span>
                <span>{new Date(order.approvedAt).toLocaleString('ro-RO')}</span>
              </div>
            )}
            {order.paidAt && (
              <div class="detail-row">
                <span class="detail-label">Plătită</span>
                <span>{new Date(order.paidAt).toLocaleString('ro-RO')}</span>
              </div>
            )}
            {order.shippedAt && (
              <div class="detail-row">
                <span class="detail-label">Expediată</span>
                <span>{new Date(order.shippedAt).toLocaleString('ro-RO')}</span>
              </div>
            )}
            {order.deliveredAt && (
              <div class="detail-row">
                <span class="detail-label">Livrată</span>
                <span>{new Date(order.deliveredAt).toLocaleString('ro-RO')}</span>
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section class="detail-section">
            <h3>📧 Acțiuni rapide</h3>

            {order.status === 'PENDING_APPROVAL' && order.variants.length > 0 && (
              <form method="post" action={`/admin/orders/${order.id}/send-email`} style={{ marginBottom: '0.5rem' }}>
                <input type="hidden" name="type" value="approval" />
                <button type="submit" class="outline" style={{ width: '100%' }}>
                  📧 Trimite email aprobare
                </button>
              </form>
            )}

            {order.status === 'SHIPPED' && (
              <form method="post" action={`/admin/orders/${order.id}/send-email`} style={{ marginBottom: '0.5rem' }}>
                <input type="hidden" name="type" value="shipping" />
                <button type="submit" class="outline" style={{ width: '100%' }}>
                  📧 Trimite email expediere
                </button>
              </form>
            )}

            {order.status === 'DELIVERED' && !order.review && (
              <form method="post" action={`/admin/orders/${order.id}/send-email`} style={{ marginBottom: '0.5rem' }}>
                <input type="hidden" name="type" value="review" />
                <button type="submit" class="outline" style={{ width: '100%' }}>
                  📧 Trimite cerere review
                </button>
              </form>
            )}
          </section>

          {/* Payment Info */}
          {(order.stripeSessionId || order.stripePaymentId) && (
            <section class="detail-section">
              <h3>💳 Plată</h3>
              {order.stripeSessionId && (
                <div class="detail-row">
                  <span class="detail-label">Session ID</span>
                  <span style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {order.stripeSessionId}
                  </span>
                </div>
              )}
              {order.stripePaymentId && (
                <div class="detail-row">
                  <span class="detail-label">Payment ID</span>
                  <span style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {order.stripePaymentId}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Invoice Section */}
          <section class="detail-section">
            <h3>📄 Factură</h3>
            {order.invoice ? (
              <>
                <div class="detail-row">
                  <span class="detail-label">Număr</span>
                  <strong>{order.invoice.invoiceNumber}</strong>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Data emiterii</span>
                  <span>{new Date(order.invoice.issueDate).toLocaleDateString('ro-RO')}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total</span>
                  <span>{formatPrice(order.invoice.total)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status</span>
                  <span>
                    {order.invoice.status === 'SENT' ? (
                      <span style={{ color: 'var(--pico-primary)' }}>✓ Trimisă</span>
                    ) : order.invoice.status === 'GENERATED' ? (
                      <span style={{ color: 'var(--pico-color)' }}>Generată</span>
                    ) : (
                      <span style={{ color: 'var(--pico-muted-color)' }}>{order.invoice.status}</span>
                    )}
                  </span>
                </div>
                {order.invoice.sentAt && (
                  <div class="detail-row">
                    <span class="detail-label">Trimisă la</span>
                    <span>{new Date(order.invoice.sentAt).toLocaleString('ro-RO')}</span>
                  </div>
                )}
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {order.invoice.pdfUrl && (
                    <a href={order.invoice.pdfUrl} target="_blank" role="button" class="outline" style={{ textAlign: 'center' }}>
                      📥 Descarcă PDF
                    </a>
                  )}
                  <form method="post" action={`/admin/orders/${order.id}/invoice/regenerate`} style={{ margin: 0 }}>
                    <button type="submit" class="outline secondary" style={{ width: '100%' }}>
                      🔄 Regenerează PDF
                    </button>
                  </form>
                  {order.invoice.status !== 'SENT' && (
                    <form method="post" action={`/admin/orders/${order.id}/invoice/send`} style={{ margin: 0 }}>
                      <button type="submit" class="outline" style={{ width: '100%' }}>
                        📧 Trimite factura
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--pico-muted-color)', marginBottom: '1rem' }}>
                  Nu există factură pentru această comandă.
                </p>
                {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && order.price ? (
                  <form method="post" action={`/admin/orders/${order.id}/invoice/generate`}>
                    <button type="submit" class="outline" style={{ width: '100%' }}>
                      📄 Generează factură
                    </button>
                  </form>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--pico-muted-color)' }}>
                    Factura se generează automat la expediere.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
});

// Update order
app.post('/:id/update', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    return c.redirect('/admin/orders');
  }

  const updateData: any = {};

  if (body.status) {
    updateData.status = body.status as OrderStatus;

    if (body.status === 'SHIPPED' && order.status !== 'SHIPPED') {
      updateData.shippedAt = new Date();
    }
    if (body.status === 'DELIVERED' && order.status !== 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }
  }

  if (body.price !== undefined && body.price !== '') {
    updateData.price = parseFloat(body.price as string);
  }

  if (body.shippingCost !== undefined && body.shippingCost !== '') {
    updateData.shippingCost = parseFloat(body.shippingCost as string);
  }

  if (body.trackingNumber !== undefined) {
    updateData.trackingNumber = body.trackingNumber as string || null;
  }

  await db.order.update({
    where: { id },
    data: updateData,
  });

  return c.redirect(`/admin/orders/${id}?message=updated`);
});

// Upload variants
app.post('/:id/variants', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const formData = await c.req.formData();
  const images = formData.getAll('images');

  const { uploadFile } = await import('../lib/storage.js');
  const { isValidImageType, isValidFileSize } = await import('../lib/utils.js');

  for (const image of images) {
    if (!(image instanceof File)) continue;
    if (!isValidImageType(image.type)) continue;
    if (!isValidFileSize(image.size)) continue;

    const url = await uploadFile(image, 'variants');
    await db.modelVariant.create({
      data: {
        orderId: id,
        previewImageUrl: url,
      },
    });
  }

  // Update status to PENDING_APPROVAL if needed
  const order = await db.order.findUnique({ where: { id } });
  if (order && (order.status === 'RECEIVED' || order.status === 'MODELING')) {
    await db.order.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  return c.redirect(`/admin/orders/${id}?message=updated`);
});

// Send email
app.post('/:id/send-email', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const emailType = body.type as string;

  const order = await db.order.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!order) {
    return c.redirect('/admin/orders');
  }

  const { sendApprovalEmail, sendShippingEmail, sendReviewRequestEmail } = await import('../lib/email.js');

  try {
    switch (emailType) {
      case 'approval':
        await sendApprovalEmail(order);
        break;
      case 'shipping':
        await sendShippingEmail(order);
        break;
      case 'review':
        await sendReviewRequestEmail(order);
        break;
    }
    return c.redirect(`/admin/orders/${id}?message=email_sent`);
  } catch (e) {
    console.error('Failed to send email:', e);
    return c.redirect(`/admin/orders/${id}?message=email_error`);
  }
});

// Generate invoice
app.post('/:id/invoice/generate', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  try {
    const { createInvoice } = await import('../lib/invoice.js');
    await createInvoice(id);
    return c.redirect(`/admin/orders/${id}?message=invoice_generated`);
  } catch (e) {
    console.error('Failed to generate invoice:', e);
    return c.redirect(`/admin/orders/${id}?message=invoice_error`);
  }
});

// Regenerate invoice
app.post('/:id/invoice/regenerate', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  const order = await db.order.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!order || !order.invoice) {
    return c.redirect(`/admin/orders/${id}?message=invoice_error`);
  }

  try {
    const { regenerateInvoice } = await import('../lib/invoice.js');
    await regenerateInvoice(order.invoice.id);
    return c.redirect(`/admin/orders/${id}?message=invoice_regenerated`);
  } catch (e) {
    console.error('Failed to regenerate invoice:', e);
    return c.redirect(`/admin/orders/${id}?message=invoice_error`);
  }
});

// Send invoice email
app.post('/:id/invoice/send', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  const order = await db.order.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!order || !order.invoice) {
    return c.redirect(`/admin/orders/${id}?message=invoice_error`);
  }

  try {
    const { sendInvoiceEmail } = await import('../lib/email.js');
    const { markInvoiceAsSent } = await import('../lib/invoice.js');
    await sendInvoiceEmail(order, order.invoice);
    await markInvoiceAsSent(order.invoice.id);
    return c.redirect(`/admin/orders/${id}?message=invoice_sent`);
  } catch (e) {
    console.error('Failed to send invoice:', e);
    return c.redirect(`/admin/orders/${id}?message=invoice_error`);
  }
});

export default app;

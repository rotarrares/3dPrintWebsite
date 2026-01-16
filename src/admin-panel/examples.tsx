import { Hono } from 'hono';
import { Layout, Alert, Pagination } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';

const app = new Hono();

// Examples list
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const message = c.req.query('message');

  const [examples, total] = await Promise.all([
    db.example.findMany({
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.example.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.html(
    <Layout title="Exemple" isLoggedIn={true} currentPath="/admin/examples">
      <div class="header-actions">
        <h1>🖼️ Exemple</h1>
        <a href="/admin/examples/new" role="button">
          + Adaugă exemplu
        </a>
      </div>

      {message === 'created' && (
        <Alert type="success" message="Exemplul a fost creat cu succes!" />
      )}
      {message === 'updated' && (
        <Alert type="success" message="Exemplul a fost actualizat cu succes!" />
      )}
      {message === 'deleted' && (
        <Alert type="success" message="Exemplul a fost șters cu succes!" />
      )}

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Imagine</th>
              <th>Titlu</th>
              <th>Categorie</th>
              <th>Ordine</th>
              <th>Activ</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {examples.map((example) => {
              const imageUrls = example.imageUrls as string[];
              return (
                <tr>
                  <td>
                    {imageUrls && imageUrls[0] && (
                      <img
                        src={imageUrls[0]}
                        alt={example.title}
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem' }}
                      />
                    )}
                  </td>
                  <td>
                    <strong>{example.title}</strong>
                    {example.description && (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--pico-muted-color)' }}>
                        {example.description.substring(0, 50)}...
                      </p>
                    )}
                  </td>
                  <td>{example.category || '-'}</td>
                  <td>{example.sortOrder}</td>
                  <td>
                    <span style={{ color: example.isActive ? 'green' : 'red' }}>
                      {example.isActive ? '✓ Da' : '✗ Nu'}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <a href={`/admin/examples/${example.id}`} role="button" class="outline secondary">
                      Editează
                    </a>
                    <form method="post" action={`/admin/examples/${example.id}/delete`} style={{ display: 'inline' }}>
                      <button type="submit" class="outline secondary" style={{ color: 'var(--pico-del-color)' }}
                              onclick="return confirm('Ești sigur că vrei să ștergi acest exemplu?')">
                        Șterge
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {examples.length === 0 && (
              <tr>
                <td colspan={6} style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
                  Nu există exemple
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} baseUrl="/admin/examples" />
    </Layout>
  );
});

// New example form
app.get('/new', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  return c.html(
    <Layout title="Exemplu nou" isLoggedIn={true} currentPath="/admin/examples">
      <div class="header-actions">
        <div>
          <a href="/admin/examples" style={{ fontSize: '0.875rem' }}>← Înapoi la exemple</a>
          <h1 style={{ marginTop: '0.5rem' }}>Exemplu nou</h1>
        </div>
      </div>

      <article>
        <form method="post" action="/admin/examples/new" enctype="multipart/form-data">
          <label>
            Titlu *
            <input type="text" name="title" required placeholder="Numele exemplului" />
          </label>

          <label>
            Descriere
            <textarea name="description" rows={3} placeholder="Descriere opțională"></textarea>
          </label>

          <label>
            Categorie
            <input type="text" name="category" placeholder="Ex: Figurine, Cadouri" />
          </label>

          <div class="grid">
            <label>
              Ordine sortare
              <input type="number" name="sortOrder" value="0" min="0" />
            </label>

            <label>
              <input type="checkbox" name="isActive" checked />
              Activ
            </label>
          </div>

          <label>
            Imagini *
            <input type="file" name="images" accept="image/*" multiple required />
          </label>

          <div class="form-actions">
            <button type="submit">💾 Salvează</button>
            <a href="/admin/examples" role="button" class="secondary outline">Anulează</a>
          </div>
        </form>
      </article>
    </Layout>
  );
});

// Create example
app.post('/new', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const formData = await c.req.formData();
  const title = formData.get('title') as string;
  const description = formData.get('description') as string || null;
  const category = formData.get('category') as string || null;
  const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
  const isActive = formData.get('isActive') === 'on';
  const images = formData.getAll('images');

  const { uploadFile } = await import('../lib/storage.js');
  const { isValidImageType, isValidFileSize } = await import('../lib/utils.js');

  const imageUrls: string[] = [];

  for (const image of images) {
    if (!(image instanceof File)) continue;
    if (!isValidImageType(image.type)) continue;
    if (!isValidFileSize(image.size)) continue;

    const url = await uploadFile(image, 'examples');
    imageUrls.push(url);
  }

  await db.example.create({
    data: {
      title,
      description,
      category,
      sortOrder,
      isActive,
      imageUrls,
    },
  });

  return c.redirect('/admin/examples?message=created');
});

// Edit example form
app.get('/:id', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const example = await db.example.findUnique({ where: { id } });

  if (!example) {
    return c.redirect('/admin/examples');
  }

  const imageUrls = example.imageUrls as string[];

  return c.html(
    <Layout title={`Editare ${example.title}`} isLoggedIn={true} currentPath="/admin/examples">
      <div class="header-actions">
        <div>
          <a href="/admin/examples" style={{ fontSize: '0.875rem' }}>← Înapoi la exemple</a>
          <h1 style={{ marginTop: '0.5rem' }}>Editare: {example.title}</h1>
        </div>
      </div>

      <article>
        <form method="post" action={`/admin/examples/${id}/update`} enctype="multipart/form-data">
          <label>
            Titlu *
            <input type="text" name="title" required value={example.title} />
          </label>

          <label>
            Descriere
            <textarea name="description" rows={3}>{example.description || ''}</textarea>
          </label>

          <label>
            Categorie
            <input type="text" name="category" value={example.category || ''} />
          </label>

          <div class="grid">
            <label>
              Ordine sortare
              <input type="number" name="sortOrder" value={example.sortOrder} min="0" />
            </label>

            <label>
              <input type="checkbox" name="isActive" checked={example.isActive} />
              Activ
            </label>
          </div>

          {imageUrls.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Imagini curente:</label>
              <div class="variant-grid">
                {imageUrls.map((url, index) => (
                  <div class="variant-card">
                    <img src={url} alt={`Imagine ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <label>
            Adaugă imagini noi (opțional)
            <input type="file" name="images" accept="image/*" multiple />
          </label>

          <div class="form-actions">
            <button type="submit">💾 Salvează</button>
            <a href="/admin/examples" role="button" class="secondary outline">Anulează</a>
          </div>
        </form>
      </article>
    </Layout>
  );
});

// Update example
app.post('/:id/update', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const formData = await c.req.formData();

  const example = await db.example.findUnique({ where: { id } });
  if (!example) {
    return c.redirect('/admin/examples');
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string || null;
  const category = formData.get('category') as string || null;
  const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
  const isActive = formData.get('isActive') === 'on';
  const images = formData.getAll('images');

  let imageUrls = example.imageUrls as string[];

  // Add new images if uploaded
  if (images.length > 0 && images[0] instanceof File && (images[0] as File).size > 0) {
    const { uploadFile } = await import('../lib/storage.js');
    const { isValidImageType, isValidFileSize } = await import('../lib/utils.js');

    for (const image of images) {
      if (!(image instanceof File)) continue;
      if (!isValidImageType(image.type)) continue;
      if (!isValidFileSize(image.size)) continue;

      const url = await uploadFile(image, 'examples');
      imageUrls.push(url);
    }
  }

  await db.example.update({
    where: { id },
    data: {
      title,
      description,
      category,
      sortOrder,
      isActive,
      imageUrls,
    },
  });

  return c.redirect('/admin/examples?message=updated');
});

// Delete example
app.post('/:id/delete', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  await db.example.delete({ where: { id } });

  return c.redirect('/admin/examples?message=deleted');
});

export default app;

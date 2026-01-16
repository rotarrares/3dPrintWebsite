import { Hono } from 'hono';
import { Layout, Alert, Pagination } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';

const app = new Hono();

// Categories list
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const message = c.req.query('message');

  const [categories, total] = await Promise.all([
    db.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { products: true } },
      },
    }),
    db.productCategory.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.html(
    <Layout title="Categorii" isLoggedIn={true} currentPath="/admin/categories">
      <div class="header-actions">
        <h1>📁 Categorii</h1>
        <a href="/admin/categories/new" role="button">
          + Adaugă categorie
        </a>
      </div>

      {message === 'created' && (
        <Alert type="success" message="Categoria a fost creată cu succes!" />
      )}
      {message === 'updated' && (
        <Alert type="success" message="Categoria a fost actualizată cu succes!" />
      )}
      {message === 'deleted' && (
        <Alert type="success" message="Categoria a fost ștearsă cu succes!" />
      )}

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Imagine</th>
              <th>Nume</th>
              <th>Descriere</th>
              <th>Produse</th>
              <th>Ordine</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr>
                <td>
                  {category.imageUrl && (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem' }}
                    />
                  )}
                </td>
                <td>
                  <strong>{category.name}</strong>
                </td>
                <td>
                  {category.description ? (
                    <span style={{ fontSize: '0.875rem', color: 'var(--pico-muted-color)' }}>
                      {category.description.substring(0, 50)}...
                    </span>
                  ) : '-'}
                </td>
                <td>{category._count.products}</td>
                <td>{category.sortOrder}</td>
                <td>
                  <span style={{ color: category.isActive ? 'green' : 'red', fontSize: '0.875rem' }}>
                    {category.isActive ? '✓ Activă' : '✗ Inactivă'}
                  </span>
                </td>
                <td class="actions-cell">
                  <a href={`/admin/categories/${category.id}`} role="button" class="outline secondary">
                    Editează
                  </a>
                  <form method="post" action={`/admin/categories/${category.id}/delete`} style={{ display: 'inline' }}>
                    <button type="submit" class="outline secondary" style={{ color: 'var(--pico-del-color)' }}
                            onclick="return confirm('Ești sigur că vrei să ștergi această categorie?')">
                      Șterge
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colspan={7} style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
                  Nu există categorii
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} baseUrl="/admin/categories" />
    </Layout>
  );
});

// Upload script for direct R2 uploads
const uploadScript = `
async function uploadFileToR2(file, folder) {
  const response = await fetch('/api/admin/upload/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      folder: folder
    })
  });

  if (!response.ok) throw new Error('Failed to get presigned URL');

  const { uploadUrl, publicUrl } = await response.json();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' }
  });

  if (!uploadResponse.ok) throw new Error('Failed to upload file to R2');

  return publicUrl;
}

async function handleCategoryFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Se încarcă...';

    // Upload category image if present
    const imageInput = form.querySelector('input[name="imageFile"]');
    if (imageInput.files.length > 0) {
      submitBtn.textContent = '⏳ Se încarcă imaginea...';
      const url = await uploadFileToR2(imageInput.files[0], 'categories');
      form.querySelector('input[name="imageUrl"]').value = url;
    }

    submitBtn.textContent = '⏳ Se salvează...';

    const formData = new FormData();
    formData.append('name', form.querySelector('input[name="name"]').value);
    formData.append('description', form.querySelector('textarea[name="description"]').value);
    formData.append('sortOrder', form.querySelector('input[name="sortOrder"]').value);
    formData.append('isActive', form.querySelector('input[name="isActive"]')?.checked ? 'on' : '');
    formData.append('imageUrl', form.querySelector('input[name="imageUrl"]').value);

    const response = await fetch(form.action, {
      method: 'POST',
      body: formData
    });

    if (response.redirected) {
      window.location.href = response.url;
    } else if (response.ok) {
      window.location.href = '/admin/categories?message=created';
    } else {
      throw new Error('Failed to save category');
    }
  } catch (error) {
    alert('Eroare: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}
`;

// New category form
app.get('/new', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  return c.html(
    <Layout title="Categorie nouă" isLoggedIn={true} currentPath="/admin/categories">
      <div class="header-actions">
        <div>
          <a href="/admin/categories" style={{ fontSize: '0.875rem' }}>← Înapoi la categorii</a>
          <h1 style={{ marginTop: '0.5rem' }}>Categorie nouă</h1>
        </div>
      </div>

      <article>
        <form id="categoryForm" method="post" action="/admin/categories/new" onsubmit="handleCategoryFormSubmit(event)">
          <input type="hidden" name="imageUrl" value="" />

          <label>
            Nume *
            <input type="text" name="name" required placeholder="Numele categoriei" />
          </label>

          <label>
            Descriere
            <textarea name="description" rows={3} placeholder="Descriere opțională"></textarea>
          </label>

          <div class="grid">
            <label>
              Ordine sortare
              <input type="number" name="sortOrder" value="0" min="0" />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
              <label>
                <input type="checkbox" name="isActive" checked />
                Activă
              </label>
            </div>
          </div>

          <label>
            Imagine categorie
            <input type="file" name="imageFile" accept="image/*" />
          </label>

          <div class="form-actions">
            <button type="submit">💾 Salvează</button>
            <a href="/admin/categories" role="button" class="secondary outline">Anulează</a>
          </div>
        </form>
      </article>

      <script dangerouslySetInnerHTML={{ __html: uploadScript }} />
    </Layout>
  );
});

// Create category
app.post('/new', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const formData = await c.req.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string || null;
  const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
  const isActive = formData.get('isActive') === 'on';
  const imageUrl = formData.get('imageUrl') as string || null;

  await db.productCategory.create({
    data: {
      name,
      description,
      sortOrder,
      isActive,
      imageUrl: imageUrl || null,
    },
  });

  return c.redirect('/admin/categories?message=created');
});

// Edit category form
app.get('/:id', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const category = await db.productCategory.findUnique({ where: { id } });

  if (!category) {
    return c.redirect('/admin/categories');
  }

  return c.html(
    <Layout title={`Editare ${category.name}`} isLoggedIn={true} currentPath="/admin/categories">
      <div class="header-actions">
        <div>
          <a href="/admin/categories" style={{ fontSize: '0.875rem' }}>← Înapoi la categorii</a>
          <h1 style={{ marginTop: '0.5rem' }}>Editare: {category.name}</h1>
        </div>
      </div>

      <article>
        <form id="categoryForm" method="post" action={`/admin/categories/${id}/update`} onsubmit="handleCategoryFormSubmit(event)">
          <input type="hidden" name="imageUrl" value={category.imageUrl || ''} />

          <label>
            Nume *
            <input type="text" name="name" required value={category.name} />
          </label>

          <label>
            Descriere
            <textarea name="description" rows={3}>{category.description || ''}</textarea>
          </label>

          <div class="grid">
            <label>
              Ordine sortare
              <input type="number" name="sortOrder" value={category.sortOrder} min="0" />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
              <label>
                <input type="checkbox" name="isActive" checked={category.isActive} />
                Activă
              </label>
            </div>
          </div>

          {category.imageUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Imagine curentă:</label>
              <div class="variant-grid">
                <div class="variant-card">
                  <img src={category.imageUrl} alt={category.name} />
                </div>
              </div>
            </div>
          )}

          <label>
            {category.imageUrl ? 'Înlocuiește imaginea (opțional)' : 'Imagine categorie'}
            <input type="file" name="imageFile" accept="image/*" />
          </label>

          <div class="form-actions">
            <button type="submit">💾 Salvează</button>
            <a href="/admin/categories" role="button" class="secondary outline">Anulează</a>
          </div>
        </form>
      </article>

      <script dangerouslySetInnerHTML={{ __html: uploadScript }} />
    </Layout>
  );
});

// Update category
app.post('/:id/update', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const formData = await c.req.formData();

  const category = await db.productCategory.findUnique({ where: { id } });
  if (!category) {
    return c.redirect('/admin/categories');
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string || null;
  const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
  const isActive = formData.get('isActive') === 'on';
  const newImageUrl = formData.get('imageUrl') as string;

  // Use new URL if provided, otherwise keep existing
  const imageUrl = newImageUrl || category.imageUrl;

  await db.productCategory.update({
    where: { id },
    data: {
      name,
      description,
      sortOrder,
      isActive,
      imageUrl,
    },
  });

  return c.redirect('/admin/categories?message=updated');
});

// Delete category
app.post('/:id/delete', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  await db.productCategory.delete({ where: { id } });

  return c.redirect('/admin/categories?message=deleted');
});

export default app;

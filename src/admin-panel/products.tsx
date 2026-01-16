import { Hono } from 'hono';
import { Layout, Alert, Pagination } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';
import { formatPrice } from '../lib/utils.js';

const app = new Hono();

// Products list
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const category = c.req.query('category') || '';
  const message = c.req.query('message');

  const where: any = {};
  if (category) {
    where.category = category;
  }

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
    db.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.html(
    <Layout title="Produse" isLoggedIn={true} currentPath="/admin/products">
      <div class="header-actions">
        <h1>🏷️ Produse</h1>
        <a href="/admin/products/new" role="button">
          + Adaugă produs
        </a>
      </div>

      {message === 'created' && (
        <Alert type="success" message="Produsul a fost creat cu succes!" />
      )}
      {message === 'updated' && (
        <Alert type="success" message="Produsul a fost actualizat cu succes!" />
      )}
      {message === 'deleted' && (
        <Alert type="success" message="Produsul a fost șters cu succes!" />
      )}

      <form method="get" action="/admin/products">
        <div class="search-filters">
          <select name="category" style={{ flex: 1 }}>
            <option value="">Toate categoriile</option>
            {categories.map((cat) => (
              <option value={cat.category || ''} selected={category === cat.category}>
                {cat.category}
              </option>
            ))}
          </select>
          <button type="submit">🔍 Filtrează</button>
        </div>
      </form>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Imagine</th>
              <th>Nume</th>
              <th>Categorie</th>
              <th>Preț</th>
              <th>Ordine</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const imageUrls = product.imageUrls as string[];
              return (
                <tr>
                  <td>
                    {imageUrls && imageUrls[0] && (
                      <img
                        src={imageUrls[0]}
                        alt={product.name}
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem' }}
                      />
                    )}
                  </td>
                  <td>
                    <strong>{product.name}</strong>
                    {product.description && (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--pico-muted-color)' }}>
                        {product.description.substring(0, 50)}...
                      </p>
                    )}
                  </td>
                  <td>{product.category || '-'}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.sortOrder}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ color: product.isActive ? 'green' : 'red', fontSize: '0.875rem' }}>
                        {product.isActive ? '✓ Activ' : '✗ Inactiv'}
                      </span>
                      {product.isFeatured && (
                        <span style={{ color: 'var(--pico-primary)', fontSize: '0.875rem' }}>
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td class="actions-cell">
                    <a href={`/admin/products/${product.id}`} role="button" class="outline secondary">
                      Editează
                    </a>
                    <form method="post" action={`/admin/products/${product.id}/delete`} style={{ display: 'inline' }}>
                      <button type="submit" class="outline secondary" style={{ color: 'var(--pico-del-color)' }}
                              onclick="return confirm('Ești sigur că vrei să ștergi acest produs?')">
                        Șterge
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colspan={7} style={{ textAlign: 'center', color: 'var(--pico-muted-color)' }}>
                  Nu există produse
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} baseUrl="/admin/products" />
    </Layout>
  );
});

// New product form
app.get('/new', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  return c.html(
    <Layout title="Produs nou" isLoggedIn={true} currentPath="/admin/products">
      <div class="header-actions">
        <div>
          <a href="/admin/products" style={{ fontSize: '0.875rem' }}>← Înapoi la produse</a>
          <h1 style={{ marginTop: '0.5rem' }}>Produs nou</h1>
        </div>
      </div>

      <article>
        <form method="post" action="/admin/products/new" enctype="multipart/form-data">
          <label>
            Nume *
            <input type="text" name="name" required placeholder="Numele produsului" />
          </label>

          <label>
            Descriere
            <textarea name="description" rows={3} placeholder="Descriere opțională"></textarea>
          </label>

          <div class="grid">
            <label>
              Preț (RON) *
              <input type="number" name="price" required step="0.01" min="0" placeholder="0.00" />
            </label>

            <label>
              Categorie
              <input type="text" name="category" placeholder="Ex: Figurine, Cadouri" />
            </label>
          </div>

          <div class="grid">
            <label>
              Ordine sortare
              <input type="number" name="sortOrder" value="0" min="0" />
            </label>

            <div>
              <label>
                <input type="checkbox" name="isActive" checked />
                Activ
              </label>
              <label>
                <input type="checkbox" name="isFeatured" />
                Featured
              </label>
            </div>
          </div>

          <label>
            Fișier model 3D (opțional)
            <input type="file" name="modelFile" accept=".stl,.obj,.gltf,.glb,.3mf,.step,.stp" />
            <small>Formate acceptate: STL, OBJ, GLTF, GLB, 3MF, STEP</small>
          </label>

          <label>
            Preview model (opțional)
            <input type="file" name="modelPreviewFile" accept="image/*" />
            <small>Imagine preview pentru modelul 3D</small>
          </label>

          <label>
            Imagini produs *
            <input type="file" name="images" accept="image/*" multiple required />
          </label>

          <div class="form-actions">
            <button type="submit">💾 Salvează</button>
            <a href="/admin/products" role="button" class="secondary outline">Anulează</a>
          </div>
        </form>
      </article>
    </Layout>
  );
});

// Create product
app.post('/new', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const formData = await c.req.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string || null;
  const price = parseFloat(formData.get('price') as string);
  const category = formData.get('category') as string || null;
  const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
  const isActive = formData.get('isActive') === 'on';
  const isFeatured = formData.get('isFeatured') === 'on';
  const modelFile = formData.get('modelFile');
  const modelPreviewFile = formData.get('modelPreviewFile');
  const images = formData.getAll('images');

  const { uploadFile } = await import('../lib/storage.js');
  const { isValidImageType, isValidFileSize, isValid3DModelType } = await import('../lib/utils.js');

  // Upload 3D model file if provided
  let modelUrl: string | null = null;
  if (modelFile instanceof File && modelFile.size > 0) {
    if (isValid3DModelType(modelFile.name) && isValidFileSize(modelFile.size)) {
      modelUrl = await uploadFile(modelFile, 'models');
    }
  }

  // Upload model preview image if provided
  let modelPreviewUrl: string | null = null;
  if (modelPreviewFile instanceof File && modelPreviewFile.size > 0) {
    if (isValidImageType(modelPreviewFile.type) && isValidFileSize(modelPreviewFile.size)) {
      modelPreviewUrl = await uploadFile(modelPreviewFile, 'models');
    }
  }

  // Upload product images
  const imageUrls: string[] = [];
  for (const image of images) {
    if (!(image instanceof File)) continue;
    if (!isValidImageType(image.type)) continue;
    if (!isValidFileSize(image.size)) continue;

    const url = await uploadFile(image, 'products');
    imageUrls.push(url);
  }

  await db.product.create({
    data: {
      name,
      description,
      price,
      category,
      sortOrder,
      isActive,
      isFeatured,
      modelUrl,
      modelPreviewUrl,
      imageUrls,
    },
  });

  return c.redirect('/admin/products?message=created');
});

// Edit product form
app.get('/:id', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const product = await db.product.findUnique({ where: { id } });

  if (!product) {
    return c.redirect('/admin/products');
  }

  const imageUrls = product.imageUrls as string[];

  return c.html(
    <Layout title={`Editare ${product.name}`} isLoggedIn={true} currentPath="/admin/products">
      <div class="header-actions">
        <div>
          <a href="/admin/products" style={{ fontSize: '0.875rem' }}>← Înapoi la produse</a>
          <h1 style={{ marginTop: '0.5rem' }}>Editare: {product.name}</h1>
        </div>
      </div>

      <article>
        <form method="post" action={`/admin/products/${id}/update`} enctype="multipart/form-data">
          <label>
            Nume *
            <input type="text" name="name" required value={product.name} />
          </label>

          <label>
            Descriere
            <textarea name="description" rows={3}>{product.description || ''}</textarea>
          </label>

          <div class="grid">
            <label>
              Preț (RON) *
              <input type="number" name="price" required step="0.01" min="0" value={Number(product.price)} />
            </label>

            <label>
              Categorie
              <input type="text" name="category" value={product.category || ''} />
            </label>
          </div>

          <div class="grid">
            <label>
              Ordine sortare
              <input type="number" name="sortOrder" value={product.sortOrder} min="0" />
            </label>

            <div>
              <label>
                <input type="checkbox" name="isActive" checked={product.isActive} />
                Activ
              </label>
              <label>
                <input type="checkbox" name="isFeatured" checked={product.isFeatured} />
                Featured
              </label>
            </div>
          </div>

          {product.modelUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Model 3D curent:</label>
              <div style={{ padding: '0.5rem', background: 'var(--card-background-color)', borderRadius: '0.25rem' }}>
                <a href={product.modelUrl} target="_blank" rel="noopener">📦 {product.modelUrl.split('/').pop()}</a>
              </div>
            </div>
          )}

          <label>
            {product.modelUrl ? 'Înlocuiește model 3D (opțional)' : 'Fișier model 3D (opțional)'}
            <input type="file" name="modelFile" accept=".stl,.obj,.gltf,.glb,.3mf,.step,.stp" />
            <small>Formate acceptate: STL, OBJ, GLTF, GLB, 3MF, STEP</small>
          </label>

          {product.modelPreviewUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Preview model curent:</label>
              <div class="variant-grid">
                <div class="variant-card">
                  <img src={product.modelPreviewUrl} alt="Preview model" />
                </div>
              </div>
            </div>
          )}

          <label>
            {product.modelPreviewUrl ? 'Înlocuiește preview model (opțional)' : 'Preview model (opțional)'}
            <input type="file" name="modelPreviewFile" accept="image/*" />
            <small>Imagine preview pentru modelul 3D</small>
          </label>

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
            <a href="/admin/products" role="button" class="secondary outline">Anulează</a>
          </div>
        </form>
      </article>
    </Layout>
  );
});

// Update product
app.post('/:id/update', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');
  const formData = await c.req.formData();

  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    return c.redirect('/admin/products');
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string || null;
  const price = parseFloat(formData.get('price') as string);
  const category = formData.get('category') as string || null;
  const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
  const isActive = formData.get('isActive') === 'on';
  const isFeatured = formData.get('isFeatured') === 'on';
  const modelFile = formData.get('modelFile');
  const modelPreviewFile = formData.get('modelPreviewFile');
  const images = formData.getAll('images');

  const { uploadFile } = await import('../lib/storage.js');
  const { isValidImageType, isValidFileSize, isValid3DModelType } = await import('../lib/utils.js');

  // Upload new 3D model file if provided, otherwise keep existing
  let modelUrl = product.modelUrl;
  if (modelFile instanceof File && modelFile.size > 0) {
    if (isValid3DModelType(modelFile.name) && isValidFileSize(modelFile.size)) {
      modelUrl = await uploadFile(modelFile, 'models');
    }
  }

  // Upload new model preview image if provided, otherwise keep existing
  let modelPreviewUrl = product.modelPreviewUrl;
  if (modelPreviewFile instanceof File && modelPreviewFile.size > 0) {
    if (isValidImageType(modelPreviewFile.type) && isValidFileSize(modelPreviewFile.size)) {
      modelPreviewUrl = await uploadFile(modelPreviewFile, 'models');
    }
  }

  let imageUrls = product.imageUrls as string[];

  // Add new images if uploaded
  if (images.length > 0 && images[0] instanceof File && (images[0] as File).size > 0) {
    for (const image of images) {
      if (!(image instanceof File)) continue;
      if (!isValidImageType(image.type)) continue;
      if (!isValidFileSize(image.size)) continue;

      const url = await uploadFile(image, 'products');
      imageUrls.push(url);
    }
  }

  await db.product.update({
    where: { id },
    data: {
      name,
      description,
      price,
      category,
      sortOrder,
      isActive,
      isFeatured,
      modelUrl,
      modelPreviewUrl,
      imageUrls,
    },
  });

  return c.redirect('/admin/products?message=updated');
});

// Delete product
app.post('/:id/delete', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const id = c.req.param('id');

  await db.product.delete({ where: { id } });

  return c.redirect('/admin/products?message=deleted');
});

export default app;

import { Hono } from 'hono';
import { Layout, Alert } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { listFiles, deleteFile, R2File } from '../lib/storage.js';

const app = new Hono();

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

function isModelFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['stl', 'obj', 'gltf', 'glb', '3mf', 'step', 'stp'].includes(ext);
}

// Files list
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const tab = c.req.query('tab') || 'models';
  const message = c.req.query('message');

  // Fetch files from different folders based on tab
  let files: R2File[] = [];

  if (tab === 'models') {
    files = await listFiles('models');
  } else {
    // Pictures: fetch from multiple folders
    const [products, variants, uploads, examples] = await Promise.all([
      listFiles('products'),
      listFiles('variants'),
      listFiles('uploads'),
      listFiles('examples'),
    ]);
    files = [...products, ...variants, ...uploads, ...examples];
  }

  // Sort by last modified (newest first)
  files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  return c.html(
    <Layout title="Fișiere R2" isLoggedIn={true} currentPath="/admin/files">
      <div class="header-actions">
        <h1>📁 Fișiere R2</h1>
      </div>

      {message === 'deleted' && (
        <Alert type="success" message="Fișierul a fost șters cu succes!" />
      )}
      {message === 'error' && (
        <Alert type="error" message="Eroare la ștergerea fișierului." />
      )}

      <div class="tabs" style={{ marginBottom: '1.5rem' }}>
        <a
          href="/admin/files?tab=models"
          role="button"
          class={tab === 'models' ? '' : 'outline secondary'}
          style={{ marginRight: '0.5rem' }}
        >
          📦 Modele 3D ({tab === 'models' ? files.length : '...'})
        </a>
        <a
          href="/admin/files?tab=pictures"
          role="button"
          class={tab === 'pictures' ? '' : 'outline secondary'}
        >
          🖼️ Imagini ({tab === 'pictures' ? files.length : '...'})
        </a>
      </div>

      <article>
        <p style={{ color: 'var(--pico-muted-color)', marginBottom: '1rem' }}>
          {tab === 'models'
            ? 'Fișiere 3D din folderul models/ (STL, OBJ, GLTF, etc.)'
            : 'Imagini din folderele products/, variants/, uploads/, examples/'}
        </p>

        {files.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--pico-muted-color)', padding: '2rem' }}>
            Nu există fișiere în această secțiune.
          </p>
        ) : tab === 'pictures' ? (
          <div class="files-grid">
            {files.map((file) => (
              <div class="file-card">
                {isImageFile(file.filename) ? (
                  <a href={file.url} target="_blank" rel="noopener">
                    <img src={file.url} alt={file.filename} class="file-preview" />
                  </a>
                ) : (
                  <div class="file-preview file-icon">📄</div>
                )}
                <div class="file-info">
                  <div class="file-name" title={file.filename}>
                    {file.filename.length > 25
                      ? file.filename.substring(0, 22) + '...'
                      : file.filename}
                  </div>
                  <div class="file-meta">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{formatDate(file.lastModified)}</span>
                  </div>
                  <div class="file-folder" title={file.key}>
                    {file.key.split('/')[0]}/
                  </div>
                  <div class="file-actions">
                    <a href={file.url} target="_blank" rel="noopener" role="button" class="outline secondary small">
                      Deschide
                    </a>
                    <form method="post" action="/admin/files/delete" style={{ display: 'inline' }}>
                      <input type="hidden" name="url" value={file.url} />
                      <input type="hidden" name="tab" value={tab} />
                      <button
                        type="submit"
                        class="outline secondary small"
                        style={{ color: 'var(--pico-del-color)' }}
                        onclick="return confirm('Ești sigur că vrei să ștergi acest fișier?')"
                      >
                        Șterge
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nume fișier</th>
                  <th>Dimensiune</th>
                  <th>Data</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📦</span>
                        <a href={file.url} target="_blank" rel="noopener" title={file.filename}>
                          {file.filename.length > 40
                            ? file.filename.substring(0, 37) + '...'
                            : file.filename}
                        </a>
                      </div>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{formatDate(file.lastModified)}</td>
                    <td class="actions-cell">
                      <a href={file.url} target="_blank" rel="noopener" role="button" class="outline secondary">
                        Descarcă
                      </a>
                      <form method="post" action="/admin/files/delete" style={{ display: 'inline' }}>
                        <input type="hidden" name="url" value={file.url} />
                        <input type="hidden" name="tab" value={tab} />
                        <button
                          type="submit"
                          class="outline secondary"
                          style={{ color: 'var(--pico-del-color)' }}
                          onclick="return confirm('Ești sigur că vrei să ștergi acest fișier?')"
                        >
                          Șterge
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <style>{`
        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .file-card {
          border: 1px solid var(--pico-muted-border-color);
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--pico-card-background-color);
        }
        .file-preview {
          width: 100%;
          height: 150px;
          object-fit: cover;
          display: block;
        }
        .file-preview.file-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          background: var(--pico-secondary-background);
        }
        .file-info {
          padding: 0.75rem;
        }
        .file-name {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          word-break: break-all;
        }
        .file-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--pico-muted-color);
          margin-bottom: 0.25rem;
        }
        .file-folder {
          font-size: 0.75rem;
          color: var(--pico-primary);
          margin-bottom: 0.5rem;
        }
        .file-actions {
          display: flex;
          gap: 0.5rem;
        }
        .file-actions a, .file-actions button {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          margin: 0;
        }
        .small {
          font-size: 0.75rem !important;
          padding: 0.25rem 0.5rem !important;
        }
      `}</style>
    </Layout>
  );
});

// Delete file
app.post('/delete', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const formData = await c.req.formData();
  const url = formData.get('url') as string;
  const tab = formData.get('tab') as string || 'models';

  try {
    await deleteFile(url);
    return c.redirect(`/admin/files?tab=${tab}&message=deleted`);
  } catch (error) {
    console.error('Error deleting file:', error);
    return c.redirect(`/admin/files?tab=${tab}&message=error`);
  }
});

export default app;

import type { FC } from 'hono/jsx';
import type { Child } from 'hono/jsx';

interface LayoutProps {
  title: string;
  children: Child;
  isLoggedIn?: boolean;
  currentPath?: string;
}

export const Layout: FC<LayoutProps> = ({ title, children, isLoggedIn = false, currentPath = '' }) => {
  return (
    <html lang="ro">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} - Print3D Admin</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
        <style>{`
          :root {
            --pico-font-size: 16px;
          }
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 250px;
            height: 100vh;
            background: var(--pico-card-background-color);
            border-right: 1px solid var(--pico-muted-border-color);
            padding: 1rem;
            overflow-y: auto;
          }
          .sidebar h2 {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            color: var(--pico-primary);
          }
          .sidebar nav ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .sidebar nav li {
            margin-bottom: 0.5rem;
          }
          .sidebar nav a {
            display: block;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            text-decoration: none;
            color: var(--pico-color);
            transition: background 0.2s;
          }
          .sidebar nav a:hover {
            background: var(--pico-secondary-background);
          }
          .sidebar nav a.active {
            background: var(--pico-primary-background);
            color: var(--pico-primary-inverse);
          }
          .main-content {
            margin-left: 250px;
            padding: 2rem;
            min-height: 100vh;
          }
          .login-page {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .login-card {
            max-width: 400px;
            width: 100%;
            padding: 2rem;
          }
          .stat-card {
            background: var(--pico-card-background-color);
            border: 1px solid var(--pico-muted-border-color);
            border-radius: 0.5rem;
            padding: 1.5rem;
            text-align: center;
          }
          .stat-card h3 {
            font-size: 2rem;
            margin: 0;
            color: var(--pico-primary);
          }
          .stat-card p {
            margin: 0.5rem 0 0;
            color: var(--pico-muted-color);
            font-size: 0.875rem;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-RECEIVED { background: #e3f2fd; color: #1565c0; }
          .status-MODELING { background: #fff3e0; color: #ef6c00; }
          .status-PENDING_APPROVAL { background: #fce4ec; color: #c2185b; }
          .status-APPROVED { background: #e8f5e9; color: #2e7d32; }
          .status-PAID { background: #e0f2f1; color: #00695c; }
          .status-PRINTING { background: #f3e5f5; color: #7b1fa2; }
          .status-SHIPPED { background: #e1f5fe; color: #0277bd; }
          .status-DELIVERED { background: #e8f5e9; color: #1b5e20; }
          .status-CANCELLED { background: #ffebee; color: #c62828; }
          .table-container {
            overflow-x: auto;
          }
          table {
            width: 100%;
          }
          .actions-cell {
            white-space: nowrap;
          }
          .actions-cell a, .actions-cell button {
            margin-right: 0.5rem;
            font-size: 0.875rem;
          }
          .alert {
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
          }
          .alert-success {
            background: #e8f5e9;
            color: #1b5e20;
            border: 1px solid #a5d6a7;
          }
          .alert-error {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ef9a9a;
          }
          .search-filters {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
          }
          .search-filters input, .search-filters select {
            margin-bottom: 0;
          }
          .pagination {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 1rem;
          }
          .pagination a, .pagination span {
            padding: 0.5rem 1rem;
            border: 1px solid var(--pico-muted-border-color);
            border-radius: 0.25rem;
            text-decoration: none;
          }
          .pagination a:hover {
            background: var(--pico-secondary-background);
          }
          .pagination .current {
            background: var(--pico-primary);
            color: var(--pico-primary-inverse);
          }
          .order-detail {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
          }
          @media (max-width: 768px) {
            .order-detail {
              grid-template-columns: 1fr;
            }
          }
          .detail-section {
            background: var(--pico-card-background-color);
            border: 1px solid var(--pico-muted-border-color);
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
          }
          .detail-section h3 {
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1rem;
            border-bottom: 1px solid var(--pico-muted-border-color);
            padding-bottom: 0.5rem;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--pico-muted-border-color);
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            color: var(--pico-muted-color);
          }
          .variant-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
          }
          .variant-card {
            border: 1px solid var(--pico-muted-border-color);
            border-radius: 0.5rem;
            overflow: hidden;
          }
          .variant-card img {
            width: 100%;
            height: 120px;
            object-fit: cover;
          }
          .variant-card .variant-info {
            padding: 0.5rem;
            font-size: 0.875rem;
          }
          .htmx-indicator {
            opacity: 0;
            transition: opacity 200ms ease-in;
          }
          .htmx-request .htmx-indicator, .htmx-request.htmx-indicator {
            opacity: 1;
          }
          .loading-spinner {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid var(--pico-muted-border-color);
            border-top-color: var(--pico-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
          }
          .image-preview {
            max-width: 300px;
            border-radius: 0.5rem;
            margin-top: 0.5rem;
          }
          .header-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }
          .header-actions h1 {
            margin: 0;
          }
        `}</style>
      </head>
      <body>
        {isLoggedIn ? (
          <>
            <aside class="sidebar">
              <h2>🖨️ Print3D Admin</h2>
              <nav>
                <ul>
                  <li>
                    <a href="/admin" class={currentPath === '/admin' ? 'active' : ''}>
                      📊 Dashboard
                    </a>
                  </li>
                  <li>
                    <a href="/admin/orders" class={currentPath.startsWith('/admin/orders') ? 'active' : ''}>
                      📦 Comenzi
                    </a>
                  </li>
                  <li>
                    <a href="/admin/products" class={currentPath.startsWith('/admin/products') ? 'active' : ''}>
                      🏷️ Produse
                    </a>
                  </li>
                  <li>
                    <a href="/admin/examples" class={currentPath.startsWith('/admin/examples') ? 'active' : ''}>
                      🖼️ Exemple
                    </a>
                  </li>
                </ul>
              </nav>
              <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                <a href="/admin/logout" style={{ color: 'var(--pico-muted-color)', fontSize: '0.875rem' }}>
                  🚪 Deconectare
                </a>
              </div>
            </aside>
            <main class="main-content">
              {children}
            </main>
          </>
        ) : (
          <main class="login-page">
            {children}
          </main>
        )}
      </body>
    </html>
  );
};

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const labels: Record<string, string> = {
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
  return (
    <span class={`status-badge status-${status}`}>
      {labels[status] || status}
    </span>
  );
};

export const Alert: FC<{ type: 'success' | 'error'; message: string }> = ({ type, message }) => {
  return (
    <div class={`alert alert-${type}`}>
      {message}
    </div>
  );
};

export const Pagination: FC<{ page: number; totalPages: number; baseUrl: string }> = ({
  page,
  totalPages,
  baseUrl
}) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div class="pagination">
      {page > 1 && (
        <a href={`${baseUrl}?page=${page - 1}`}>← Anterior</a>
      )}
      {pages.map((p) => (
        p === page ? (
          <span class="current">{p}</span>
        ) : (
          <a href={`${baseUrl}?page=${p}`}>{p}</a>
        )
      ))}
      {page < totalPages && (
        <a href={`${baseUrl}?page=${page + 1}`}>Următor →</a>
      )}
    </div>
  );
};

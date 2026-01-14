# Print3D.ro API

Backend API pentru serviciul de cadouri personalizate printate 3D.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Hono cu `@hono/zod-openapi`
- **Database:** PostgreSQL cu Prisma ORM
- **Storage:** Cloudflare R2 (S3-compatible)
- **Payments:** Stripe
- **Email:** Resend
- **Documentație:** OpenAPI 3.1 auto-generată

## Quick Start

### 1. Instalare dependențe

```bash
npm install
```

### 2. Configurare environment

Copiază `.env.example` în `.env` și completează valorile:

```bash
cp .env.example .env
```

### 3. Setup bază de date

```bash
# Generează clientul Prisma
npm run db:generate

# Aplică migrările
npm run db:migrate

# Opțional: populează cu date de test
npm run db:seed
```

### 4. Pornire server

```bash
# Development (cu hot reload)
npm run dev

# Production
npm run build
npm start
```

## Endpoints

### Documentație

- **Swagger UI:** `http://localhost:3001/docs`
- **OpenAPI JSON:** `http://localhost:3001/openapi.json`
- **Health Check:** `http://localhost:3001/health`

### Public API

| Metodă | Rută | Descriere |
|--------|------|-----------|
| `POST` | `/api/orders` | Creare comandă nouă |
| `GET` | `/api/orders/{id}` | Detalii comandă |
| `POST` | `/api/orders/{id}/select-variant` | Selectare variantă preferată |
| `POST` | `/api/orders/{id}/checkout` | Creare sesiune Stripe |
| `GET` | `/api/orders/{id}/payment-status` | Verificare status plată |
| `POST` | `/api/orders/{id}/review` | Trimitere review |
| `POST` | `/api/upload` | Upload imagine |
| `GET` | `/api/examples` | Listă exemple publice |
| `POST` | `/api/contact` | Trimitere mesaj contact |
| `POST` | `/api/webhooks/stripe` | Webhook Stripe |

### Admin API (necesită autentificare)

| Metodă | Rută | Descriere |
|--------|------|-----------|
| `POST` | `/api/admin/auth/login` | Login admin |
| `POST` | `/api/admin/auth/logout` | Logout admin |
| `GET` | `/api/admin/auth/me` | Date admin curent |
| `GET` | `/api/admin/orders` | Listă comenzi (cu filtre, paginare) |
| `GET` | `/api/admin/orders/{id}` | Detalii complete comandă |
| `PATCH` | `/api/admin/orders/{id}` | Update comandă |
| `POST` | `/api/admin/orders/{id}/variants` | Upload variante model |
| `DELETE` | `/api/admin/orders/{id}/variants/{variantId}` | Șterge variantă |
| `POST` | `/api/admin/orders/{id}/send-approval-email` | Trimite email aprobare |
| `POST` | `/api/admin/orders/{id}/send-shipping-email` | Trimite email tracking |
| `POST` | `/api/admin/orders/{id}/send-review-email` | Trimite email review |
| `GET` | `/api/admin/examples` | Listă toate exemplele |
| `POST` | `/api/admin/examples` | Adaugă exemplu |
| `GET` | `/api/admin/examples/{id}` | Detalii exemplu |
| `PATCH` | `/api/admin/examples/{id}` | Editează exemplu |
| `DELETE` | `/api/admin/examples/{id}` | Șterge exemplu |
| `GET` | `/api/admin/stats` | Statistici dashboard |

## Autentificare Admin

Rutele admin necesită un header `Authorization` cu token JWT:

```
Authorization: Bearer <token>
```

Pentru a obține un token, folosește endpoint-ul de login:

```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@print3d.ro", "password": "admin123"}'
```

## Flow Comandă

1. **Clientul creează comanda** (`POST /api/orders`) cu imagine și date contact
2. **Admin primește notificare** și începe modelarea
3. **Admin uploadează variante** (`POST /api/admin/orders/{id}/variants`)
4. **Admin trimite email aprobare** (`POST /api/admin/orders/{id}/send-approval-email`)
5. **Clientul selectează varianta** (`POST /api/orders/{id}/select-variant`)
6. **Clientul plătește** (`POST /api/orders/{id}/checkout` → Stripe)
7. **Stripe webhook confirmă plata** (`POST /api/webhooks/stripe`)
8. **Admin printează și expediază**
9. **Admin trimite tracking** (`POST /api/admin/orders/{id}/send-shipping-email`)
10. **Clientul primește și lasă review** (`POST /api/orders/{id}/review`)

## Structura Proiect

```
/src
├── index.ts              # Entry point
├── app.ts                # Hono app setup
├── routes/               # API routes
│   ├── orders.ts         # Public orders endpoints
│   ├── orders.schemas.ts # Zod schemas pentru orders
│   ├── upload.ts         # File upload
│   ├── examples.ts       # Public examples
│   ├── contact.ts        # Contact form
│   ├── webhooks.ts       # Stripe webhooks
│   └── admin/            # Admin routes
├── lib/                  # Helpers
│   ├── db.ts             # Prisma client
│   ├── storage.ts        # R2 helpers
│   ├── email.ts          # Resend helpers
│   ├── stripe.ts         # Stripe helpers
│   ├── auth.ts           # JWT helpers
│   └── utils.ts          # Utility functions
├── middleware/           # Middleware
│   ├── auth.ts           # Admin authentication
│   └── error.ts          # Error handler
├── schemas/              # Shared Zod schemas
└── types/                # TypeScript types
```

## Environment Variables

| Variabilă | Descriere |
|-----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT` | R2 endpoint URL |
| `R2_PUBLIC_URL` | Public URL pentru fișiere |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `RESEND_API_KEY` | Resend API key |
| `JWT_SECRET` | Secret pentru JWT (min 32 chars) |
| `APP_URL` | URL-ul frontend-ului |
| `PORT` | Port server (default: 3001) |

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run db:generate # Generate Prisma client
npm run db:migrate  # Run database migrations
npm run db:push     # Push schema to database
npm run db:seed     # Seed database with test data
```

## License

Proprietar - Print3D.ro

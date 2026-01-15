# Plan de Dezvoltare - Print3D API

## Status Actual

### DONE - Structură și Configurare
- [x] Structura de foldere creată
- [x] package.json cu toate dependențele
- [x] tsconfig.json configurat pentru ESM
- [x] .env.example cu toate variabilele necesare
- [x] .gitignore configurat
- [x] README.md cu documentație completă

### DONE - Baza de Date
- [x] Prisma schema definit (Order, ModelVariant, Review, Example, AdminUser)
- [x] Conexiune testată și funcțională
- [x] Seed data pentru development (admin, exemple, comenzi test)

### DONE - Helpers (src/lib/)
- [x] db.ts - Prisma client singleton
- [x] storage.ts - Upload/delete R2 (S3-compatible)
- [x] email.ts - Toate template-urile Resend (6 tipuri de email)
- [x] stripe.ts - Checkout session, webhook handler
- [x] auth.ts - JWT create/verify, bcrypt hash/compare
- [x] utils.ts - generateOrderNumber, calculateShippingCost, etc.

### DONE - Middleware
- [x] auth.ts - Admin authentication middleware
- [x] error.ts - Global error handler

### DONE - Schemas (src/schemas/)
- [x] common.ts - ErrorSchema, SuccessSchema, PaginationSchema, etc.
- [x] enums.ts - OrderStatus, ShippingMethod

### DONE - Rute Publice (src/routes/)
- [x] orders.ts + orders.schemas.ts - CRUD comenzi, select-variant, checkout, review
- [x] upload.ts - File upload
- [x] examples.ts - Listă exemple publice
- [x] contact.ts - Formular contact
- [x] webhooks.ts - Stripe webhook

### DONE - Rute Admin (src/routes/admin/)
- [x] auth.ts - Login/logout/me
- [x] orders.ts - Listă, detalii, update, upload variants, email triggers
- [x] examples.ts - CRUD examples
- [x] stats.ts - Dashboard statistics
- [x] index.ts - Agregare rute admin

### DONE - App Principal
- [x] app.ts - Hono setup, middleware, routes, OpenAPI config
- [x] index.ts - Entry point cu server

---

## DONE - Erori TypeScript Corectate

### 1. src/lib/auth.ts - JWT Payload Type ✅
- Adăugat index signature `[key: string]: unknown` la JWTPayload
- Adăugat al treilea argument 'HS256' la sign() și verify()

### 2. src/middleware/auth.ts ✅
- Adăugat `return` la `await next()`

### 3. src/routes/admin/stats.ts ✅
- Eliminat importul nefolosit ErrorSchema

---

## TO DO - Configurare Servicii Externe

### 1. Cloudflare R2 Storage
- [ ] Creează bucket R2 în Cloudflare dashboard
- [ ] Generează API credentials (Access Key ID + Secret)
- [ ] Configurează public access pentru CDN
- [ ] Actualizează .env cu valorile reale

### 2. Stripe
- [ ] Creează cont Stripe sau folosește test mode
- [ ] Obține Secret Key din dashboard
- [ ] Configurează webhook endpoint în Stripe
- [ ] Obține Webhook Secret
- [ ] Actualizează .env

### 3. Resend (Email)
- [ ] Creează cont Resend
- [ ] Verifică domeniul print3d.ro
- [ ] Obține API Key
- [ ] Actualizează .env

### 4. PostgreSQL (Production)
- [ ] Setup PostgreSQL hosted (ex: Neon, Supabase, Railway)
- [ ] Actualizează DATABASE_URL pentru production

---

## TO DO - Testare

### Testare Manuală via Swagger UI
- [ ] GET /health
- [ ] POST /api/orders (creare comandă)
- [ ] GET /api/orders/{id}
- [ ] POST /api/upload (upload imagine)
- [ ] GET /api/examples
- [ ] POST /api/contact
- [ ] POST /api/admin/auth/login
- [ ] GET /api/admin/orders
- [ ] PATCH /api/admin/orders/{id}
- [ ] POST /api/admin/orders/{id}/variants
- [ ] GET /api/admin/stats

### Testare Flow Complet
- [ ] Flow complet de comandă: creare → modeling → approve → pay → ship → deliver → review


### Pași Deploy
- [x] Fix toate erorile TypeScript
- [ ] Build production: `npm run build`
- [ ] Setup environment variables pe hosting
- [ ] Deploy și verifică logs
- [ ] Testare endpoints în production
- [ ] Configurare domeniu custom (api.print3d.ro)

---

## Ordine Recomandată

1. **Fix TypeScript errors** (10-15 min)
2. **Test local cu Swagger UI** (15 min)
3. **Setup Stripe test mode** (15 min)
4. **Setup Resend** (10 min)
5. **Setup R2** (15 min)
6. **Test full flow local** (30 min)
7. **Deploy** (30 min)

---

## Notițe

- Serverul pornește pe PORT 3001 (sau din .env)
- Admin default: `admin@print3d.ro` / `admin123`
- Swagger UI: http://localhost:3001/docs
- OpenAPI JSON: http://localhost:3001/openapi.json

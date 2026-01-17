import { Hono } from 'hono';
import { Layout, Alert } from './layout.js';
import { checkAdminAuth } from './auth.js';
import { db } from '../lib/db.js';

const app = new Hono();

// Settings page
app.get('/', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const message = c.req.query('message');

  // Get or create company settings
  let settings = await db.companySettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await db.companySettings.create({
      data: { id: 'default' },
    });
  }

  return c.html(
    <Layout title="Setari Companie" isLoggedIn={true} currentPath="/admin/settings">
      <div class="header-actions">
        <h1>Setari Companie</h1>
      </div>

      {message === 'updated' && (
        <Alert type="success" message="Datele companiei au fost actualizate cu succes!" />
      )}

      <article>
        <p style={{ color: 'var(--pico-muted-color)', marginBottom: '1.5rem' }}>
          Aceste date vor fi utilizate pentru generarea facturilor.
        </p>

        <form method="post" action="/admin/settings/update">
          <fieldset>
            <legend>Date Identificare</legend>

            <label>
              Denumire Companie *
              <input type="text" name="name" required value={settings.name} placeholder="S.C. Exemplu S.R.L." />
            </label>

            <div class="grid">
              <label>
                CUI (Cod Unic de Identificare) *
                <input type="text" name="cui" required value={settings.cui} placeholder="RO12345678" />
              </label>

              <label>
                Nr. Registrul Comertului *
                <input type="text" name="regCom" required value={settings.regCom} placeholder="J12/1234/2024" />
              </label>
            </div>

            <label>
              Capital Social
              <input type="text" name="capitalSocial" value={settings.capitalSocial} placeholder="200 RON" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Adresa Sediu Social</legend>

            <label>
              Adresa (strada, numar) *
              <input type="text" name="address" required value={settings.address} placeholder="Str. Exemplu nr. 10" />
            </label>

            <div class="grid">
              <label>
                Oras *
                <input type="text" name="city" required value={settings.city} placeholder="Cluj-Napoca" />
              </label>

              <label>
                Judet *
                <input type="text" name="county" required value={settings.county} placeholder="Cluj" />
              </label>
            </div>

            <div class="grid">
              <label>
                Cod Postal *
                <input type="text" name="postalCode" required value={settings.postalCode} placeholder="400001" />
              </label>

              <label>
                Tara
                <input type="text" name="country" value={settings.country} placeholder="Romania" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Date Bancare</legend>

            <div class="grid">
              <label>
                Nume Banca *
                <input type="text" name="bankName" required value={settings.bankName} placeholder="Banca Transilvania" />
              </label>

              <label>
                IBAN *
                <input type="text" name="iban" required value={settings.iban} placeholder="RO49AAAA1B31007593840000" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Contact</legend>

            <div class="grid">
              <label>
                Email *
                <input type="email" name="email" required value={settings.email} placeholder="contact@exemplu.ro" />
              </label>

              <label>
                Telefon *
                <input type="tel" name="phone" required value={settings.phone} placeholder="+40 123 456 789" />
              </label>
            </div>
          </fieldset>

          <div class="form-actions">
            <button type="submit">Salveaza Modificarile</button>
          </div>
        </form>
      </article>
    </Layout>
  );
});

// Update settings
app.post('/update', async (c) => {
  const { isLoggedIn } = await checkAdminAuth(c);
  if (!isLoggedIn) {
    return c.redirect('/admin/login');
  }

  const formData = await c.req.formData();

  const data = {
    name: formData.get('name') as string,
    cui: formData.get('cui') as string,
    regCom: formData.get('regCom') as string,
    capitalSocial: formData.get('capitalSocial') as string || '200 RON',
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    county: formData.get('county') as string,
    postalCode: formData.get('postalCode') as string,
    country: formData.get('country') as string || 'Romania',
    bankName: formData.get('bankName') as string,
    iban: formData.get('iban') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
  };

  await db.companySettings.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data },
  });

  return c.redirect('/admin/settings?message=updated');
});

export default app;

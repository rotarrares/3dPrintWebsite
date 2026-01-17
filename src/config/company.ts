import { db } from '../lib/db.js';

export interface CompanyInfo {
  name: string;
  cui: string;
  regCom: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  bankName: string;
  iban: string;
  capitalSocial: string;
  email: string;
  phone: string;
}

// Default company info (fallback when database is not available)
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: process.env.COMPANY_NAME || 'Print3D S.R.L.',
  cui: process.env.COMPANY_CUI || 'RO12345678',
  regCom: process.env.COMPANY_REG_COM || 'J12/1234/2024',
  address: process.env.COMPANY_ADDRESS || 'Str. Exemplu nr. 10',
  city: process.env.COMPANY_CITY || 'Cluj-Napoca',
  county: process.env.COMPANY_COUNTY || 'Cluj',
  postalCode: process.env.COMPANY_POSTAL_CODE || '400001',
  country: 'Romania',
  bankName: process.env.COMPANY_BANK || 'Banca Transilvania',
  iban: process.env.COMPANY_IBAN || 'RO49AAAA1B31007593840000',
  capitalSocial: process.env.COMPANY_CAPITAL || '200 RON',
  email: process.env.COMPANY_EMAIL || 'contact@print3d.ro',
  phone: process.env.COMPANY_PHONE || '+40 123 456 789',
};

// Legacy export for backwards compatibility
export const COMPANY_INFO = DEFAULT_COMPANY_INFO;

/**
 * Get company info from database (preferred) or fall back to defaults
 */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  try {
    const settings = await db.companySettings.findUnique({
      where: { id: 'default' },
    });

    if (settings) {
      return {
        name: settings.name,
        cui: settings.cui,
        regCom: settings.regCom,
        address: settings.address,
        city: settings.city,
        county: settings.county,
        postalCode: settings.postalCode,
        country: settings.country,
        bankName: settings.bankName,
        iban: settings.iban,
        capitalSocial: settings.capitalSocial,
        email: settings.email,
        phone: settings.phone,
      };
    }
  } catch {
    // Database not available, use defaults
  }

  return DEFAULT_COMPANY_INFO;
}

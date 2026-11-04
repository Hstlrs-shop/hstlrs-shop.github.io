'use strict';
const path = require('node:path');

try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch { /* sin .env */ }

const env = process.env;
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

const config = {
  port: num(env.PORT, 3000),
  appUrl: (env.APP_URL || `http://localhost:${num(env.PORT, 3000)}`).replace(/\/$/, ''),
  production: env.NODE_ENV === 'production',
  dataDir: env.DATA_DIR || path.join(__dirname, '..', 'data'),
  trialDays: num(env.TRIAL_DAYS, 14),
  graceDays: num(env.GRACE_DAYS, 7),
  currency: env.CURRENCY || 'ARS',
  contactEmail: env.CONTACT_EMAIL || '',
  adminEmails: (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  mp: {
    accessToken: env.MP_ACCESS_TOKEN || '',
    webhookSecret: env.MP_WEBHOOK_SECRET || '',
  },
  prices: {
    basico: num(env.PRICE_BASICO, 29000),
    profesional: num(env.PRICE_PROFESIONAL, 49000),
    red: num(env.PRICE_RED, 89000),
  },
};
config.secureCookies = config.appUrl.startsWith('https://');
// Sin token de Mercado Pago y fuera de producción, el pago se simula para poder probar.
config.devBilling = !config.mp.accessToken && !config.production;

module.exports = config;

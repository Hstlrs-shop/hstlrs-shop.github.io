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
  currency: env.CURRENCY || 'MXN',
  contactEmail: env.CONTACT_EMAIL || '',
  // Número de WhatsApp de ventas/soporte en formato internacional, sin signos: 524421234567
  whatsapp: (env.WHATSAPP || '').replace(/\D/g, ''),
  adminEmails: (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  mp: {
    accessToken: env.MP_ACCESS_TOKEN || '',
    webhookSecret: env.MP_WEBHOOK_SECRET || '',
  },
  ai: {
    // El SDK de Anthropic lee la clave de ANTHROPIC_API_KEY.
    enabled: Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN) && env.AI_ENABLED !== 'false',
    effort: ['low', 'medium', 'high'].includes(env.AI_EFFORT) ? env.AI_EFFORT : 'low',
    trialMessages: num(env.AI_TRIAL_MESSAGES, 50),
    perMinute: num(env.AI_PER_MINUTE, 8),
  },
  aiMessages: {
    basico: num(env.AI_MESSAGES_BASICO, 100),
    profesional: num(env.AI_MESSAGES_PROFESIONAL, 400),
    red: num(env.AI_MESSAGES_RED, 1500),
  },
  prices: {
    basico: num(env.PRICE_BASICO, 499),
    profesional: num(env.PRICE_PROFESIONAL, 899),
    red: num(env.PRICE_RED, 1599),
  },
};
config.secureCookies = config.appUrl.startsWith('https://');
// Sin token de Mercado Pago y fuera de producción, el pago se simula para poder probar.
config.devBilling = !config.mp.accessToken && !config.production;

module.exports = config;

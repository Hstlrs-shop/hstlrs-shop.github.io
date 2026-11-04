'use strict';
/* Integración con suscripciones (preapproval) de Mercado Pago. */
const crypto = require('node:crypto');
const config = require('./config');

const API = process.env.MP_API_URL || 'https://api.mercadopago.com'; // MP_API_URL solo para pruebas
const configured = () => Boolean(config.mp.accessToken);

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${config.mp.accessToken}`,
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { 'X-Idempotency-Key': crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `Mercado Pago respondió ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

const ref = (tenantId, planId) => `${tenantId}|${planId}`;
const parseRef = (s) => { const [tenantId, planId] = String(s || '').split('|'); return { tenantId, planId }; };

function createSubscription({ tenantId, plan, payerEmail, backUrl }) {
  return call('POST', '/preapproval', {
    reason: `Nau - Plan ${plan.name}`,
    external_reference: ref(tenantId, plan.id),
    payer_email: payerEmail,
    back_url: backUrl,
    status: 'pending',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: plan.price,
      currency_id: config.currency,
    },
  });
}

const getSubscription = (id) => call('GET', `/preapproval/${encodeURIComponent(id)}`);
const updateSubscription = (id, body) => call('PUT', `/preapproval/${encodeURIComponent(id)}`, body);
const getAuthorizedPayment = (id) => call('GET', `/authorized_payments/${encodeURIComponent(id)}`);

function changePlan(id, tenantId, plan) {
  return updateSubscription(id, {
    reason: `Nau - Plan ${plan.name}`,
    external_reference: ref(tenantId, plan.id),
    auto_recurring: { transaction_amount: plan.price, currency_id: config.currency },
  });
}

/**
 * Valida el encabezado x-signature de las notificaciones (ts=...,v1=...).
 * Plantilla firmada: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
function verifySignature(headers, dataId) {
  if (!config.mp.webhookSecret) return !config.production; // en producción la firma es obligatoria
  const sig = String(headers['x-signature'] || '');
  const parts = Object.fromEntries(sig.split(',').map((p) => p.trim().split('=').map((x) => x.trim())));
  if (!parts.ts || !parts.v1) return false;
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (headers['x-request-id']) manifest += `request-id:${headers['x-request-id']};`;
  manifest += `ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', config.mp.webhookSecret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  configured, createSubscription, getSubscription, updateSubscription, getAuthorizedPayment,
  changePlan, verifySignature, parseRef,
};

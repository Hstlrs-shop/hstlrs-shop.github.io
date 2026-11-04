'use strict';
/* Flujo completo de suscripción contra un Mercado Pago simulado. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const SECRET = 'whsec-prueba';
const subs = new Map();
const calls = [];
const fakeMp = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    calls.push({ method: req.method, url: req.url, body, auth: req.headers.authorization });
    const send = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    let m;
    if (req.method === 'POST' && req.url === '/preapproval') {
      const id = 'pre_' + (subs.size + 1);
      const sub = { id, status: 'pending', init_point: `https://mp.test/checkout/${id}`, ...body };
      subs.set(id, sub);
      return send(sub, 201);
    }
    if ((m = req.url.match(/^\/preapproval\/(.+)$/))) {
      const sub = subs.get(m[1]);
      if (!sub) return send({ message: 'not found' }, 404);
      if (req.method === 'PUT') Object.assign(sub, body, { auto_recurring: { ...sub.auto_recurring, ...(body.auto_recurring || {}) } });
      return send(sub);
    }
    if ((m = req.url.match(/^\/authorized_payments\/(.+)$/))) return send({ id: m[1], preapproval_id: 'pre_1', status: 'rejected' });
    send({ message: 'no route' }, 404);
  });
});

let base, db, server;
before(async () => {
  await new Promise((r) => fakeMp.listen(0, r));
  Object.assign(process.env, {
    NODE_ENV: 'production', MP_ACCESS_TOKEN: 'TEST-token', MP_WEBHOOK_SECRET: SECRET,
    MP_API_URL: `http://127.0.0.1:${fakeMp.address().port}`, APP_URL: 'https://nau.test', CURRENCY: 'MXN',
  });
  const { createApp, openDb } = require('../server/server');
  db = openDb(':memory:');
  server = http.createServer(createApp(db));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fakeMp.close(); });

let cookie = '';
async function call(method, path, body) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function webhook(type, id) {
  const ts = String(Date.now());
  const rid = crypto.randomUUID();
  const v1 = crypto.createHmac('sha256', SECRET).update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
  const res = await fetch(`${base}/api/webhooks/mercadopago?data.id=${id}&type=${type}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': rid },
    body: JSON.stringify({ type, data: { id } }),
  });
  return res.status;
}

test('suscripción: checkout → autorizada → cambio de plan → pago fallido → cancelación', async () => {
  const reg = await call('POST', '/api/auth/register', { workshop: 'Taller MP', name: 'Ana', email: 'ana@mp.test', password: 'clave-segura-1' });
  const tenantId = reg.body.tenant.id;
  assert.equal(reg.body.billing.simulated, false);
  assert.ok(cookie.length > 0);

  // 1. Checkout crea la suscripción y devuelve el enlace de Mercado Pago
  const co = await call('POST', '/api/billing/checkout', { plan: 'basico', payerEmail: 'pagos@mp.test' });
  assert.equal(co.status, 200);
  assert.equal(co.body.url, 'https://mp.test/checkout/pre_1');
  const created = calls.find((c) => c.method === 'POST' && c.url === '/preapproval');
  assert.equal(created.auth, 'Bearer TEST-token');
  assert.equal(created.body.external_reference, `${tenantId}|basico`);
  assert.equal(created.body.payer_email, 'pagos@mp.test');
  assert.equal(created.body.back_url, 'https://nau.test/app/');
  assert.deepEqual(created.body.auto_recurring, { frequency: 1, frequency_type: 'months', transaction_amount: 499, currency_id: 'MXN' });
  assert.equal((await call('GET', '/api/me')).body.tenant.status, 'trial', 'sigue en prueba hasta que MP confirme');

  // 2. El cliente autoriza en MP → webhook
  Object.assign(subs.get('pre_1'), { status: 'authorized', next_payment_date: '2026-12-04T00:00:00.000Z', payer_email: 'pagos@mp.test' });
  assert.equal(await webhook('subscription_preapproval', 'pre_1'), 200);
  let me = (await call('GET', '/api/me')).body;
  assert.equal(me.tenant.status, 'active');
  assert.equal(me.tenant.plan, 'basico');
  assert.equal(me.tenant.hasSubscription, true);
  assert.equal(me.tenant.currentPeriodEnd, Date.parse('2026-12-04T00:00:00.000Z'));

  // Webhook con firma falsa no cambia nada
  const forged = await fetch(`${base}/api/webhooks/mercadopago?data.id=pre_1&type=subscription_preapproval`, { method: 'POST', headers: { 'x-signature': 'ts=1,v1=00' }, body: '{}' });
  assert.equal(forged.status, 401);

  // 3. Cambio de plan: actualiza el importe de la misma suscripción
  const up = await call('POST', '/api/billing/checkout', { plan: 'red' });
  assert.equal(up.body.url, '/app/?plan=actualizado');
  assert.equal(subs.get('pre_1').auto_recurring.transaction_amount, 1599);
  assert.equal((await call('GET', '/api/me')).body.tenant.plan, 'red');

  // 4. MP pausa la suscripción por pagos fallidos → período de gracia
  subs.get('pre_1').status = 'paused';
  assert.equal(await webhook('subscription_authorized_payment', 'pay_9'), 200);
  me = (await call('GET', '/api/me')).body;
  assert.equal(me.tenant.status, 'past_due');
  assert.equal(me.access.canWrite, true);
  assert.equal(me.access.daysLeft, 7);

  // 5. El dueño cancela → se avisa a MP
  subs.get('pre_1').status = 'authorized';
  await webhook('subscription_preapproval', 'pre_1');
  const cancel = await call('POST', '/api/billing/cancel', {});
  assert.equal(cancel.status, 200);
  assert.equal(subs.get('pre_1').status, 'cancelled');
  assert.equal(cancel.body.tenant.status, 'canceled');
  assert.equal(cancel.body.access.canWrite, true, 'mantiene acceso hasta fin del período pagado');
});

test('sync rechaza suscripciones de otro taller', async () => {
  subs.set('pre_ajena', { id: 'pre_ajena', status: 'authorized', external_reference: 'otro-taller|red' });
  const r = await call('POST', '/api/billing/sync', { preapprovalId: 'pre_ajena' });
  assert.equal(r.status, 403);
});

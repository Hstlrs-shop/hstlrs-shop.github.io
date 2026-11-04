'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.MP_ACCESS_TOKEN = '';
process.env.MP_WEBHOOK_SECRET = 'secreto-de-prueba';
process.env.ADMIN_EMAILS = 'admin@nau.test';
const { createApp, openDb } = require('../server/server');

let server, base, db;
before(async () => {
  db = openDb(':memory:');
  server = http.createServer(createApp(db));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => null) };
  };
}
const register = (c, email, workshop = 'Taller Test') => c('POST', '/api/auth/register', { workshop, name: 'Dueño', email, password: 'clave-segura-1' });

test('registro crea taller en prueba y sesión', async () => {
  const c = client();
  const r = await register(c, 'uno@test.com');
  assert.equal(r.status, 200);
  assert.equal(r.body.tenant.status, 'trial');
  assert.equal(r.body.access.canWrite, true);
  assert.equal(r.body.access.daysLeft, 14);
  const me = await c('GET', '/api/me');
  assert.equal(me.body.user.email, 'uno@test.com');
  assert.equal((await register(client(), 'uno@test.com')).status, 409);
});

test('login, contraseña incorrecta y logout', async () => {
  await register(client(), 'dos@test.com');
  const c = client();
  assert.equal((await c('POST', '/api/auth/login', { email: 'dos@test.com', password: 'mala-clave' })).status, 401);
  assert.equal((await c('POST', '/api/auth/login', { email: 'DOS@test.com', password: 'clave-segura-1' })).status, 200);
  await c('POST', '/api/auth/logout', {});
  assert.equal((await c('GET', '/api/me')).status, 401);
});

test('sin encabezado CSRF se rechaza', async () => {
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
});

test('estado con control de versión y aislamiento entre talleres', async () => {
  const a = client(); const b = client();
  await register(a, 'a@test.com', 'Taller A');
  await register(b, 'b@test.com', 'Taller B');
  const s = await a('GET', '/api/state');
  assert.equal(s.body.version, 1);
  const data = { ...s.body.data, parts: [{ id: 'p1', name: 'Filtro' }] };
  const w = await a('PUT', '/api/state', { version: 1, data });
  assert.deepEqual(w.body, { version: 2 });
  const conflict = await a('PUT', '/api/state', { version: 1, data });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.version, 2);
  const other = await b('GET', '/api/state');
  assert.equal(other.body.data.parts.length, 0, 'el taller B no ve datos de A');
});

test('límites del plan: bahías y usuarios', async () => {
  const c = client();
  await register(c, 'lim@test.com');
  const s = await c('GET', '/api/state');
  const bays = Array.from({ length: 11 }, (_, i) => ({ id: 'b' + i, name: 'B' + i }));
  const r = await c('PUT', '/api/state', { version: s.body.version, data: { ...s.body.data, bays } });
  assert.equal(r.status, 403);
  for (let i = 1; i < 6; i++) {
    assert.equal((await c('POST', '/api/users', { name: 'M' + i, email: `m${i}@lim.com`, password: 'clave-segura-1' })).status, 200);
  }
  assert.equal((await c('POST', '/api/users', { name: 'X', email: 'x@lim.com', password: 'clave-segura-1' })).status, 403);
  // el personal no puede gestionar usuarios ni pagos
  const staff = client();
  await staff('POST', '/api/auth/login', { email: 'm1@lim.com', password: 'clave-segura-1' });
  assert.equal((await staff('POST', '/api/users', { name: 'Y', email: 'y@lim.com', password: 'clave-segura-1' })).status, 403);
  assert.equal((await staff('POST', '/api/billing/checkout', { plan: 'basico' })).status, 403);
  // bajar a Básico con 6 usuarios no se permite
  assert.equal((await c('POST', '/api/billing/checkout', { plan: 'basico' })).status, 400);
});

test('prueba vencida: solo lectura; pago simulado reactiva', async () => {
  const c = client();
  const r = await register(c, 'vence@test.com');
  db.prepare('UPDATE tenants SET trial_ends_at = ? WHERE id = ?').run(Date.now() - 1000, r.body.tenant.id);
  const me = await c('GET', '/api/me');
  assert.equal(me.body.access.canWrite, false);
  const s = await c('GET', '/api/state');
  assert.equal((await c('PUT', '/api/state', { version: s.body.version, data: s.body.data })).status, 402);
  const co = await c('POST', '/api/billing/checkout', { plan: 'basico' });
  assert.equal(co.status, 200);
  const me2 = await c('GET', '/api/me');
  assert.equal(me2.body.tenant.status, 'active');
  assert.equal(me2.body.tenant.plan, 'basico');
  assert.equal(me2.body.access.canWrite, true);
});

test('webhook de Mercado Pago exige firma válida', async () => {
  const path = '/api/webhooks/mercadopago?data.id=123&type=subscription_preapproval';
  const bad = await fetch(base + path, { method: 'POST', headers: { 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'r1' }, body: '{}' });
  assert.equal(bad.status, 401);
  const ts = '1700000000';
  const v1 = crypto.createHmac('sha256', 'secreto-de-prueba').update(`id:123;request-id:r1;ts:${ts};`).digest('hex');
  const ok = await fetch(base + path, { method: 'POST', headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'r1' }, body: '{}' });
  assert.equal(ok.status, 200);
});

test('admin: solo emails autorizados; activación manual', async () => {
  const c = client();
  const r = await register(c, 'cliente@test.com');
  assert.equal((await c('GET', '/api/admin/tenants')).status, 403);
  const adm = client();
  await register(adm, 'admin@nau.test', 'Mi empresa');
  const list = await adm('GET', '/api/admin/tenants');
  assert.equal(list.status, 200);
  assert.ok(list.body.tenants.some((t) => t.id === r.body.tenant.id));
  const act = await adm('POST', `/api/admin/tenants/${r.body.tenant.id}`, { action: 'activate', plan: 'red', days: 30 });
  assert.equal(act.status, 200);
  const me = await c('GET', '/api/me');
  assert.equal(me.body.tenant.plan, 'red');
  assert.equal(me.body.tenant.status, 'active');
});

test('archivos estáticos y demo', async () => {
  for (const p of ['/', '/cuenta.html', '/app/', '/demo/', '/demo/app.js', '/site.css']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 200, p);
  }
  assert.equal((await fetch(base + '/../server/config.js')).status, 404);
  assert.notEqual((await fetch(base + '/%2e%2e/server/config.js')).status, 200);
});

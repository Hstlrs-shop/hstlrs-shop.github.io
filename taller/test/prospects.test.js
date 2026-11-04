'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAILS = 'yo@nau.test';
process.env.APP_URL = 'https://nau.test';
const { createApp, openDb } = require('../server/server');

let server, base;
before(async () => { server = http.createServer(createApp(openDb(':memory:'))); await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => null) };
  };
}

test('prospectos: importar, invitar y vincular al registrarse', async () => {
  const admin = client();
  await admin('POST', '/api/auth/register', { workshop: 'Nau', name: 'Yo', email: 'yo@nau.test', password: 'clave-segura-1' });
  const imp = await admin('POST', '/api/admin/prospects', { items: [
    { name: 'Refacciones Ejemplo', phone: '(442) 216-7882', municipio: 'Querétaro', source: 'https://ejemplo.mx' },
    { name: 'Otra Refaccionaria', phone: '', municipio: 'Corregidora' },
    { name: 'refacciones ejemplo', phone: '4422167882' },
  ] });
  assert.deepEqual(imp.body, { added: 2, skipped: 1 }, 'detecta duplicados por nombre y teléfono');
  const list = (await admin('GET', '/api/admin/prospects')).body;
  assert.equal(list.counts.por_contactar, 2);
  const p = list.prospects.find((x) => x.name === 'Refacciones Ejemplo');
  assert.equal(p.phone, '4422167882');
  assert.match(p.invite_url, /^https:\/\/nau\.test\/cuenta\.html\?inv=[\w-]+&nombre=Refacciones%20Ejemplo&municipio=Quer%C3%A9taro&whatsapp=4422167882#refaccionaria$/);
  assert.equal((await admin('PUT', `/api/admin/prospects/${p.id}`, { status: 'contactado', notes: 'Llamar el lunes' })).body.status, 'contactado');

  const shop = client();
  const reg = await shop('POST', '/api/auth/register', { kind: 'refaccionaria', workshop: 'Refacciones Ejemplo', name: 'Encargado', email: 'enc@ej.mx', password: 'clave-segura-1', whatsapp: '4422167882', municipio: 'Querétaro', invite: new URL(p.invite_url).searchParams.get('inv') });
  assert.equal(reg.status, 200);
  const after = (await admin('GET', '/api/admin/prospects')).body.prospects.find((x) => x.id === p.id);
  assert.equal(after.status, 'registrado');
  assert.equal(after.tenant_id, reg.body.tenant.id);

  assert.equal((await shop('GET', '/api/admin/prospects')).status, 403, 'solo administradores');
});

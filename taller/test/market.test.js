'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = '';
const { createApp, openDb } = require('../server/server');
const { fitsYear, reach } = require('../server/market');

let server, base;
before(async () => {
  server = http.createServer(createApp(openDb(':memory:')));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

function client() {
  let cookie = '';
  const c = async (method, path, body) => {
    const res = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return c;
}
const reg = (c, email, extra) => c('POST', '/api/auth/register', { name: 'Persona', email, password: 'clave-segura-1', ...extra });

// Centro de Querétaro, Juriquilla (~12 km), San Juan del Río (~45 km)
const CENTRO = { lat: 20.5888, lng: -100.3899 };
const taller = client(), r1 = client(), r2 = client(), r3 = client();

test('registro y perfiles con ubicación', async () => {
  const t = await reg(taller, 'taller@m.test', { workshop: 'Taller Centro' });
  assert.equal(t.body.tenant.kind, 'taller');
  assert.equal(t.body.tenant.hasLocation, false);
  assert.equal((await taller('POST', '/api/rfqs', { items: [{ name: 'Balatas', qty: 1 }] })).status, 400, 'sin ubicación no se puede pedir');
  assert.equal((await taller('PUT', '/api/profile', { municipio: 'Querétaro', colonia: 'Centro', ...CENTRO, phone: '4421112233' })).status, 200);

  assert.equal((await reg(client(), 'mal@m.test', { workshop: 'Sin datos', kind: 'refaccionaria' })).status, 400, 'refaccionaria exige WhatsApp y municipio');
  const a = await reg(r1, 'r1@m.test', { workshop: 'Refacciones Juriquilla', kind: 'refaccionaria', whatsapp: '442 555 0001', municipio: 'Querétaro' });
  assert.equal(a.body.tenant.kind, 'refaccionaria');
  assert.equal(a.body.access.canWrite, true, 'las refaccionarias son gratuitas');
  await r1('PUT', '/api/profile', { municipio: 'Querétaro', colonia: 'Juriquilla', lat: 20.6950, lng: -100.4460, radius_km: 20, delivers: true, whatsapp: '4425550001' });
  await reg(r2, 'r2@m.test', { workshop: 'Autopartes San Juan', kind: 'refaccionaria', whatsapp: '4275550002', municipio: 'San Juan del Río' });
  await r2('PUT', '/api/profile', { municipio: 'San Juan del Río', lat: 20.3889, lng: -99.9961, radius_km: 15, whatsapp: '4275550002' });
  await reg(r3, 'r3@m.test', { workshop: 'Refaccionaria El Pueblito', kind: 'refaccionaria', whatsapp: '4425550003', municipio: 'querétaro' });
  assert.equal((await r1('POST', '/api/billing/checkout', { plan: 'basico' })).status, 400);
});

test('catálogo y buscador universal', async () => {
  const items = [
    { sku: 'BAL-VER-01', name: 'Balatas delanteras cerámicas', brand: 'Brembo', category: 'Frenos', oem: 'D1338', fits: 'Nissan Versa 2012-2019, March 2012-2020', price: '$1,250', stock: 6 },
    { sku: 'BUJ-01', name: 'Bujía iridio', brand: 'NGK', category: 'Encendido', fits: '', price: 189, stock: 40 },
    { sku: 'BAL-AVE-02', name: 'Balatas delanteras', brand: 'Fritec', category: 'Frenos', fits: 'Chevrolet Aveo 2018-2023', price: 790, stock: 0 },
  ];
  const up = await r1('POST', '/api/supplier/catalog', { items });
  assert.deepEqual(up.body, { ok: true, saved: 3, total: 3 });
  await r2('POST', '/api/supplier/catalog', { items: [{ sku: 'X1', name: 'Balatas delanteras', fits: 'Nissan Versa 2015', price: 900, stock: 3 }] });
  assert.equal((await r1('POST', '/api/supplier/catalog', { items: [{ sku: '', name: 'x' }] })).status, 400);

  const s = await taller('GET', `/api/parts/search?q=${encodeURIComponent('balatas versa 2016')}`);
  assert.equal(s.status, 200);
  assert.equal(s.body.suppliersNearby, 2, 'Juriquilla por distancia y El Pueblito por municipio; San Juan queda fuera');
  assert.equal(s.body.results[0].sku, 'BAL-VER-01');
  assert.equal(s.body.results[0].price, 1250);
  assert.ok(s.body.results[0].supplier.distance_km > 10 && s.body.results[0].supplier.distance_km < 15);
  assert.ok(!s.body.results.some((r) => r.supplier.name === 'Autopartes San Juan'));
  assert.ok(!s.body.results.some((r) => r.sku === 'BAL-AVE-02' && r.exact), 'el Aveo no coincide con "versa"');

  const y = await taller('GET', `/api/parts/search?q=${encodeURIComponent('balatas versa 2022')}`);
  assert.ok(!y.body.results.some((r) => r.sku === 'BAL-VER-01'), 'fuera del rango de años');
  const acc = await taller('GET', '/api/parts/search?q=bujia');
  assert.equal(acc.body.results[0].name, 'Bujía iridio', 'sin acentos también encuentra');
  const syn = await taller('GET', `/api/parts/search?q=pastillas&terms=${encodeURIComponent(JSON.stringify(['balatas']))}`);
  assert.ok(syn.body.results.length >= 2, 'los sinónimos amplían la búsqueda');
  assert.equal((await taller('POST', '/api/parts/interpret', { q: 'pastillas versa' })).status, 503, 'sin clave de IA');
  assert.equal((await r1('GET', '/api/parts/search?q=x')).status, 403);
});

test('cotización: solicitud → respuestas → aceptar', async () => {
  const c = await taller('POST', '/api/rfqs', { vehicle: 'Nissan Versa 2016', items: [{ name: 'Balatas delanteras', qty: 1 }, { name: 'Disco de freno delantero', qty: 2 }], delivery: 'domicilio', needed: 'hoy', radius_km: 20 });
  assert.equal(c.status, 200);
  assert.equal(c.body.matched, 2);
  const id = c.body.id;

  const n1 = await r1('GET', '/api/supplier/rfqs?tab=nuevas');
  assert.equal(n1.body.rfqs.length, 1);
  assert.equal(n1.body.rfqs[0].taller.name, 'Taller Centro');
  assert.equal(n1.body.rfqs[0].contact, null, 'el contacto del taller se revela al aceptar');
  assert.equal((await r2('GET', '/api/supplier/rfqs?tab=nuevas')).body.rfqs.length, 0, 'San Juan no la ve');
  assert.equal((await r2('POST', `/api/supplier/rfqs/${id}/quote`, { items: [{ available: true, price: 1 }, { available: false }] })).status, 404);

  assert.equal((await r1('POST', `/api/supplier/rfqs/${id}/quote`, { items: [{ available: false }, { available: false }] })).status, 400);
  const q1 = await r1('POST', `/api/supplier/rfqs/${id}/quote`, { items: [{ available: true, price: 1250, brand: 'Brembo' }, { available: true, price: 950 }], delivery_cost: 80, eta: 'Hoy', notes: 'Entrega en 2 h' });
  assert.equal(q1.body.total, 1250 + 950 * 2 + 80);
  await r3('POST', `/api/supplier/rfqs/${id}/quote`, { items: [{ available: true, price: 1100 }, { available: false }], eta: 'Mañana' });
  assert.equal((await r1('GET', '/api/supplier/summary')).body.nuevas, 0);

  const list = await taller('GET', '/api/rfqs');
  assert.equal(list.body.rfqs[0].quotes, 2);
  const det = await taller('GET', `/api/rfqs/${id}`);
  assert.equal(det.body.quotes.length, 2);
  assert.equal(det.body.quotes[0].total, 1100, 'ordenadas por total');
  assert.ok(det.body.quotes.every((x) => x.contact === null));
  const best = det.body.quotes.find((x) => x.supplier.name === 'Refacciones Juriquilla');

  const acc = await taller('POST', `/api/rfqs/${id}/accept`, { quoteId: best.id });
  assert.equal(acc.body.rfq.status, 'adjudicada');
  const won = acc.body.quotes.find((x) => x.id === best.id);
  assert.equal(won.status, 'aceptada');
  assert.match(won.contact.whatsappLink, /^https:\/\/wa\.me\/524425550001\?text=/);
  assert.equal(acc.body.quotes.find((x) => x.id !== best.id).status, 'no_seleccionada');

  const g = await r1('GET', '/api/supplier/rfqs?tab=ganadas');
  assert.equal(g.body.rfqs[0].contact.phone, '4421112233');
  assert.equal((await r3('POST', `/api/supplier/rfqs/${id}/quote`, { items: [{ available: true, price: 1 }, { available: false }] })).status, 400, 'ya cerrada');
  assert.equal((await taller('POST', `/api/rfqs/${id}/accept`, { quoteId: best.id })).status, 400);
});

test('pedido directo a una refaccionaria y permisos', async () => {
  const s = await taller('GET', '/api/parts/search?q=bujia');
  const sup = s.body.results[0].supplier.id;
  const c = await taller('POST', '/api/rfqs', { items: [{ name: 'Bujía iridio', qty: 4 }], target_supplier_id: sup });
  assert.equal(c.body.matched, 1);
  const n1 = (await r1('GET', '/api/supplier/rfqs?tab=nuevas')).body.rfqs;
  assert.equal(n1.length, 1);
  assert.equal(n1[0].direct, true);
  assert.equal((await r3('GET', '/api/supplier/rfqs?tab=nuevas')).body.rfqs.length, 0, 'solo la elegida la ve');
  assert.equal((await taller('POST', `/api/rfqs/${c.body.id}/cancel`, {})).status, 200);
  assert.equal((await r1('GET', '/api/supplier/rfqs?tab=nuevas')).body.rfqs.length, 0);
  assert.equal((await taller('GET', '/api/supplier/rfqs')).status, 403);
  assert.equal((await r1('POST', '/api/rfqs', { items: [{ name: 'x', qty: 1 }] })).status, 403);
  const other = client();
  await reg(other, 'otro@m.test', { workshop: 'Otro taller' });
  assert.equal((await other('GET', `/api/rfqs/${c.body.id}`)).status, 404, 'un taller no ve solicitudes de otro');
});

test('utilidades: años y alcance', () => {
  assert.equal(fitsYear('Nissan Versa 2012-2019', [2016]), true);
  assert.equal(fitsYear('Nissan Versa 2012 a 2019', [2021]), false);
  assert.equal(fitsYear('Universal', [2021]), true);
  assert.equal(fitsYear('Tsuru 2005, 2008', [2008]), true);
  assert.equal(reach({ municipio: 'Corregidora' }, 10, { municipio: 'Querétaro' }), false);
  assert.equal(reach({ municipio: 'Querétaro' }, 10, { municipio: 'QUERÉTARO' }), null);
});

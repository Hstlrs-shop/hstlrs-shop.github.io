'use strict';
/* Mercado de refacciones: talleres piden cotizaciones a refaccionarias cercanas y buscan en sus catálogos. */
const crypto = require('node:crypto');

const HOUR = 3600000;
const RADII = [5, 10, 20, 50];
const DELIVERY = ['recoger', 'domicilio'];
const NEEDED = { hoy: 24 * HOUR, manana: 48 * HOUR, semana: 7 * 24 * HOUR };
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'un', 'una', 'en', 'por', 'al', 'a', 'o']);
const isYear = (s) => /^(19[5-9]\d|20[0-4]\d)$/.test(s);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function haversineKm(a, b) {
  const R = 6371;
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const hasCoords = (x) => Number.isFinite(x?.lat) && Number.isFinite(x?.lng);

/**
 * ¿Llega la refaccionaria a este punto? Devuelve la distancia en km, null si se desconoce
 * pero están en el mismo municipio, o false si queda fuera.
 */
function reach(origin, radiusKm, supplier) {
  if (hasCoords(origin) && hasCoords(supplier)) {
    const d = haversineKm(origin, supplier);
    const limit = Math.min(radiusKm, supplier.radius_km || radiusKm);
    return d <= limit ? Math.round(d * 10) / 10 : false;
  }
  return norm(origin.municipio) && norm(origin.municipio) === norm(supplier.municipio) ? null : false;
}

function tokens(text) {
  return norm(text).split(/[^a-z0-9ñ]+/).filter((t) => t.length >= 2 && !STOP.has(t));
}
/** Consulta FTS5: cada término es un grupo de palabras (AND u OR) y los grupos se unen con OR. */
function ftsQuery(terms, mode) {
  const groups = terms.map((t) => tokens(t).filter((x) => !isYear(x)).map((x) => `"${x}"*`)).filter((g) => g.length);
  if (!groups.length) return null;
  return groups.map((g) => `(${g.join(mode === 'and' ? ' AND ' : ' OR ')})`).join(' OR ');
}
/** Si la compatibilidad menciona años y ninguno cubre el año buscado, el resultado no aplica. */
function fitsYear(fits, years) {
  if (!years.length || !fits) return true;
  const ranges = [...String(fits).matchAll(/(19[5-9]\d|20[0-4]\d)(?:\s*(?:-|–|a|al)\s*(19[5-9]\d|20[0-4]\d))?/g)]
    .map((m) => [Number(m[1]), Number(m[2] || m[1])]);
  if (!ranges.length) return true;
  return years.some((y) => ranges.some(([a, b]) => y >= Math.min(a, b) && y <= Math.max(a, b)));
}

function registerMarket(ctx) {
  const { db, route, HttpError, str, now, access, rateLimit, AI, ai } = ctx;
  const q = {
    tenant: db.prepare('SELECT * FROM tenants WHERE id = ?'),
    suppliers: db.prepare("SELECT * FROM tenants WHERE kind = 'refaccionaria' AND status = 'active'"),
    expire: db.prepare("UPDATE rfqs SET status = 'vencida' WHERE status = 'abierta' AND expires_at < ?"),
    rfq: db.prepare('SELECT * FROM rfqs WHERE id = ?'),
    quotesOf: db.prepare("SELECT * FROM quotes WHERE rfq_id = ? AND status != 'retirada' ORDER BY total"),
    myQuote: db.prepare('SELECT * FROM quotes WHERE rfq_id = ? AND supplier_id = ?'),
    quote: db.prepare('SELECT * FROM quotes WHERE id = ?'),
  };
  const uuid = () => crypto.randomUUID();
  const expireOld = () => q.expire.run(now());

  function requireKind(user, kind) {
    const t = q.tenant.get(user.tenant_id);
    if (t.kind !== kind) throw new HttpError(403, kind === 'taller' ? 'Esta función es para talleres.' : 'Esta función es para refaccionarias.');
    return t;
  }
  const requireOwner = (user) => { if (user.role !== 'owner') throw new HttpError(403, 'Solo el dueño de la cuenta puede hacer esto.'); };
  const opt = (v, field, max) => (v === undefined || v === null || v === '' ? null : str(String(v), field, { min: 1, max }));
  const num = (v, field, { min = 0, max = 1e7, int = false } = {}) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new HttpError(400, `Revisa el campo "${field}".`);
    return n;
  };
  const digits = (v) => String(v || '').replace(/\D/g, '').slice(0, 15) || null;
  const waLink = (phone, text) => (phone ? `https://wa.me/${phone.length === 10 ? '52' + phone : phone}?text=${encodeURIComponent(text)}` : null);

  const profileOf = (t) => ({
    kind: t.kind, name: t.name, phone: t.phone, whatsapp: t.whatsapp, address: t.address, colonia: t.colonia,
    municipio: t.municipio, lat: t.lat, lng: t.lng, radius_km: t.radius_km, delivers: Boolean(t.delivers),
    hours: t.hours, categories: t.categories, hasLocation: hasCoords(t) || Boolean(t.municipio),
  });
  const publicSupplier = (s, distance) => ({
    id: s.id, name: s.name, colonia: s.colonia, municipio: s.municipio, distance_km: distance,
    delivers: Boolean(s.delivers), hours: s.hours,
  });
  const contactOf = (t, text) => ({
    name: t.name, phone: t.phone, whatsapp: t.whatsapp, address: t.address, colonia: t.colonia, municipio: t.municipio,
    whatsappLink: waLink(t.whatsapp || t.phone, text),
  });

  /* ---------- perfil y ubicación ---------- */
  route('GET', '/api/profile', ({ user }) => profileOf(q.tenant.get(user.tenant_id)));
  route('PUT', '/api/profile', ({ user, body }) => {
    requireOwner(user);
    const t = q.tenant.get(user.tenant_id);
    const lat = body.lat === null || body.lat === '' || body.lat === undefined ? null : num(body.lat, 'latitud', { min: -90, max: 90 });
    const lng = body.lng === null || body.lng === '' || body.lng === undefined ? null : num(body.lng, 'longitud', { min: -180, max: 180 });
    const f = {
      phone: digits(body.phone), whatsapp: digits(body.whatsapp), address: opt(body.address, 'dirección', 200),
      colonia: opt(body.colonia, 'colonia', 80), municipio: opt(body.municipio, 'municipio', 80), lat, lng,
    };
    if (t.kind === 'refaccionaria') {
      f.radius_km = num(body.radius_km ?? 10, 'radio de entrega', { min: 1, max: 100, int: true });
      f.delivers = body.delivers ? 1 : 0;
      f.hours = opt(body.hours, 'horario', 120);
      f.categories = opt(body.categories, 'especialidades', 300);
      if (!f.whatsapp && !f.phone) throw new HttpError(400, 'Agrega un teléfono o WhatsApp para que los talleres te contacten.');
    }
    if (!f.municipio && lat === null) throw new HttpError(400, 'Indica al menos el municipio.');
    const keys = Object.keys(f);
    db.prepare(`UPDATE tenants SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => f[k]), t.id);
    return profileOf(q.tenant.get(t.id));
  });

  /* ---------- buscador de refacciones ---------- */
  const searchStmt = db.prepare(`SELECT c.*, t.name AS s_name, t.lat AS s_lat, t.lng AS s_lng, t.municipio AS s_municipio,
      t.colonia AS s_colonia, t.radius_km AS s_radius, t.delivers AS s_delivers, t.hours AS s_hours
    FROM catalog_fts f JOIN catalog_items c ON c.id = f.rowid JOIN tenants t ON t.id = c.tenant_id
    WHERE catalog_fts MATCH ? AND t.kind = 'refaccionaria' AND t.status = 'active'
    ORDER BY bm25(catalog_fts, 10, 3, 2, 6, 4, 6) LIMIT 400`);

  function search(t, terms, radiusKm) {
    const years = terms.flatMap(tokens).filter(isYear).map(Number);
    const seen = new Set();
    const out = [];
    for (const mode of ['and', 'or']) {
      const fq = ftsQuery(terms, mode);
      if (!fq) break;
      for (const r of searchStmt.all(fq)) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        const d = reach(t, radiusKm, { lat: r.s_lat, lng: r.s_lng, municipio: r.s_municipio, radius_km: r.s_radius });
        if (d === false || !fitsYear(r.fits, years)) continue;
        out.push({
          id: r.id, sku: r.sku, name: r.name, brand: r.brand, category: r.category, oem: r.oem, fits: r.fits,
          price: r.price, stock: r.stock, exact: mode === 'and', updated_at: r.updated_at,
          supplier: { id: r.tenant_id, name: r.s_name, colonia: r.s_colonia, municipio: r.s_municipio, distance_km: d, delivers: Boolean(r.s_delivers), hours: r.s_hours },
        });
      }
      if (out.length >= 8) break;
    }
    // Primero coincidencias completas con existencia; luego por cercanía y precio.
    out.sort((a, b) => (b.exact - a.exact) || ((b.stock > 0) - (a.stock > 0)) || ((a.supplier.distance_km ?? 99) - (b.supplier.distance_km ?? 99)) || ((a.price ?? 1e9) - (b.price ?? 1e9)));
    return out.slice(0, 60);
  }

  route('GET', '/api/parts/search', ({ user, url }) => {
    const t = requireKind(user, 'taller');
    const text = (url.searchParams.get('q') || '').slice(0, 200);
    let extra = [];
    try { extra = JSON.parse(url.searchParams.get('terms') || '[]'); } catch { /* ignorar */ }
    const terms = [text, ...(Array.isArray(extra) ? extra : [])].map((x) => String(x).slice(0, 120)).filter((x) => x.trim()).slice(0, 12);
    if (!terms.length) throw new HttpError(400, 'Escribe qué refacción buscas.');
    const radius = RADII.includes(Number(url.searchParams.get('radius'))) ? Number(url.searchParams.get('radius')) : 20;
    const p = profileOf(t);
    if (!p.hasLocation) return { results: [], needsLocation: true, suppliersNearby: 0 };
    const suppliersNearby = q.suppliers.all().filter((s) => reach(t, radius, s) !== false).length;
    return { results: search(t, terms, radius), suppliersNearby, radius };
  });

  route('POST', '/api/parts/interpret', async ({ user, body }) => {
    const t = requireKind(user, 'taller');
    if (!AI.enabled()) throw new HttpError(503, 'La búsqueda con IA no está activada en este servidor.');
    if (!access(t).canWrite) throw new HttpError(402, 'La búsqueda con IA requiere una suscripción activa.');
    const text = str(body.q, 'búsqueda', { min: 2, max: 300 });
    const vehicle = opt(body.vehicle, 'vehículo', 120);
    ai.consume(t);
    rateLimit(`ai:${user.id}`, ctx.aiPerMinute, 60000);
    try {
      const { result, usage } = await AI.interpretPartQuery(text, vehicle);
      ai.addUsage(t, usage);
      return result;
    } catch (e) {
      throw new HttpError(502, e.userMessage || 'No se pudo interpretar la búsqueda. Intenta con otras palabras.');
    }
  });

  /* ---------- solicitudes de cotización (taller) ---------- */
  function parseItems(raw) {
    if (!Array.isArray(raw) || !raw.length) throw new HttpError(400, 'Agrega al menos una refacción.');
    if (raw.length > 30) throw new HttpError(400, 'Máximo 30 refacciones por solicitud.');
    return raw.map((it) => ({
      name: str(it?.name, 'refacción', { min: 2, max: 120 }),
      qty: num(it?.qty ?? 1, 'cantidad', { min: 1, max: 999, int: true }),
      notes: opt(it?.notes, 'notas', 200),
      ref: opt(it?.ref, 'referencia', 60),
    }));
  }

  route('POST', '/api/rfqs', ({ user, body }) => {
    const t = requireKind(user, 'taller');
    if (!access(t).canWrite) throw new HttpError(402, 'Necesitas una suscripción activa para pedir cotizaciones.');
    const p = profileOf(t);
    if (!p.hasLocation) throw new HttpError(400, 'Primero indica la ubicación de tu taller en Ajustes → Ubicación.');
    const recent = db.prepare('SELECT COUNT(*) AS n FROM rfqs WHERE taller_id = ? AND created_at > ?').get(t.id, now() - 24 * HOUR).n;
    if (recent >= 40) throw new HttpError(429, 'Llegaste al máximo de 40 solicitudes por día.');
    const items = parseItems(body.items);
    const delivery = DELIVERY.includes(body.delivery) ? body.delivery : 'recoger';
    const needed = body.needed in NEEDED ? body.needed : 'manana';
    const radius = RADII.includes(Number(body.radius_km)) ? Number(body.radius_km) : 10;
    let target = null;
    if (body.target_supplier_id) {
      target = q.tenant.get(String(body.target_supplier_id));
      if (!target || target.kind !== 'refaccionaria' || target.status !== 'active') throw new HttpError(400, 'La refaccionaria ya no está disponible.');
    }
    const matched = target ? 1 : q.suppliers.all().filter((s) => reach(t, radius, s) !== false).length;
    const id = uuid();
    const number = db.prepare('SELECT COALESCE(MAX(number), 0) + 1 AS n FROM rfqs WHERE taller_id = ?').get(t.id).n;
    db.prepare(`INSERT INTO rfqs (id, number, taller_id, user_id, target_supplier_id, status, vehicle, vin, items, delivery, needed,
      radius_km, notes, lat, lng, municipio, created_at, expires_at) VALUES (?, ?, ?, ?, ?, 'abierta', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, number, t.id, user.id, target?.id || null, opt(body.vehicle, 'vehículo', 120), opt(body.vin, 'VIN', 20),
        JSON.stringify(items), delivery, needed, radius, opt(body.notes, 'notas', 500), t.lat, t.lng, t.municipio, now(), now() + NEEDED[needed]);
    return { id, number, matched };
  });

  route('GET', '/api/rfqs', ({ user }) => {
    const t = requireKind(user, 'taller');
    expireOld();
    const rows = db.prepare(`SELECT r.*, (SELECT COUNT(*) FROM quotes x WHERE x.rfq_id = r.id AND x.status != 'retirada') AS quotes,
        (SELECT MIN(total) FROM quotes x WHERE x.rfq_id = r.id AND x.status != 'retirada') AS best
      FROM rfqs r WHERE r.taller_id = ? ORDER BY r.created_at DESC LIMIT 60`).all(t.id);
    return { rfqs: rows.map((r) => ({ ...r, items: JSON.parse(r.items) })) };
  });

  function rfqDetail(t, r) {
    const quotes = q.quotesOf.all(r.id).map((x) => {
      const s = q.tenant.get(x.supplier_id);
      const d = reach(r, 1000, { ...s, radius_km: 1000 });
      const won = x.status === 'aceptada';
      return {
        id: x.id, status: x.status, items: JSON.parse(x.items), total: x.total, delivery_cost: x.delivery_cost, eta: x.eta, notes: x.notes,
        created_at: x.created_at, updated_at: x.updated_at,
        supplier: publicSupplier(s, d === false ? null : d),
        contact: won ? contactOf(s, `Hola, soy de ${t.name}. Acepté su cotización de Nau para la solicitud #${r.number}.`) : null,
      };
    });
    return { rfq: { ...r, items: JSON.parse(r.items) }, quotes };
  }

  const ownRfq = (t, id) => {
    const r = q.rfq.get(id);
    if (!r || r.taller_id !== t.id) throw new HttpError(404, 'Solicitud no encontrada.');
    return r;
  };
  route('GET', /^\/api\/rfqs\/([\w-]+)$/, ({ user, params }) => {
    const t = requireKind(user, 'taller');
    expireOld();
    return rfqDetail(t, ownRfq(t, params[0]));
  });
  route('POST', /^\/api\/rfqs\/([\w-]+)\/accept$/, ({ user, params, body }) => {
    const t = requireKind(user, 'taller');
    expireOld();
    const r = ownRfq(t, params[0]);
    if (r.status !== 'abierta') throw new HttpError(400, 'La solicitud ya no está abierta.');
    const x = q.quote.get(String(body.quoteId || ''));
    if (!x || x.rfq_id !== r.id || x.status !== 'enviada') throw new HttpError(400, 'Esa cotización ya no está disponible.');
    db.exec('BEGIN');
    try {
      db.prepare("UPDATE quotes SET status = 'aceptada', updated_at = ? WHERE id = ?").run(now(), x.id);
      db.prepare("UPDATE quotes SET status = 'no_seleccionada', updated_at = ? WHERE rfq_id = ? AND id != ? AND status = 'enviada'").run(now(), r.id, x.id);
      db.prepare("UPDATE rfqs SET status = 'adjudicada', accepted_quote_id = ? WHERE id = ?").run(x.id, r.id);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return rfqDetail(t, q.rfq.get(r.id));
  });
  route('POST', /^\/api\/rfqs\/([\w-]+)\/cancel$/, ({ user, params }) => {
    const t = requireKind(user, 'taller');
    const r = ownRfq(t, params[0]);
    if (r.status !== 'abierta') throw new HttpError(400, 'La solicitud ya no está abierta.');
    db.prepare("UPDATE rfqs SET status = 'cancelada' WHERE id = ?").run(r.id);
    return { ok: true };
  });

  /* ---------- portal de la refaccionaria ---------- */
  function rfqForSupplier(r, s, d, mine) {
    const taller = q.tenant.get(r.taller_id);
    const won = mine?.status === 'aceptada';
    return {
      id: r.id, number: r.number, status: r.status, vehicle: r.vehicle, vin: r.vin, items: JSON.parse(r.items),
      delivery: r.delivery, needed: r.needed, notes: r.notes, created_at: r.created_at, expires_at: r.expires_at,
      direct: r.target_supplier_id === s.id, distance_km: d === false ? null : d,
      taller: { name: taller.name, colonia: taller.colonia, municipio: taller.municipio },
      contact: won ? contactOf(taller, `Hola, somos ${s.name}. Recibimos tu pedido de Nau (solicitud #${r.number}).`) : null,
      quote: mine ? { ...mine, items: JSON.parse(mine.items) } : null,
    };
  }

  function visible(r, s) {
    if (r.target_supplier_id) return r.target_supplier_id === s.id ? (reach(r, 1000, { ...s, radius_km: 1000 }) || null) : false;
    return reach(r, r.radius_km, s);
  }

  route('GET', '/api/supplier/rfqs', ({ user, url }) => {
    const s = requireKind(user, 'refaccionaria');
    expireOld();
    const tab = url.searchParams.get('tab') || 'nuevas';
    let list = [];
    if (tab === 'nuevas') {
      const open = db.prepare("SELECT * FROM rfqs WHERE status = 'abierta' AND created_at > ? ORDER BY created_at DESC LIMIT 500").all(now() - 8 * 24 * HOUR);
      for (const r of open) {
        const d = visible(r, s);
        if (d === false) continue;
        const mine = q.myQuote.get(r.id, s.id);
        if (mine && mine.status !== 'retirada') continue;
        list.push(rfqForSupplier(r, s, d, null));
      }
    } else {
      const statuses = tab === 'ganadas' ? ['aceptada'] : ['enviada', 'no_seleccionada', 'retirada'];
      const rows = db.prepare(`SELECT x.* FROM quotes x WHERE x.supplier_id = ? AND x.status IN (${statuses.map(() => '?').join(',')}) ORDER BY x.updated_at DESC LIMIT 100`).all(s.id, ...statuses);
      list = rows.map((x) => { const r = q.rfq.get(x.rfq_id); return rfqForSupplier(r, s, visible(r, s), x); });
    }
    return { tab, rfqs: list };
  });

  route('GET', '/api/supplier/summary', ({ user }) => {
    const s = requireKind(user, 'refaccionaria');
    expireOld();
    const open = db.prepare("SELECT * FROM rfqs WHERE status = 'abierta' AND created_at > ?").all(now() - 8 * 24 * HOUR);
    const nuevas = open.filter((r) => visible(r, s) !== false && !(q.myQuote.get(r.id, s.id)?.status ?? '').match(/enviada|aceptada|no_seleccionada/)).length;
    const ganadas = db.prepare("SELECT COUNT(*) AS n FROM quotes WHERE supplier_id = ? AND status = 'aceptada'").get(s.id).n;
    const catalogo = db.prepare('SELECT COUNT(*) AS n FROM catalog_items WHERE tenant_id = ?').get(s.id).n;
    return { nuevas, ganadas, catalogo, profile: profileOf(s) };
  });

  route('POST', /^\/api\/supplier\/rfqs\/([\w-]+)\/quote$/, ({ user, params, body }) => {
    const s = requireKind(user, 'refaccionaria');
    expireOld();
    const r = q.rfq.get(params[0]);
    if (!r || visible(r, s) === false) throw new HttpError(404, 'Solicitud no encontrada.');
    if (r.status !== 'abierta') throw new HttpError(400, 'La solicitud ya se cerró.');
    const reqItems = JSON.parse(r.items);
    if (!Array.isArray(body.items) || body.items.length !== reqItems.length) throw new HttpError(400, 'Responde cada refacción de la solicitud.');
    const items = body.items.map((it, i) => {
      const available = Boolean(it?.available);
      return {
        available,
        price: available ? num(it.price, `precio de ${reqItems[i].name}`, { min: 0, max: 1e6 }) : null,
        brand: opt(it?.brand, 'marca', 60),
        note: opt(it?.note, 'nota', 120),
      };
    });
    if (!items.some((x) => x.available)) throw new HttpError(400, 'Marca al menos una refacción como disponible.');
    const deliveryCost = num(body.delivery_cost ?? 0, 'costo de envío', { min: 0, max: 1e5 });
    const total = Math.round((items.reduce((sum, x, i) => sum + (x.available ? x.price * reqItems[i].qty : 0), 0) + deliveryCost) * 100) / 100;
    const eta = opt(body.eta, 'tiempo de entrega', 60);
    const notes = opt(body.notes, 'notas', 300);
    const mine = q.myQuote.get(r.id, s.id);
    if (mine && !['enviada', 'retirada'].includes(mine.status)) throw new HttpError(400, 'Ya no puedes cambiar esta cotización.');
    if (mine) {
      db.prepare("UPDATE quotes SET items = ?, total = ?, delivery_cost = ?, eta = ?, notes = ?, status = 'enviada', user_id = ?, updated_at = ? WHERE id = ?")
        .run(JSON.stringify(items), total, deliveryCost, eta, notes, user.id, now(), mine.id);
    } else {
      db.prepare("INSERT INTO quotes (id, rfq_id, supplier_id, user_id, items, total, delivery_cost, eta, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviada', ?, ?)")
        .run(uuid(), r.id, s.id, user.id, JSON.stringify(items), total, deliveryCost, eta, notes, now(), now());
    }
    return { ok: true, total };
  });

  route('POST', /^\/api\/supplier\/quotes\/([\w-]+)\/withdraw$/, ({ user, params }) => {
    const s = requireKind(user, 'refaccionaria');
    const x = q.quote.get(params[0]);
    if (!x || x.supplier_id !== s.id) throw new HttpError(404, 'Cotización no encontrada.');
    if (x.status !== 'enviada') throw new HttpError(400, 'Solo puedes retirar cotizaciones pendientes.');
    db.prepare("UPDATE quotes SET status = 'retirada', updated_at = ? WHERE id = ?").run(now(), x.id);
    return { ok: true };
  });

  /* ---------- catálogo de la refaccionaria ---------- */
  route('GET', '/api/supplier/catalog', ({ user, url }) => {
    const s = requireKind(user, 'refaccionaria');
    const text = url.searchParams.get('q') || '';
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const total = db.prepare('SELECT COUNT(*) AS n FROM catalog_items WHERE tenant_id = ?').get(s.id).n;
    const fq = ftsQuery([text], 'and');
    const items = fq
      ? db.prepare(`SELECT c.* FROM catalog_fts f JOIN catalog_items c ON c.id = f.rowid WHERE catalog_fts MATCH ? AND c.tenant_id = ? ORDER BY bm25(catalog_fts) LIMIT 100 OFFSET ?`).all(fq, s.id, offset)
      : db.prepare('SELECT * FROM catalog_items WHERE tenant_id = ? ORDER BY name LIMIT 100 OFFSET ?').all(s.id, offset);
    return { items, total };
  });

  const upsertItem = db.prepare(`INSERT INTO catalog_items (tenant_id, sku, name, brand, category, oem, fits, price, stock, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (tenant_id, sku) DO UPDATE SET name = excluded.name, brand = excluded.brand, category = excluded.category,
      oem = excluded.oem, fits = excluded.fits, price = excluded.price, stock = excluded.stock, updated_at = excluded.updated_at`);

  route('POST', '/api/supplier/catalog', ({ user, body }) => {
    const s = requireKind(user, 'refaccionaria');
    if (!Array.isArray(body.items) || !body.items.length) throw new HttpError(400, 'No hay artículos para guardar.');
    if (body.items.length > 5000) throw new HttpError(400, 'Máximo 5,000 artículos por carga. Divide el archivo.');
    const count = db.prepare('SELECT COUNT(*) AS n FROM catalog_items WHERE tenant_id = ?').get(s.id).n;
    if (!body.replace && count + body.items.length > 50000) throw new HttpError(400, 'El catálogo admite hasta 50,000 artículos.');
    const rows = body.items.map((it, i) => {
      const line = body.items.length > 1 ? ` (fila ${i + 1})` : '';
      return {
        sku: str(String(it?.sku ?? ''), `código${line}`, { max: 60 }),
        name: str(String(it?.name ?? ''), `nombre${line}`, { max: 160 }),
        brand: opt(it?.brand, `marca${line}`, 60),
        category: opt(it?.category, `categoría${line}`, 60),
        oem: opt(it?.oem, `número de parte${line}`, 200),
        fits: opt(it?.fits, `compatibilidad${line}`, 300),
        price: it?.price === '' || it?.price == null ? null : num(String(it.price).replace(/[$,\s]/g, ''), `precio${line}`, { min: 0, max: 1e6 }),
        stock: it?.stock === '' || it?.stock == null ? null : num(it.stock, `existencia${line}`, { min: 0, max: 1e6, int: true }),
      };
    });
    const t = now();
    db.exec('BEGIN');
    try {
      if (body.replace) {
        const keep = new Set(rows.map((r) => r.sku));
        for (const old of db.prepare('SELECT id, sku FROM catalog_items WHERE tenant_id = ?').all(s.id)) {
          if (!keep.has(old.sku)) db.prepare('DELETE FROM catalog_items WHERE id = ?').run(old.id);
        }
      }
      for (const r of rows) upsertItem.run(s.id, r.sku, r.name, r.brand, r.category, r.oem, r.fits, r.price, r.stock, t);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return { ok: true, saved: rows.length, total: db.prepare('SELECT COUNT(*) AS n FROM catalog_items WHERE tenant_id = ?').get(s.id).n };
  });

  route('DELETE', /^\/api\/supplier\/catalog\/(\d+)$/, ({ user, params }) => {
    const s = requireKind(user, 'refaccionaria');
    const r = db.prepare('DELETE FROM catalog_items WHERE id = ? AND tenant_id = ?').run(Number(params[0]), s.id);
    if (!r.changes) throw new HttpError(404, 'Artículo no encontrado.');
    return { ok: true };
  });

  return { profileOf };
}

module.exports = { registerMarket, haversineKm, reach, ftsQuery, fitsYear, tokens };

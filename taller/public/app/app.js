/* Nau — gestión logística para talleres (sin dependencias, datos en localStorage) */
'use strict';

const KEY = 'nau.v1';
const OLD_KEY = 'nau.v1'; // datos de la demo guardados con el nombre anterior
const HOURS_PER_DAY = 8;

const STATUSES = [
  { id: 'recepcion',  name: 'Recepción' },
  { id: 'diagnostico', name: 'Diagnóstico' },
  { id: 'repuestos',  name: 'Esperando repuestos' },
  { id: 'reparacion', name: 'En reparación' },
  { id: 'control',    name: 'Control de calidad' },
  { id: 'listo',      name: 'Listo para entrega' },
  { id: 'entregado',  name: 'Entregado' },
];
// Al entrar en estos estados se descuentan los repuestos del inventario.
const CONSUME_AT = ['reparacion', 'control', 'listo', 'entregado'];
// Estados en los que el vehículo ocupa una bahía.
const IN_BAY = ['diagnostico', 'reparacion', 'control'];
const PRIORITIES = { alta: 0, media: 1, baja: 2 };

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => isoLocal(new Date());
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—';
let CURRENCY = 'USD';
const money = (n) => (n || 0).toLocaleString('es', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const statusName = (id) => STATUSES.find((s) => s.id === id)?.name || id;
const byId = (arr, id) => arr.find((x) => x.id === id);

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ---------- datos ---------- */
function seed() {
  const sup = [
    { id: 's1', name: 'Repuestos del Sur', phone: '555-0101', email: 'ventas@repsur.com', leadDays: 2 },
    { id: 's2', name: 'Autopartes Global', phone: '555-0202', email: 'pedidos@apglobal.com', leadDays: 4 },
    { id: 's3', name: 'Lubricantes Norte', phone: '555-0303', email: 'contacto@lubnorte.com', leadDays: 1 },
  ];
  const parts = [
    ['FIL-AC-01', 'Filtro de aceite', 'Filtros', 14, 10, 'A1', 's1', 6],
    ['FIL-AI-02', 'Filtro de aire', 'Filtros', 6, 6, 'A1', 's1', 9],
    ['FIL-CB-03', 'Filtro de combustible', 'Filtros', 3, 4, 'A2', 's1', 12],
    ['ACE-5W30', 'Aceite 5W30 (litro)', 'Lubricantes', 40, 30, 'B1', 's3', 8],
    ['ACE-10W40', 'Aceite 10W40 (litro)', 'Lubricantes', 18, 20, 'B1', 's3', 7],
    ['PAS-DEL-01', 'Pastillas de freno delanteras', 'Frenos', 4, 4, 'C1', 's2', 35],
    ['DIS-DEL-01', 'Disco de freno delantero', 'Frenos', 2, 2, 'C2', 's2', 48],
    ['BUJ-IR-01', 'Bujía iridio', 'Encendido', 16, 12, 'D1', 's2', 11],
    ['COR-DIS-01', 'Correa de distribución', 'Motor', 1, 2, 'D3', 's2', 65],
    ['BOM-AGU-01', 'Bomba de agua', 'Motor', 1, 1, 'D3', 's2', 90],
    ['LIQ-REF-01', 'Refrigerante (litro)', 'Lubricantes', 12, 10, 'B2', 's3', 5],
    ['BAT-12V-60', 'Batería 12V 60Ah', 'Eléctrico', 2, 2, 'E1', 's1', 110],
  ].map(([sku, name, category, stock, min, location, supplierId, cost], i) => ({
    id: 'p' + (i + 1), sku, name, category, stock, min, location, supplierId, cost,
  }));
  const mech = [
    { id: 'm1', name: 'Carlos Ruiz', specialty: 'Motor' },
    { id: 'm2', name: 'Ana Torres', specialty: 'Frenos y suspensión' },
    { id: 'm3', name: 'Luis Méndez', specialty: 'Electricidad' },
    { id: 'm4', name: 'Sofía Paz', specialty: 'Mantenimiento general' },
  ];
  const bays = [
    { id: 'b1', name: 'Bahía 1 (elevador)' },
    { id: 'b2', name: 'Bahía 2 (elevador)' },
    { id: 'b3', name: 'Bahía 3' },
    { id: 'b4', name: 'Bahía 4 (diagnóstico)' },
  ];
  const mk = (n, o) => ({
    id: uid(), number: n, createdAt: addDays(-2), history: [{ at: new Date().toISOString(), status: o.status }],
    partsConsumed: CONSUME_AT.includes(o.status), notes: '', ...o,
  });
  const orders = [
    mk(101, { customer: 'María López', phone: '555-1001', vehicle: 'Toyota Corolla 2018', plate: 'ABC123', description: 'Servicio 50.000 km: aceite, filtros y bujías', status: 'reparacion', priority: 'media', mechanicId: 'm4', bayId: 'b3', dueDate: today(), estHours: 3, items: [{ partId: 'p1', qty: 1 }, { partId: 'p2', qty: 1 }, { partId: 'p4', qty: 4 }, { partId: 'p8', qty: 4 }] }),
    mk(102, { customer: 'Jorge Díaz', phone: '555-1002', vehicle: 'Ford Ranger 2020', plate: 'XYZ789', description: 'Ruido al frenar, cambio de pastillas y discos', status: 'diagnostico', priority: 'alta', mechanicId: 'm2', bayId: 'b1', dueDate: addDays(1), estHours: 4, items: [{ partId: 'p6', qty: 1 }, { partId: 'p7', qty: 2 }] }),
    mk(103, { customer: 'Lucía Fernández', phone: '555-1003', vehicle: 'VW Gol 2015', plate: 'JKL456', description: 'Cambio de correa de distribución y bomba de agua', status: 'repuestos', priority: 'alta', mechanicId: 'm1', bayId: '', dueDate: addDays(-1), estHours: 6, items: [{ partId: 'p9', qty: 2 }, { partId: 'p10', qty: 1 }, { partId: 'p11', qty: 4 }] }),
    mk(104, { customer: 'Pedro Gómez', phone: '555-1004', vehicle: 'Chevrolet Onix 2022', plate: 'MNO321', description: 'No arranca por las mañanas', status: 'recepcion', priority: 'media', mechanicId: '', bayId: '', dueDate: addDays(2), estHours: 2, items: [{ partId: 'p12', qty: 1 }] }),
    mk(105, { customer: 'Elena Castro', phone: '555-1005', vehicle: 'Renault Duster 2019', plate: 'PQR654', description: 'Cambio de aceite y filtro', status: 'listo', priority: 'baja', mechanicId: 'm4', bayId: '', dueDate: today(), estHours: 1, items: [] }),
    mk(106, { customer: 'Raúl Herrera', phone: '555-1006', vehicle: 'Nissan Frontier 2017', plate: 'STU987', description: 'Revisión de sistema eléctrico, luces intermitentes', status: 'control', priority: 'media', mechanicId: 'm3', bayId: 'b4', dueDate: addDays(1), estHours: 2, items: [] }),
    mk(107, { customer: 'Carmen Vega', phone: '555-1007', vehicle: 'Hyundai Tucson 2021', plate: 'VWX147', description: 'Servicio completo + filtro de combustible', status: 'recepcion', priority: 'baja', mechanicId: '', bayId: '', dueDate: addDays(3), estHours: 3, items: [{ partId: 'p1', qty: 1 }, { partId: 'p3', qty: 1 }, { partId: 'p5', qty: 5 }] }),
  ];
  const purchases = [
    { id: uid(), number: 501, supplierId: 's3', status: 'pendiente', createdAt: addDays(-1), eta: addDays(0), items: [{ partId: 'p5', qty: 20 }] },
  ];
  return { suppliers: sup, parts, mechanics: mech, bays, orders, purchases, seq: { order: 108, purchase: 502 } };
}

/* ---------- persistencia: local (demo) o nube (cuenta) ---------- */
// En /app/ los datos viven en el servidor; en /demo/ o abriendo el archivo, en este navegador.
const MODE = location.pathname.startsWith('/app') ? 'cloud' : 'local';
const cloud = { me: null, version: 0, timer: null, saving: false, dirty: false };

function load() {
  if (MODE === 'cloud') return emptyData();
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* almacenamiento no disponible */ }
  return seed();
}
function emptyData() {
  return { suppliers: [], parts: [], mechanics: [], bays: [], orders: [], purchases: [], seq: { order: 1, purchase: 1 } };
}
let S = load();
let view = 'panel';
const ui = { search: '', lowOnly: false, mech: '' };

function save() {
  if (MODE === 'local') {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignorar */ }
  } else if (!cloud.me?.access.canWrite) {
    toast('Tu suscripción no está activa: los cambios no se guardan. Elige un plan en Ajustes.');
    pullState();
    return;
  } else {
    cloud.dirty = true;
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(pushState, 400);
  }
  render();
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.startsWith('/api/auth')) { location.href = '/cuenta.html'; throw new Error(json.error); }
  if (!res.ok) { const e = new Error(json.error || 'Error de conexión'); e.status = res.status; e.body = json; throw e; }
  return json;
}

async function pushState() {
  if (cloud.saving) { cloud.timer = setTimeout(pushState, 300); return; }
  cloud.saving = true;
  cloud.dirty = false;
  try {
    const r = await api('PUT', '/api/state', { version: cloud.version, data: S });
    cloud.version = r.version;
  } catch (e) {
    if (e.status === 409) {
      S = e.body.data; cloud.version = e.body.version;
      toast('Otra persona del taller cambió los datos a la vez. Se cargó lo más reciente; revisa tu último cambio.');
      render();
    } else if (e.status === 402 || e.status === 403) {
      toast(e.message);
      await pullState();
    } else {
      cloud.dirty = true;
      toast('Sin conexión con el servidor. Reintentando…');
      cloud.timer = setTimeout(pushState, 4000);
    }
  } finally { cloud.saving = false; }
}

async function pullState() {
  const r = await api('GET', '/api/state');
  S = r.data; cloud.version = r.version;
  render();
}

async function refreshMe() {
  cloud.me = await api('GET', '/api/me');
  const who = $('#who');
  if (who) who.innerHTML = `<span>${esc(cloud.me.tenant.name)}</span><span class="muted small">${esc(cloud.me.user.name)}</span>`;
}

function accessBanner() {
  if (MODE === 'local') {
    return location.pathname.startsWith('/demo')
      ? '<div class="banner info"><span>Estás viendo la <b>demo</b> con datos de ejemplo (se guardan solo en este navegador). <a href="/cuenta.html#registro">Crea tu cuenta gratis</a> para usarla en tu taller.</span></div>'
      : '';
  }
  const a = cloud.me?.access;
  if (!a) return '';
  const go = '<button class="btn sm primary" data-goto-plan>Elegir plan</button>';
  if (a.reason === 'trial') return `<div class="banner ${a.daysLeft <= 3 ? 'warn' : 'info'}"><span>Prueba gratis: te quedan <b>${a.daysLeft} día${a.daysLeft === 1 ? '' : 's'}</b>.</span> ${cloud.me.user.role === 'owner' ? go : ''}</div>`;
  if (a.reason === 'past_due') return `<div class="banner warn"><span>No pudimos cobrar tu suscripción. Actualiza tu medio de pago en Mercado Pago (quedan ${a.daysLeft} días).</span> ${go}</div>`;
  if (a.reason === 'canceled') return `<div class="banner warn"><span>Tu suscripción está cancelada; tienes acceso ${a.daysLeft} días más.</span> ${go}</div>`;
  if (!a.canWrite) return `<div class="banner danger"><span>Tu ${a.reason === 'trial_expired' ? 'prueba gratis terminó' : 'suscripción no está activa'}. Puedes ver tus datos, pero no modificarlos.</span> ${cloud.me.user.role === 'owner' ? go : '<span>Pide al dueño de la cuenta que elija un plan.</span>'}</div>`;
  return '';
}

/* ---------- lógica logística ---------- */
const activeOrders = () => S.orders.filter((o) => o.status !== 'entregado');
const isOverdue = (o) => o.status !== 'entregado' && o.dueDate && o.dueDate < today();

function sortByUrgency(a, b) {
  return (PRIORITIES[a.priority] - PRIORITIES[b.priority]) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.number - b.number;
}

/** Reparte el stock entre las órdenes pendientes por prioridad y fecha. */
function allocation() {
  const avail = Object.fromEntries(S.parts.map((p) => [p.id, p.stock]));
  const reserved = Object.fromEntries(S.parts.map((p) => [p.id, 0]));
  const result = {};
  activeOrders().filter((o) => !o.partsConsumed).sort(sortByUrgency).forEach((o) => {
    const missing = [];
    o.items.forEach((it) => {
      if (!(it.partId in avail)) return;
      reserved[it.partId] += it.qty;
      const take = Math.min(avail[it.partId], it.qty);
      avail[it.partId] -= take;
      if (take < it.qty) missing.push({ partId: it.partId, qty: it.qty - take });
    });
    result[o.id] = { ok: missing.length === 0, missing };
  });
  return { byOrder: result, reserved };
}

function incoming() {
  const inc = {};
  S.purchases.filter((p) => p.status === 'pendiente').forEach((po) =>
    po.items.forEach((it) => { inc[it.partId] = (inc[it.partId] || 0) + it.qty; }));
  return inc;
}

/** Sugerencias de compra: cubrir reservas + stock mínimo, descontando lo que ya viene en camino. */
function purchaseSuggestions() {
  const { reserved } = allocation();
  const inc = incoming();
  const bySupplier = {};
  S.parts.forEach((p) => {
    const need = (reserved[p.id] || 0) + p.min - p.stock - (inc[p.id] || 0);
    if (need > 0) {
      const key = p.supplierId || '_';
      (bySupplier[key] ||= []).push({ partId: p.id, qty: need, forOrders: reserved[p.id] || 0 });
    }
  });
  return bySupplier;
}

function workload() {
  const load = Object.fromEntries(S.mechanics.map((m) => [m.id, 0]));
  activeOrders().filter((o) => !['listo'].includes(o.status)).forEach((o) => {
    if (o.mechanicId in load) load[o.mechanicId] += Number(o.estHours) || 0;
  });
  return load;
}

function setStatus(order, status) {
  if (order.status === status) return;
  if (CONSUME_AT.includes(status) && !order.partsConsumed) {
    const short = order.items.filter((it) => { const p = byId(S.parts, it.partId); return p && p.stock < it.qty; });
    if (short.length) {
      const names = short.map((it) => byId(S.parts, it.partId).name).join(', ');
      toast(`OT #${order.number}: faltan repuestos (${names}). Se movió a "Esperando repuestos".`);
      status = 'repuestos';
    } else {
      order.items.forEach((it) => { const p = byId(S.parts, it.partId); if (p) p.stock -= it.qty; });
      order.partsConsumed = true;
      if (order.items.length) toast(`OT #${order.number}: repuestos retirados del inventario.`);
    }
  }
  if (!IN_BAY.includes(status)) order.bayId = ''; // libera la bahía
  order.status = status;
  order.history.push({ at: new Date().toISOString(), status });
  if (status === 'entregado') order.deliveredAt = today();
  save();
}

function receivePurchase(po) {
  po.items.forEach((it) => { const p = byId(S.parts, it.partId); if (p) p.stock += it.qty; });
  po.status = 'recibida';
  po.receivedAt = today();
  const { byOrder } = allocation();
  const unblocked = S.orders.filter((o) => o.status === 'repuestos' && byOrder[o.id]?.ok);
  save();
  toast(`OC #${po.number} recibida. Stock actualizado.`);
  if (unblocked.length) toast(`Ya hay repuestos para: ${unblocked.map((o) => '#' + o.number).join(', ')}. Pueden pasar a reparación.`);
}

function autoAssign() {
  const load = workload();
  const busyBays = new Set(activeOrders().filter((o) => o.bayId).map((o) => o.bayId));
  let n = 0;
  activeOrders().filter((o) => !['listo'].includes(o.status)).sort(sortByUrgency).forEach((o) => {
    if (!o.mechanicId && S.mechanics.length) {
      const best = S.mechanics.reduce((a, m) => (load[m.id] < load[a.id] ? m : a), S.mechanics[0]);
      o.mechanicId = best.id;
      load[best.id] += Number(o.estHours) || 0;
      n++;
    }
    if (!o.bayId && IN_BAY.includes(o.status)) {
      const free = S.bays.find((b) => !busyBays.has(b.id));
      if (free) { o.bayId = free.id; busyBays.add(free.id); n++; }
    }
  });
  save();
  toast(n ? `Se hicieron ${n} asignaciones automáticas.` : 'No había nada pendiente de asignar.');
}

/* ---------- vistas ---------- */
function render() {
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  const app = $('#app');
  app.innerHTML = accessBanner() + VIEWS[view]();
  BIND[view]?.(app);
  $$('[data-goto-plan]', app).forEach((b) => b.onclick = () => (cloud.me?.user.role === 'owner' ? planModal() : null));
}

const orderTag = (o) => `<b>#${o.number}</b> <span class="plate">${esc(o.plate)}</span>`;

const VIEWS = {
  panel() {
    const act = activeOrders();
    const { byOrder } = allocation();
    const blocked = act.filter((o) => byOrder[o.id] && !byOrder[o.id].ok);
    const overdue = act.filter(isOverdue);
    const ready = act.filter((o) => o.status === 'listo');
    const low = S.parts.filter((p) => p.stock <= p.min);
    const pendPO = S.purchases.filter((p) => p.status === 'pendiente');
    const baysBusy = new Set(act.filter((o) => o.bayId && IN_BAY.includes(o.status)).map((o) => o.bayId)).size;
    const dueToday = act.filter((o) => o.dueDate === today());
    const kpi = (label, value, cls = '') => `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value">${value}</div></div>`;
    const li = (arr, fn, empty) => arr.length ? `<ul class="list">${arr.map(fn).join('')}</ul>` : `<div class="empty">${empty}</div>`;
    return `
      <h1>Panel del taller</h1>
      <p class="sub">${new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <div class="grid kpis">
        ${kpi('Órdenes activas', act.length)}
        ${kpi('Bahías ocupadas', `${baysBusy}/${S.bays.length}`)}
        ${kpi('Listos para entregar', ready.length, ready.length ? 'ok' : '')}
        ${kpi('Atrasadas', overdue.length, overdue.length ? 'danger' : '')}
        ${kpi('Bloqueadas por repuestos', blocked.length, blocked.length ? 'warn' : '')}
        ${kpi('Repuestos bajo mínimo', low.length, low.length ? 'warn' : '')}
      </div>
      <div class="grid two">
        <div class="card"><h2>⚠ Órdenes atrasadas</h2>
          ${li(overdue, (o) => `<li><span>${orderTag(o)} · ${esc(o.customer)}</span><span class="badge danger">vencía ${fmtDate(o.dueDate)}</span></li>`, 'Sin atrasos 🎉')}
        </div>
        <div class="card"><h2>📅 Compromisos de hoy</h2>
          ${li(dueToday, (o) => `<li><span>${orderTag(o)} · ${esc(o.vehicle)}</span><span class="badge ${o.status === 'listo' ? 'ok' : 'info'}">${statusName(o.status)}</span></li>`, 'No hay entregas comprometidas hoy')}
        </div>
        <div class="card"><h2>🔩 Bloqueadas por repuestos</h2>
          ${li(blocked, (o) => `<li><span>${orderTag(o)}<br><span class="muted small">Falta: ${byOrder[o.id].missing.map((m) => `${m.qty}× ${esc(byId(S.parts, m.partId)?.name)}`).join(', ')}</span></span></li>`, 'Todas las órdenes tienen sus repuestos')}
        </div>
        <div class="card"><h2>🚚 Compras en camino</h2>
          ${li(pendPO, (p) => `<li><span><b>OC #${p.number}</b> · ${esc(byId(S.suppliers, p.supplierId)?.name)}</span><span class="badge ${p.eta < today() ? 'danger' : 'info'}">llega ${fmtDate(p.eta)}</span></li>`, 'No hay compras pendientes')}
        </div>
      </div>`;
  },

  ordenes() {
    const { byOrder } = allocation();
    const q = ui.search.toLowerCase();
    const match = (o) => (!q || [o.number, o.plate, o.customer, o.vehicle, o.description].join(' ').toLowerCase().includes(q))
      && (!ui.mech || o.mechanicId === ui.mech);
    const cols = STATUSES.map((s) => {
      let list = S.orders.filter((o) => o.status === s.id && match(o)).sort(sortByUrgency);
      if (s.id === 'entregado') list = list.slice(-8).reverse();
      return `<section class="col" data-status="${s.id}">
        <div class="col-head"><span>${s.name}</span><span class="badge">${list.length}</span></div>
        ${list.map((o) => orderCard(o, byOrder[o.id])).join('') || '<div class="empty small">—</div>'}
      </section>`;
    }).join('');
    return `
      <div class="page-head"><div><h1>Órdenes de trabajo</h1>
        <p class="sub">Arrastra las tarjetas entre columnas o usa el selector de estado.</p></div>
        <button class="btn primary" id="new-order">+ Nueva orden</button></div>
      <div class="toolbar">
        <input id="search" type="search" placeholder="Buscar patente, cliente, OT…" value="${esc(ui.search)}">
        <select id="mech-filter"><option value="">Todos los mecánicos</option>
          ${S.mechanics.map((m) => `<option value="${m.id}" ${ui.mech === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
      </div>
      <div class="kanban">${cols}</div>`;
  },

  planificacion() {
    const load = workload();
    const act = activeOrders();
    const { byOrder } = allocation();
    const queue = act.filter((o) => !['listo'].includes(o.status)).sort((a, b) => (isOverdue(b) - isOverdue(a)) || sortByUrgency(a, b));
    const ready = act.filter((o) => o.status === 'listo').sort(sortByUrgency);
    const mechCards = S.mechanics.map((m) => {
      const h = load[m.id] || 0;
      const pct = Math.round((h / HOURS_PER_DAY) * 100);
      const mine = queue.filter((o) => o.mechanicId === m.id);
      return `<div class="card"><div class="top" style="display:flex;justify-content:space-between">
          <div><b>${esc(m.name)}</b><div class="muted small">${esc(m.specialty)}</div></div>
          <div class="num"><b>${h} h</b><div class="muted small">${(h / HOURS_PER_DAY).toFixed(1)} días</div></div></div>
        <div class="bar ${pct > 100 ? 'over' : pct > 80 ? 'high' : ''}"><span style="width:${Math.min(pct, 100)}%"></span></div>
        <ul class="list small">${mine.map((o) => `<li><span>${orderTag(o)}</span><span class="badge">${statusName(o.status)}</span></li>`).join('') || '<li class="muted">Sin trabajos asignados</li>'}</ul>
      </div>`;
    }).join('');
    const bays = S.bays.map((b) => {
      const o = act.find((x) => x.bayId === b.id && IN_BAY.includes(x.status));
      return `<div class="card bay ${o ? 'busy' : ''}"><b>${esc(b.name)}</b><div class="small" style="margin-top:4px">
        ${o ? `${orderTag(o)}<br><span class="muted">${esc(o.vehicle)} · ${statusName(o.status)}</span>` : '<span class="badge ok">Libre</span>'}</div></div>`;
    }).join('');
    const unassigned = queue.filter((o) => !o.mechanicId).length;
    return `
      <div class="page-head"><div><h1>Planificación</h1>
        <p class="sub">Carga de trabajo, uso de bahías y cola de prioridades.</p></div>
        <button class="btn primary" id="auto-assign">⚡ Auto-asignar (${unassigned} sin mecánico)</button></div>
      <h2>Bahías</h2>
      <div class="grid bays" style="margin-bottom:20px">${bays}</div>
      <h2>Carga por mecánico <span class="muted small">(capacidad ${HOURS_PER_DAY} h/día)</span></h2>
      <div class="grid two" style="margin-bottom:20px">${mechCards}</div>
      <div class="grid two">
        <div class="card"><h2>Cola de trabajo sugerida</h2>
          <p class="muted small">Ordenada por atraso, prioridad y fecha comprometida.</p>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>OT</th><th>Prioridad</th><th>Entrega</th><th>Repuestos</th></tr></thead><tbody>
          ${queue.map((o, i) => {
            const a = byOrder[o.id];
            const parts = o.partsConsumed || !a ? '<span class="badge ok">Retirados</span>' : a.ok ? '<span class="badge ok">OK</span>' : '<span class="badge warn">Faltan</span>';
            return `<tr><td>${i + 1}</td><td>${orderTag(o)}<div class="muted small">${esc(o.vehicle)}</div></td>
              <td>${prioBadge(o.priority)}</td><td><span class="badge ${isOverdue(o) ? 'danger' : ''}">${fmtDate(o.dueDate)}</span></td><td>${parts}</td></tr>`;
          }).join('') || '<tr><td colspan="5" class="empty">Sin trabajos en cola</td></tr>'}
          </tbody></table></div>
        </div>
        <div class="card"><h2>Entregas pendientes</h2>
          <ul class="list">${ready.map((o) => `<li><span>${orderTag(o)} · ${esc(o.customer)}<br><span class="muted small">📞 ${esc(o.phone)}</span></span>
            <button class="btn sm primary" data-deliver="${o.id}">Entregar</button></li>`).join('') || '<div class="empty">Nada listo para entregar</div>'}</ul>
        </div>
      </div>`;
  },

  inventario() {
    const { reserved } = allocation();
    const inc = incoming();
    const q = ui.search.toLowerCase();
    const rows = S.parts
      .filter((p) => (!q || `${p.sku} ${p.name} ${p.category} ${p.location}`.toLowerCase().includes(q)) && (!ui.lowOnly || p.stock <= p.min))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    const value = S.parts.reduce((s, p) => s + p.stock * p.cost, 0);
    return `
      <div class="page-head"><div><h1>Inventario de repuestos</h1>
        <p class="sub">${S.parts.length} artículos · valor en stock ${money(value)}</p></div>
        <button class="btn primary" id="new-part">+ Nuevo repuesto</button></div>
      <div class="toolbar">
        <input id="search" type="search" placeholder="Buscar SKU, nombre, ubicación…" value="${esc(ui.search)}">
        <label class="small"><input type="checkbox" id="low-only" style="width:auto" ${ui.lowOnly ? 'checked' : ''}> Solo bajo mínimo</label>
      </div>
      <div class="card table-wrap"><table>
        <thead><tr><th>SKU</th><th>Repuesto</th><th>Ubic.</th><th class="num">Stock</th><th class="num">Reservado</th><th class="num">Disponible</th><th class="num">Mínimo</th><th class="num">En camino</th><th>Proveedor</th><th></th></tr></thead>
        <tbody>${rows.map((p) => {
          const r = reserved[p.id] || 0;
          const disp = p.stock - r;
          return `<tr class="${p.stock <= p.min ? 'low' : ''}">
            <td><code>${esc(p.sku)}</code></td><td>${esc(p.name)}<div class="muted small">${esc(p.category)}</div></td>
            <td>${esc(p.location)}</td><td class="num"><b>${p.stock}</b></td><td class="num">${r || ''}</td>
            <td class="num"><span class="badge ${disp < 0 ? 'danger' : disp <= p.min ? 'warn' : 'ok'}">${disp}</span></td>
            <td class="num">${p.min}</td><td class="num">${inc[p.id] || ''}</td>
            <td class="small">${esc(byId(S.suppliers, p.supplierId)?.name || '—')}</td>
            <td style="white-space:nowrap"><button class="btn sm" data-adj="${p.id}">± Ajustar</button> <button class="btn sm" data-edit-part="${p.id}">Editar</button></td></tr>`;
        }).join('') || '<tr><td colspan="10" class="empty">Sin resultados</td></tr>'}</tbody>
      </table></div>`;
  },

  compras() {
    const sugg = purchaseSuggestions();
    const keys = Object.keys(sugg);
    const suggCards = keys.map((sid) => {
      const s = byId(S.suppliers, sid);
      const total = sugg[sid].reduce((t, it) => t + it.qty * (byId(S.parts, it.partId)?.cost || 0), 0);
      return `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div><b>${esc(s?.name || 'Sin proveedor')}</b><div class="muted small">${s ? `Entrega en ~${s.leadDays} días · ${esc(s.phone)}` : 'Asigna un proveedor al repuesto'}</div></div>
          ${s ? `<button class="btn sm primary" data-gen-po="${sid}">Generar OC</button>` : ''}</div>
        <table style="margin-top:8px"><tbody>${sugg[sid].map((it) => {
          const p = byId(S.parts, it.partId);
          return `<tr><td>${esc(p.name)}<div class="muted small">stock ${p.stock} · mín ${p.min}${it.forOrders ? ` · reservado ${it.forOrders}` : ''}</div></td><td class="num"><b>${it.qty}</b> u.</td></tr>`;
        }).join('')}</tbody></table>
        <div class="num small muted" style="margin-top:6px">Estimado: <b>${money(total)}</b></div></div>`;
    }).join('');
    const pos = [...S.purchases].sort((a, b) => (a.status === 'pendiente' ? -1 : 1) - (b.status === 'pendiente' ? -1 : 1) || b.number - a.number);
    return `
      <div class="page-head"><div><h1>Compras</h1>
        <p class="sub">Sugerencias automáticas según órdenes abiertas, stock mínimo y pedidos en camino.</p></div>
        <button class="btn" id="new-po">+ Orden de compra manual</button></div>
      <h2>Reposición sugerida</h2>
      <div class="grid two" style="margin-bottom:20px">${suggCards || '<div class="card empty">El inventario está cubierto. No hace falta comprar.</div>'}</div>
      <h2>Órdenes de compra</h2>
      <div class="card table-wrap"><table>
        <thead><tr><th>OC</th><th>Proveedor</th><th>Artículos</th><th>Creada</th><th>Llegada</th><th>Estado</th><th></th></tr></thead>
        <tbody>${pos.map((po) => `<tr><td><b>#${po.number}</b></td><td>${esc(byId(S.suppliers, po.supplierId)?.name)}</td>
          <td class="small">${po.items.map((it) => `${it.qty}× ${esc(byId(S.parts, it.partId)?.name)}`).join('<br>')}</td>
          <td>${fmtDate(po.createdAt)}</td><td>${fmtDate(po.status === 'recibida' ? po.receivedAt : po.eta)}</td>
          <td>${po.status === 'recibida' ? '<span class="badge ok">Recibida</span>' : `<span class="badge ${po.eta < today() ? 'danger' : 'info'}">${po.eta < today() ? 'Atrasada' : 'Pendiente'}</span>`}</td>
          <td style="white-space:nowrap">${po.status === 'pendiente' ? `<button class="btn sm primary" data-receive="${po.id}">Recibir</button> <button class="btn sm danger" data-cancel-po="${po.id}">Anular</button>` : ''}</td></tr>`).join('')
          || '<tr><td colspan="7" class="empty">Aún no hay órdenes de compra</td></tr>'}</tbody>
      </table></div>`;
  },

  ajustes() {
    const section = (title, kind, items, fmt) => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>${title}</h2>
      <button class="btn sm" data-add="${kind}">+ Añadir</button></div>
      <ul class="list">${items.map((x) => `<li><span>${fmt(x)}</span><span style="white-space:nowrap"><button class="btn sm" data-edit="${kind}:${x.id}">Editar</button> <button class="btn sm danger" data-del="${kind}:${x.id}">✕</button></span></li>`).join('') || '<div class="empty">Vacío</div>'}</ul></div>`;
    return `
      <h1>Ajustes</h1><p class="sub">${MODE === 'cloud' ? 'Cuenta, equipo, instalaciones, proveedores y datos.' : 'Equipo, instalaciones, proveedores y datos.'}</p>
      ${MODE === 'cloud' ? accountSection() : ''}
      <div class="grid two">
        ${section('Mecánicos', 'mechanics', S.mechanics, (m) => `<b>${esc(m.name)}</b> <span class="muted small">${esc(m.specialty)}</span>`)}
        ${section('Bahías / puestos', 'bays', S.bays, (b) => esc(b.name))}
        ${section('Proveedores', 'suppliers', S.suppliers, (s) => `<b>${esc(s.name)}</b><br><span class="muted small">${esc(s.phone)} · ${esc(s.email)} · ${s.leadDays} días</span>`)}
        <div class="card"><h2>Datos</h2>
          <p class="muted small">${MODE === 'cloud' ? 'Tus datos se guardan en la nube y los ve todo tu equipo. Puedes descargar una copia cuando quieras.' : 'Los datos se guardan en este navegador. Exporta una copia de seguridad con regularidad.'}</p>
          <div class="toolbar"><button class="btn" id="export">⬇ Exportar JSON</button>
          <label class="btn">⬆ Importar JSON<input type="file" id="import" accept="application/json" hidden></label>
          <button class="btn danger" id="reset">${MODE === 'cloud' ? 'Cargar datos de ejemplo' : 'Restaurar datos de ejemplo'}</button></div></div>
      </div>`;
  },
};

function prioBadge(p) {
  return `<span class="badge ${p === 'alta' ? 'danger' : p === 'media' ? 'warn' : ''}">${p}</span>`;
}

function orderCard(o, alloc) {
  const mech = byId(S.mechanics, o.mechanicId);
  const bay = byId(S.bays, o.bayId);
  const blocked = alloc && !alloc.ok;
  return `<article class="ocard ${isOverdue(o) ? 'overdue' : blocked ? 'blocked' : ''}" draggable="true" data-id="${o.id}">
    <div class="top"><span>${orderTag(o)}</span>${prioBadge(o.priority)}</div>
    <div>${esc(o.vehicle)} · <span class="muted">${esc(o.customer)}</span></div>
    <div class="desc">${esc(o.description)}</div>
    <div class="meta">
      <span class="badge ${isOverdue(o) ? 'danger' : ''}">📅 ${fmtDate(o.dueDate)}</span>
      ${mech ? `<span class="badge info">👤 ${esc(mech.name.split(' ')[0])}</span>` : '<span class="badge warn">Sin mecánico</span>'}
      ${bay ? `<span class="badge">${esc(bay.name.split(' (')[0])}</span>` : ''}
      ${o.items.length ? (o.partsConsumed ? '<span class="badge ok">Repuestos ✓</span>' : blocked ? '<span class="badge warn">Faltan repuestos</span>' : '<span class="badge ok">Repuestos OK</span>') : ''}
    </div>
    <select data-move="${o.id}" aria-label="Cambiar estado">${STATUSES.map((s) => `<option value="${s.id}" ${s.id === o.status ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
  </article>`;
}

/* ---------- modal genérico ---------- */
let modalSubmit = null;
function openModal(title, html, onSubmit, okText = 'Guardar') {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('#modal-ok').textContent = okText;
  modalSubmit = onSubmit;
  $('#modal').showModal();
}
$('#modal-cancel').addEventListener('click', () => $('#modal').close());
$('#modal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (modalSubmit && modalSubmit(data, e.target) !== false) $('#modal').close();
});

const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const selectField = (label, name, options, value) =>
  `<label class="field">${label}<select name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;

function itemsEditor(items, disabled) {
  const opts = (sel) => S.parts.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)} (stock ${p.stock})</option>`).join('');
  const row = (it = { partId: S.parts[0]?.id, qty: 1 }) => `<div class="items-row">
    <select class="it-part" ${disabled}>${opts(it.partId)}</select>
    <input class="it-qty" type="number" min="1" value="${it.qty}" ${disabled}>
    <button type="button" class="btn sm danger it-del" ${disabled}>✕</button></div>`;
  return { html: `<div id="items">${items.map(row).join('')}</div>${disabled ? '<p class="muted small">Los repuestos ya fueron retirados del inventario.</p>' : '<button type="button" class="btn sm" id="add-item">+ Añadir repuesto</button>'}`, row };
}
function readItems(form) {
  const merged = {};
  $$('.items-row', form).forEach((r) => {
    const id = $('.it-part', r).value;
    const q = Math.max(1, parseInt($('.it-qty', r).value, 10) || 1);
    if (id) merged[id] = (merged[id] || 0) + q;
  });
  return Object.entries(merged).map(([partId, qty]) => ({ partId, qty }));
}
function bindItemsEditor(row) {
  const box = $('#items');
  $('#add-item')?.addEventListener('click', () => box.insertAdjacentHTML('beforeend', row()));
  box.addEventListener('click', (e) => { if (e.target.classList.contains('it-del')) e.target.closest('.items-row').remove(); });
}

function orderModal(o) {
  const isNew = !o;
  o = o || { customer: '', phone: '', vehicle: '', plate: '', description: '', priority: 'media', mechanicId: '', bayId: '', dueDate: addDays(1), estHours: 2, items: [], status: 'recepcion' };
  const ed = itemsEditor(o.items, o.partsConsumed ? 'disabled' : '');
  const html = `
    <div class="row2">${field('Cliente', 'customer', o.customer, 'text', 'required')}${field('Teléfono', 'phone', o.phone, 'tel')}</div>
    <div class="row2">${field('Vehículo', 'vehicle', o.vehicle, 'text', 'required placeholder="Marca Modelo Año"')}${field('Patente / matrícula', 'plate', o.plate, 'text', 'required')}</div>
    <label class="field">Trabajo a realizar<textarea name="description">${esc(o.description)}</textarea></label>
    <div class="row2">${selectField('Prioridad', 'priority', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], o.priority)}
      ${field('Fecha comprometida', 'dueDate', o.dueDate, 'date')}</div>
    <div class="row2">${selectField('Mecánico', 'mechanicId', [['', '— Sin asignar —'], ...S.mechanics.map((m) => [m.id, m.name])], o.mechanicId)}
      ${selectField('Bahía', 'bayId', [['', '— Ninguna —'], ...S.bays.map((b) => [b.id, b.name])], o.bayId)}</div>
    <div class="row2">${field('Horas estimadas', 'estHours', o.estHours, 'number', 'min="0" step="0.5"')}
      ${isNew ? '' : `<label class="field">Estado<input value="${esc(statusName(o.status))}" disabled></label>`}</div>
    <h3>Repuestos necesarios</h3>${ed.html}
    ${isNew ? '' : `<p class="small muted" style="margin-top:12px">Historial: ${o.history.map((h) => `${statusName(h.status)} (${new Date(h.at).toLocaleDateString('es')})`).join(' → ')}</p>
      <button type="button" class="btn sm danger" id="del-order">Eliminar orden</button>`}`;
  openModal(isNew ? 'Nueva orden de trabajo' : `Orden #${o.number}`, html, (d, form) => {
    const items = o.partsConsumed ? o.items : readItems(form);
    const patch = { ...d, plate: d.plate.toUpperCase(), estHours: Number(d.estHours) || 0, items };
    if (isNew) {
      S.orders.push({ ...o, ...patch, id: uid(), number: S.seq.order++, createdAt: today(), partsConsumed: false, notes: '', history: [{ at: new Date().toISOString(), status: 'recepcion' }] });
      toast('Orden creada.');
    } else Object.assign(o, patch);
    save();
  });
  bindItemsEditor(ed.row);
  $('#del-order')?.addEventListener('click', () => {
    if (!confirm(`¿Eliminar la orden #${o.number}?`)) return;
    S.orders = S.orders.filter((x) => x.id !== o.id);
    $('#modal').close();
    save();
  });
}

function partModal(p) {
  const isNew = !p;
  p = p || { sku: '', name: '', category: '', stock: 0, min: 1, location: '', supplierId: S.suppliers[0]?.id || '', cost: 0 };
  openModal(isNew ? 'Nuevo repuesto' : `Editar ${p.name}`, `
    <div class="row2">${field('SKU / código', 'sku', p.sku, 'text', 'required')}${field('Nombre', 'name', p.name, 'text', 'required')}</div>
    <div class="row2">${field('Categoría', 'category', p.category)}${field('Ubicación (estante)', 'location', p.location)}</div>
    <div class="row2">${field('Stock actual', 'stock', p.stock, 'number', 'min="0"')}${field('Stock mínimo', 'min', p.min, 'number', 'min="0"')}</div>
    <div class="row2">${selectField('Proveedor', 'supplierId', [['', '—'], ...S.suppliers.map((s) => [s.id, s.name])], p.supplierId)}${field('Costo unitario', 'cost', p.cost, 'number', 'min="0" step="0.01"')}</div>
    ${isNew ? '' : '<button type="button" class="btn sm danger" id="del-part">Eliminar repuesto</button>'}`, (d) => {
    const patch = { ...d, stock: +d.stock || 0, min: +d.min || 0, cost: +d.cost || 0 };
    if (isNew) S.parts.push({ id: uid(), ...patch }); else Object.assign(p, patch);
    save();
  });
  $('#del-part')?.addEventListener('click', () => {
    const used = activeOrders().some((o) => !o.partsConsumed && o.items.some((i) => i.partId === p.id));
    if (used) return alert('Este repuesto está reservado en órdenes abiertas.');
    if (!confirm(`¿Eliminar ${p.name}?`)) return;
    S.parts = S.parts.filter((x) => x.id !== p.id);
    $('#modal').close();
    save();
  });
}

function adjustModal(p) {
  openModal(`Ajustar stock: ${p.name}`, `
    <p class="muted">Stock actual: <b>${p.stock}</b></p>
    <div class="row2">${selectField('Movimiento', 'type', [['in', 'Entrada (+)'], ['out', 'Salida (−)'], ['set', 'Conteo físico (=)']], 'in')}
    ${field('Cantidad', 'qty', 1, 'number', 'min="0" required')}</div>
    ${field('Motivo', 'reason', '', 'text', 'placeholder="Ej.: devolución, merma, inventario"')}`, (d) => {
    const q = Math.max(0, parseInt(d.qty, 10) || 0);
    p.stock = d.type === 'in' ? p.stock + q : d.type === 'out' ? Math.max(0, p.stock - q) : q;
    save();
    toast(`${p.name}: stock ahora ${p.stock}.`);
  }, 'Aplicar');
}

function poModal(supplierId, items) {
  const ed = itemsEditor(items || [], '');
  const sup = byId(S.suppliers, supplierId) || S.suppliers[0];
  openModal('Orden de compra', `
    <div class="row2">${selectField('Proveedor', 'supplierId', S.suppliers.map((s) => [s.id, s.name]), sup?.id)}
    ${field('Llegada estimada', 'eta', addDays(sup?.leadDays ?? 2), 'date')}</div>
    <h3>Artículos</h3>${ed.html}`, (d, form) => {
    const its = readItems(form);
    if (!its.length) { alert('Añade al menos un artículo.'); return false; }
    S.purchases.push({ id: uid(), number: S.seq.purchase++, supplierId: d.supplierId, status: 'pendiente', createdAt: today(), eta: d.eta, items: its });
    save();
    toast('Orden de compra creada.');
  }, 'Crear OC');
  bindItemsEditor(ed.row);
}

const ENTITY = {
  mechanics: { title: 'Mecánico', fields: [['Nombre', 'name'], ['Especialidad', 'specialty']] },
  bays: { title: 'Bahía', fields: [['Nombre', 'name']] },
  suppliers: { title: 'Proveedor', fields: [['Nombre', 'name'], ['Teléfono', 'phone'], ['Email', 'email'], ['Días de entrega', 'leadDays', 'number']] },
};
function entityModal(kind, item) {
  const cfg = ENTITY[kind];
  openModal(`${item ? 'Editar' : 'Nuevo'} ${cfg.title.toLowerCase()}`, cfg.fields.map(([l, n, t]) => field(l, n, item?.[n] ?? '', t || 'text', n === 'name' ? 'required' : '')).join(''), (d) => {
    if (d.leadDays !== undefined) d.leadDays = +d.leadDays || 0;
    if (item) Object.assign(item, d); else S[kind].push({ id: uid(), ...d });
    save();
  });
}

/* ---------- cuenta y suscripción (modo nube) ---------- */
const STATUS_TXT = { trial: ['Prueba gratis', 'info'], active: ['Activa', 'ok'], past_due: ['Pago pendiente', 'warn'], canceled: ['Cancelada', 'danger'] };
const fmtMs = (ms) => (ms ? new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

function accountSection() {
  const m = cloud.me;
  if (!m) return '';
  const owner = m.user.role === 'owner';
  const t = m.tenant;
  const [stTxt, stCls] = STATUS_TXT[t.status] || [t.status, ''];
  const detail = t.status === 'trial' ? `La prueba termina el ${fmtMs(t.trialEndsAt)}.`
    : t.status === 'active' ? (t.currentPeriodEnd ? `${t.hasSubscription ? 'Próximo cobro' : 'Activa hasta'}: ${fmtMs(t.currentPeriodEnd)}.` : '')
      : t.status === 'canceled' ? `Acceso hasta el ${fmtMs(t.currentPeriodEnd)}.` : `Plazo para regularizar: ${fmtMs(t.graceUntil)}.`;
  return `<div class="grid two" style="margin-bottom:16px">
    <div class="card"><h2>Suscripción</h2>
      <p><b>${esc(t.name)}</b> · Plan ${esc(m.limits.name)} <span class="badge ${stCls}">${stTxt}</span></p>
      <p class="muted small">${detail} Límite: ${m.limits.maxUsers} usuarios, ${m.limits.maxBays ?? 'sin límite de'} bahías.</p>
      ${owner ? `<div class="toolbar"><button class="btn primary" data-goto-plan>${t.status === 'active' ? 'Cambiar de plan' : 'Elegir plan y pagar'}</button>
        ${t.status === 'active' ? '<button class="btn danger" id="cancel-sub">Cancelar suscripción</button>' : ''}</div>
        ${m.billing.simulated ? '<p class="small badge warn">Modo de prueba: los pagos se simulan</p>' : '<p class="muted small">Cobro mensual automático con Mercado Pago. Puedes cancelar cuando quieras.</p>'}`
    : '<p class="muted small">Solo el dueño de la cuenta puede gestionar la suscripción.</p>'}
    </div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Usuarios del taller</h2>
      ${owner ? '<button class="btn sm" id="add-user">+ Invitar</button>' : ''}</div>
      <div id="users-list" class="muted small">Cargando…</div>
      <div class="toolbar" style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <span class="small">Sesión: <b>${esc(m.user.name)}</b> (${esc(m.user.email)})</span>
        <button class="btn sm" id="my-password">Cambiar contraseña</button>
        <button class="btn sm" id="logout">Cerrar sesión</button>
        ${m.isAdmin ? '<a class="btn sm" href="/admin.html">Panel de administración</a>' : ''}</div>
    </div></div>`;
}

async function loadUsers() {
  const box = $('#users-list');
  if (!box) return;
  try {
    const r = await api('GET', '/api/users');
    const owner = cloud.me.user.role === 'owner';
    box.className = '';
    box.innerHTML = `<ul class="list">${r.users.map((u) => `<li><span><b>${esc(u.name)}</b> <span class="badge">${u.role === 'owner' ? 'Dueño' : 'Equipo'}</span><br><span class="muted small">${esc(u.email)}</span></span>
      ${owner && u.id !== cloud.me.user.id ? `<span style="white-space:nowrap"><button class="btn sm" data-reset-pw="${u.id}">Nueva clave</button> <button class="btn sm danger" data-del-user="${u.id}">✕</button></span>` : ''}</li>`).join('')}</ul>
      <p class="muted small">${r.users.length} de ${r.max} usuarios de tu plan.</p>`;
    $$('[data-del-user]', box).forEach((b) => b.onclick = async () => {
      if (!confirm('¿Quitar el acceso a este usuario?')) return;
      try { await api('DELETE', `/api/users/${b.dataset.delUser}`); loadUsers(); } catch (e) { toast(e.message); }
    });
    $$('[data-reset-pw]', box).forEach((b) => b.onclick = () => openModal('Nueva contraseña', field('Contraseña nueva (mín. 8 caracteres)', 'password', '', 'text', 'required minlength="8"'), (d) => {
      api('POST', `/api/users/${b.dataset.resetPw}/password`, d).then(() => toast('Contraseña actualizada. Compártela con la persona.')).catch((e) => toast(e.message));
    }));
  } catch (e) { box.textContent = e.message; }
}

function asyncModal(fn) {
  // Mantiene el modal abierto mientras se espera al servidor.
  return (d, form) => {
    const ok = $('#modal-ok');
    ok.disabled = true;
    fn(d, form).then(() => $('#modal').close()).catch((e) => toast(e.message)).finally(() => { ok.disabled = false; });
    return false;
  };
}

async function planModal() {
  let info;
  try { info = await api('GET', '/api/plans'); } catch (e) { return toast(e.message); }
  const m = cloud.me;
  const current = m.tenant.status === 'active' ? m.tenant.plan : '';
  const fmt = (n) => n.toLocaleString('es', { style: 'currency', currency: info.currency, maximumFractionDigits: 0 });
  const needsPayer = !m.tenant.hasSubscription && !m.billing.simulated;
  openModal('Elige tu plan', `
    <div class="plan-pick">${info.plans.map((p) => `<label class="plan-opt">
      <input type="radio" name="plan" value="${p.id}" ${p.id === (current || 'profesional') ? 'checked' : ''}>
      <span><b>${esc(p.name)}</b> ${p.id === current ? '<span class="badge ok">Actual</span>' : ''}<br>
      <span class="price">${fmt(p.price)}</span><span class="muted small"> / mes</span>
      <span class="muted small" style="display:block">${p.features.map(esc).join(' · ')}</span></span></label>`).join('')}</div>
    ${needsPayer ? field('Email de tu cuenta de Mercado Pago', 'payerEmail', m.tenant.payerEmail || m.user.email, 'email', 'required') + '<p class="muted small">Te llevaremos a Mercado Pago para autorizar el cobro mensual. Debe ser el email con el que entras a Mercado Pago.</p>' : ''}
    ${m.tenant.hasSubscription ? '<p class="muted small">El nuevo importe se aplicará desde el próximo cobro.</p>' : ''}`,
  asyncModal(async (d) => {
    const r = await api('POST', '/api/billing/checkout', d);
    location.href = r.url;
  }), m.tenant.hasSubscription ? 'Cambiar plan' : 'Continuar al pago');
}

function bindAccount(app) {
  loadUsers();
  $('#add-user', app)?.addEventListener('click', () => openModal('Invitar a un usuario', `
    <div class="row2">${field('Nombre', 'name', '', 'text', 'required')}${field('Email', 'email', '', 'email', 'required')}</div>
    <div class="row2">${field('Contraseña inicial (mín. 8)', 'password', '', 'text', 'required minlength="8"')}
    ${selectField('Rol', 'role', [['staff', 'Equipo (opera el taller)'], ['owner', 'Dueño (también gestiona pagos y usuarios)']], 'staff')}</div>
    <p class="muted small">Comparte el email y la contraseña con la persona; podrá cambiarla al entrar.</p>`,
  asyncModal(async (d) => { await api('POST', '/api/users', d); toast('Usuario creado.'); loadUsers(); }), 'Crear usuario'));
  $('#my-password', app)?.addEventListener('click', () => openModal('Cambiar mi contraseña',
    field('Contraseña actual', 'current', '', 'password', 'required') + field('Contraseña nueva (mín. 8)', 'next', '', 'password', 'required minlength="8"'),
    asyncModal(async (d) => { await api('POST', '/api/me/password', d); toast('Contraseña cambiada.'); })));
  $('#logout', app)?.addEventListener('click', async () => {
    if (cloud.dirty || cloud.saving) await pushState();
    await api('POST', '/api/auth/logout', {});
    location.href = '/';
  });
  $('#cancel-sub', app)?.addEventListener('click', async () => {
    if (!confirm('¿Cancelar la suscripción? No se harán más cobros. Mantendrás el acceso hasta el fin del período pagado.')) return;
    try { cloud.me = await api('POST', '/api/billing/cancel', {}); toast('Suscripción cancelada.'); render(); } catch (e) { toast(e.message); }
  });
}

/* ---------- eventos por vista ---------- */
function bindSearch(app) {
  const s = $('#search', app);
  if (!s) return;
  s.addEventListener('input', () => { ui.search = s.value; const pos = s.selectionStart; render(); const n = $('#search'); n.focus(); n.setSelectionRange(pos, pos); });
}

const BIND = {
  ordenes(app) {
    bindSearch(app);
    $('#new-order', app).onclick = () => orderModal();
    $('#mech-filter', app).onchange = (e) => { ui.mech = e.target.value; render(); };
    $$('.ocard', app).forEach((c) => {
      c.addEventListener('click', (e) => { if (e.target.tagName !== 'SELECT') orderModal(byId(S.orders, c.dataset.id)); });
      c.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', c.dataset.id));
    });
    $$('[data-move]', app).forEach((s) => s.addEventListener('change', () => setStatus(byId(S.orders, s.dataset.move), s.value)));
    $$('.col', app).forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        const o = byId(S.orders, e.dataTransfer.getData('text/plain'));
        if (o) setStatus(o, col.dataset.status);
      });
    });
  },
  planificacion(app) {
    $('#auto-assign', app).onclick = autoAssign;
    $$('[data-deliver]', app).forEach((b) => b.onclick = () => setStatus(byId(S.orders, b.dataset.deliver), 'entregado'));
  },
  inventario(app) {
    bindSearch(app);
    $('#new-part', app).onclick = () => partModal();
    $('#low-only', app).onchange = (e) => { ui.lowOnly = e.target.checked; render(); };
    $$('[data-adj]', app).forEach((b) => b.onclick = () => adjustModal(byId(S.parts, b.dataset.adj)));
    $$('[data-edit-part]', app).forEach((b) => b.onclick = () => partModal(byId(S.parts, b.dataset.editPart)));
  },
  compras(app) {
    const sugg = purchaseSuggestions();
    $('#new-po', app).onclick = () => poModal();
    $$('[data-gen-po]', app).forEach((b) => b.onclick = () => poModal(b.dataset.genPo, sugg[b.dataset.genPo].map(({ partId, qty }) => ({ partId, qty }))));
    $$('[data-receive]', app).forEach((b) => b.onclick = () => receivePurchase(byId(S.purchases, b.dataset.receive)));
    $$('[data-cancel-po]', app).forEach((b) => b.onclick = () => {
      if (confirm('¿Anular esta orden de compra?')) { S.purchases = S.purchases.filter((p) => p.id !== b.dataset.cancelPo); save(); }
    });
  },
  ajustes(app) {
    if (MODE === 'cloud') bindAccount(app);
    $$('[data-add]', app).forEach((b) => b.onclick = () => entityModal(b.dataset.add));
    $$('[data-edit]', app).forEach((b) => b.onclick = () => { const [k, id] = b.dataset.edit.split(':'); entityModal(k, byId(S[k], id)); });
    $$('[data-del]', app).forEach((b) => b.onclick = () => {
      const [k, id] = b.dataset.del.split(':');
      if (!confirm('¿Eliminar este registro?')) return;
      S[k] = S[k].filter((x) => x.id !== id);
      const ref = { mechanics: 'mechanicId', bays: 'bayId' }[k];
      if (ref) S.orders.forEach((o) => { if (o[ref] === id) o[ref] = ''; });
      if (k === 'suppliers') S.parts.forEach((p) => { if (p.supplierId === id) p.supplierId = ''; });
      save();
    });
    $('#export', app).onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
      a.download = `nau-${today()}.json`;
      a.click();
    };
    $('#import', app).onchange = async (e) => {
      try {
        const data = JSON.parse(await e.target.files[0].text());
        if (!Array.isArray(data.orders) || !Array.isArray(data.parts)) throw new Error('formato');
        S = data; save(); toast('Datos importados.');
      } catch { alert('El archivo no es una copia válida de Nau.'); }
    };
    $('#reset', app).onclick = () => { if (confirm('Se reemplazarán todos los datos por los de ejemplo. ¿Continuar?')) { S = seed(); save(); } };
  },
};

$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]');
  if (!b) return;
  view = b.dataset.view;
  ui.search = '';
  render();
});

async function pollState() {
  const busy = cloud.dirty || cloud.saving || $('#modal').open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (busy || document.hidden) return;
  try {
    const { version } = await api('GET', '/api/state/version');
    if (version > cloud.version) await pullState();
  } catch { /* sin conexión: se reintenta en el próximo ciclo */ }
}

async function init() {
  if (MODE === 'local') {
    render();
    if (location.protocol.startsWith('http')) {
      fetch('/api/plans').then((r) => r.json()).then((p) => { CURRENCY = p.currency; render(); }).catch(() => {});
    }
    return;
  }
  $('#app').innerHTML = '<div class="empty">Cargando tu taller…</div>';
  try { await refreshMe(); } catch { return; }
  CURRENCY = cloud.me.billing.currency;
  const params = new URLSearchParams(location.search);
  if (params.get('preapproval_id')) {
    try { cloud.me = await api('POST', '/api/billing/sync', { preapprovalId: params.get('preapproval_id') }); } catch (e) { toast(e.message); }
    toast(cloud.me.tenant.status === 'active' ? '¡Suscripción activa! Gracias por confiar en Nau.' : 'Recibimos tu autorización. La activaremos en cuanto Mercado Pago lo confirme.');
  } else if (params.get('pago') === 'simulado') toast('Pago simulado: suscripción activada (modo de prueba).');
  else if (params.get('plan') === 'actualizado') toast('Plan actualizado.');
  if ([...params.keys()].length) history.replaceState(null, '', '/app/');
  await pullState();
  if (!S.orders.length && !S.parts.length && !S.mechanics.length) {
    toast('¡Bienvenido! Empieza en Ajustes: carga tus mecánicos, bahías y proveedores, o prueba con datos de ejemplo.');
  }
  setInterval(pollState, 15000);
  setInterval(() => refreshMe().catch(() => {}), 5 * 60000);
  window.addEventListener('beforeunload', (e) => { if (cloud.dirty || cloud.saving) { e.preventDefault(); e.returnValue = ''; } });
}

init();

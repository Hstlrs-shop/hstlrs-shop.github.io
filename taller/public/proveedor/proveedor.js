/* Nau — portal de refaccionarias: solicitudes de talleres cercanos, cotizaciones, ventas y catálogo. */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const fmtWhen = (ms) => new Date(ms).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const distTxt = (d) => (d === null || d === undefined ? 'en tu municipio' : `a ${d.toLocaleString('es-MX')} km`);
const NEEDED = { hoy: ['Hoy', 'danger'], manana: ['Mañana', 'warn'], semana: ['Esta semana', ''] };
const ETAS = ['Inmediato (en existencia)', 'Hoy mismo', 'Mañana', '2 a 3 días', 'Bajo pedido (más de 3 días)'];

const st = { view: 'nuevas', me: null, summary: null, data: {}, catQ: '', catOffset: 0 };

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4500);
}
async function api(method, url, body) {
  const res = await fetch(url, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) { location.href = '/cuenta.html'; throw new Error(json.error); }
  if (!res.ok) throw new Error(json.error || 'Error de conexión');
  return json;
}

/* ---------- modal ---------- */
let modalSubmit = null;
function openModal(title, html, onSubmit, okText = 'Guardar') {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('#modal-ok').textContent = okText;
  modalSubmit = onSubmit;
  $('#modal').showModal();
}
$('#modal-cancel').addEventListener('click', () => $('#modal').close());
$('#modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ok = $('#modal-ok');
  ok.disabled = true;
  try {
    if (modalSubmit) await modalSubmit(Object.fromEntries(new FormData(e.target)), e.target);
    $('#modal').close();
  } catch (ex) { toast(ex.message); } finally { ok.disabled = false; }
});
const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;

/* ---------- datos ---------- */
async function loadSummary() {
  try {
    st.summary = await api('GET', '/api/supplier/summary');
    const n = st.summary.nuevas;
    $('#nav button[data-view="nuevas"]').innerHTML = `Solicitudes${n ? ` <span class="nav-badge">${n}</span>` : ''}`;
    document.title = `${n ? `(${n}) ` : ''}Nau para refaccionarias`;
  } catch { /* sin conexión */ }
}
async function load(view) {
  if (['nuevas', 'enviadas', 'ganadas'].includes(view)) st.data[view] = (await api('GET', `/api/supplier/rfqs?tab=${view}`)).rfqs;
  if (view === 'catalogo') st.data.catalogo = await api('GET', `/api/supplier/catalog?q=${encodeURIComponent(st.catQ)}&offset=${st.catOffset}`);
  if (view === 'perfil') st.data.perfil = await api('GET', '/api/profile');
}
async function go(view) {
  st.view = view;
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  if (!st.data[view]) $('#app').innerHTML = '<div class="empty">Cargando…</div>';
  try { await load(view); } catch (e) { toast(e.message); }
  render();
}

/* ---------- vistas ---------- */
const itemsList = (r) => `<ul class="list small">${r.items.map((it) => `<li><span><b>${it.qty}×</b> ${esc(it.name)}${it.notes ? ` <span class="muted">· ${esc(it.notes)}</span>` : ''}</span></li>`).join('')}</ul>`;
const rfqMeta = (r) => {
  const [nTxt, nCls] = NEEDED[r.needed] || ['', ''];
  return `<div class="meta">${r.direct ? '<span class="badge info">Te la pidieron a ti</span>' : ''}
    <span class="badge ${nCls}">La necesitan: ${nTxt}</span>
    <span class="badge">${r.delivery === 'domicilio' ? 'Entrega a domicilio' : 'Pasan a recoger'}</span>
    <span class="badge">${esc(r.taller.colonia || r.taller.municipio || '')} · ${distTxt(r.distance_km)}</span></div>`;
};

const VIEWS = {
  nuevas() {
    const list = st.data.nuevas || [];
    const p = st.summary?.profile;
    let warn = '';
    if (p && !Number.isFinite(p.lat)) warn = '<div class="banner warn"><span>Solo ves solicitudes de talleres de tu municipio. Agrega tu ubicación exacta en <b>Perfil</b> para recibir las de talleres cercanos de otros municipios.</span></div>';
    if (st.summary && !st.summary.catalogo) warn += '<div class="banner info"><span>Sube tu catálogo para aparecer en el buscador de los talleres y recibir pedidos directos.</span> <button class="btn sm primary" data-go="catalogo">Subir catálogo</button></div>';
    return `<div class="page-head"><div><h1>Solicitudes de talleres cercanos</h1>
      <p class="sub">Cotiza rápido: los talleres comparan respuestas y suelen comprar a quien responde primero con existencia.</p></div>
      <button class="btn" id="refresh">↻ Actualizar</button></div>${warn}
      ${list.length ? `<div class="grid two">${list.map((r) => `<div class="card rfq-card">
        <div style="display:flex;justify-content:space-between;gap:8px"><div><b>${esc(r.taller.name)}</b> <span class="muted small">· solicitud #${r.number}</span>
          <div class="muted small">${fmtWhen(r.created_at)} · cierra ${fmtWhen(r.expires_at)}</div></div></div>
        ${r.vehicle ? `<p class="small" style="margin:8px 0 0"><b>🚗 ${esc(r.vehicle)}</b>${r.vin ? ` · VIN ${esc(r.vin)}` : ''}</p>` : ''}
        ${itemsList(r)}${r.notes ? `<p class="small muted">“${esc(r.notes)}”</p>` : ''}${rfqMeta(r)}
        <div class="toolbar" style="margin:10px 0 0"><button class="btn primary" data-quote="${r.id}">Cotizar</button></div></div>`).join('')}</div>`
    : '<div class="card empty-state"><p><b>No hay solicitudes nuevas.</b></p><p class="muted">Cuando un taller cercano pida refacciones aparecerán aquí. Esta página se actualiza sola.</p></div>'}`;
  },
  enviadas() {
    const list = st.data.enviadas || [];
    const ST = { enviada: ['Esperando al taller', 'info'], no_seleccionada: ['El taller eligió otra', ''], retirada: ['Retirada', ''] };
    return `<h1>Cotizaciones enviadas</h1><p class="sub">Puedes corregir o retirar una cotización mientras el taller no decide.</p>
      ${list.length ? `<div class="card table-wrap"><table><thead><tr><th>Taller</th><th>Refacciones</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead><tbody>
      ${list.map((r) => {
        const [txt, cls] = ST[r.quote.status] || [r.quote.status, ''];
        const editable = r.quote.status === 'enviada' && r.status === 'abierta';
        return `<tr><td><b>${esc(r.taller.name)}</b><div class="muted small">#${r.number} · ${fmtWhen(r.quote.updated_at)}</div></td>
          <td class="small">${r.items.map((it, i) => `${it.qty}× ${esc(it.name)} ${r.quote.items[i].available ? `<b>${money(r.quote.items[i].price)}</b>` : '<span class="badge danger">no</span>'}`).join('<br>')}</td>
          <td class="num"><b>${money(r.quote.total)}</b></td><td><span class="badge ${cls}">${r.status === 'vencida' && r.quote.status === 'enviada' ? 'Vencida' : txt}</span></td>
          <td style="white-space:nowrap">${editable ? `<button class="btn sm" data-quote="${r.id}" data-from="enviadas">Editar</button> <button class="btn sm danger" data-withdraw="${r.quote.id}">Retirar</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="card empty-state"><p class="muted">Aún no envías cotizaciones.</p></div>'}`;
  },
  ganadas() {
    const list = st.data.ganadas || [];
    return `<h1>Ventas</h1><p class="sub">Talleres que eligieron tu cotización. Contáctalos para confirmar la entrega y el pago.</p>
      ${list.length ? `<div class="grid two">${list.map((r) => `<div class="card">
        <div style="display:flex;justify-content:space-between;gap:8px"><div><b>${esc(r.taller.name)}</b><div class="muted small">Solicitud #${r.number} · ${fmtWhen(r.quote.updated_at)}</div></div>
          <b class="price">${money(r.quote.total)}</b></div>
        <ul class="list small">${r.items.map((it, i) => r.quote.items[i].available ? `<li><span>${it.qty}× ${esc(it.name)}${r.quote.items[i].brand ? ` · ${esc(r.quote.items[i].brand)}` : ''}</span><span>${money(r.quote.items[i].price * it.qty)}</span></li>` : '').join('')}</ul>
        <p class="small">${r.delivery === 'domicilio' ? '🚚 Entregar en el taller' : '🏪 Pasan a recoger'}${r.quote.eta ? ` · ${esc(r.quote.eta)}` : ''}</p>
        ${r.contact ? `<div class="contact">📞 ${esc(r.contact.whatsapp || r.contact.phone || 'Sin teléfono')}${r.contact.address ? `<br>📍 ${esc(r.contact.address)}${r.contact.colonia ? `, ${esc(r.contact.colonia)}` : ''}` : ''}
          ${r.contact.whatsappLink ? `<br><a class="btn sm primary" href="${esc(r.contact.whatsappLink)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : ''}</div>` : ''}
      </div>`).join('')}</div>` : '<div class="card empty-state"><p class="muted">Cuando un taller acepte una de tus cotizaciones aparecerá aquí con sus datos de contacto.</p></div>'}`;
  },
  catalogo() {
    const c = st.data.catalogo || { items: [], total: 0 };
    return `<div class="page-head"><div><h1>Catálogo</h1>
      <p class="sub">${c.total.toLocaleString('es-MX')} artículos publicados. Los talleres cercanos los encuentran en su buscador.</p></div>
      <div class="toolbar"><button class="btn" id="csv-template">⬇ Plantilla CSV</button>
        <label class="btn">⬆ Importar CSV<input type="file" id="csv-file" accept=".csv,text/csv" hidden></label>
        <button class="btn primary" id="add-item">+ Artículo</button></div></div>
      <div class="toolbar"><input id="cat-q" type="search" placeholder="Buscar en tu catálogo…" value="${esc(st.catQ)}"></div>
      <div class="card table-wrap"><table><thead><tr><th>Código</th><th>Artículo</th><th>Compatibilidad</th><th class="num">Precio</th><th class="num">Existencia</th><th></th></tr></thead><tbody>
      ${c.items.map((it) => `<tr><td><code>${esc(it.sku)}</code></td><td>${esc(it.name)}<div class="muted small">${esc([it.brand, it.category, it.oem].filter(Boolean).join(' · '))}</div></td>
        <td class="small">${esc(it.fits || '—')}</td><td class="num">${it.price != null ? money(it.price) : '—'}</td><td class="num">${it.stock ?? '—'}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-edit-item="${it.id}">Editar</button> <button class="btn sm danger" data-del-item="${it.id}">✕</button></td></tr>`).join('')
        || `<tr><td colspan="6" class="empty">${st.catQ ? 'Sin resultados.' : 'Tu catálogo está vacío. Descarga la plantilla, llénala en Excel y guárdala como CSV.'}</td></tr>`}</tbody></table></div>
      ${c.total > st.catOffset + c.items.length && !st.catQ ? `<div class="toolbar" style="margin-top:10px"><button class="btn" id="cat-more">Ver más</button></div>` : ''}`;
  },
  perfil() {
    const p = st.data.perfil || {};
    return `<h1>Perfil de la refaccionaria</h1><p class="sub">Esto ven los talleres. Tu teléfono y dirección solo se comparten cuando un taller acepta tu cotización.</p>
      <div class="grid two"><div class="card"><form id="profile-form">
        <div class="row2">${field('Municipio', 'municipio', p.municipio, 'text', 'list="municipios" required')}${field('Colonia', 'colonia', p.colonia)}</div>
        ${field('Dirección', 'address', p.address, 'text', 'placeholder="Calle y número"')}
        <div class="row2">${field('WhatsApp', 'whatsapp', p.whatsapp, 'tel', 'required')}${field('Teléfono', 'phone', p.phone, 'tel')}</div>
        <div class="row2">${field('Radio de entrega (km)', 'radius_km', p.radius_km ?? 10, 'number', 'min="1" max="100" required')}${field('Horario', 'hours', p.hours, 'text', 'placeholder="L-V 9 a 19, S 9 a 14"')}</div>
        ${field('Especialidades y marcas', 'categories', p.categories, 'text', 'placeholder="Frenos, suspensión, Nissan, VW…"')}
        <label class="field" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="delivers" value="1" style="width:auto" ${p.delivers ? 'checked' : ''}> Hacemos entregas a domicilio</label>
        <input type="hidden" name="lat" value="${p.lat ?? ''}"><input type="hidden" name="lng" value="${p.lng ?? ''}">
        <p class="small" id="coords">${Number.isFinite(p.lat) ? `Ubicación exacta: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} ✓` : 'Ubicación exacta: sin definir. Sin ella solo te llegan solicitudes de tu municipio.'}</p>
        <div class="toolbar"><button type="button" class="btn" id="gps">📍 Usar mi ubicación actual</button><button class="btn primary" type="submit">Guardar</button></div>
      </form></div>
      <div class="card"><h2>Cuenta</h2><p class="small">Sesión: <b>${esc(st.me.user.name)}</b> (${esc(st.me.user.email)})</p>
        <p class="muted small">Nau es gratis para refaccionarias: recibes solicitudes, cotizas y publicas tu catálogo sin costo. El pago de cada venta lo acuerdas directamente con el taller.</p>
        <div class="toolbar"><button class="btn" id="logout">Cerrar sesión</button></div></div></div>`;
  },
};

function render() {
  $('#app').innerHTML = VIEWS[st.view]();
  const app = $('#app');
  $$('[data-go]', app).forEach((b) => b.onclick = () => go(b.dataset.go));
  $('#refresh', app)?.addEventListener('click', () => { loadSummary(); go('nuevas'); });
  $$('[data-quote]', app).forEach((b) => b.onclick = () => quoteModal((st.data[b.dataset.from || 'nuevas'] || []).find((r) => r.id === b.dataset.quote)));
  $$('[data-withdraw]', app).forEach((b) => b.onclick = async () => {
    if (!confirm('¿Retirar esta cotización? El taller ya no la verá.')) return;
    try { await api('POST', `/api/supplier/quotes/${b.dataset.withdraw}/withdraw`, {}); go('enviadas'); } catch (e) { toast(e.message); }
  });
  if (st.view === 'catalogo') bindCatalog(app);
  if (st.view === 'perfil') bindProfile(app);
}

/* ---------- cotizar ---------- */
function quoteModal(r) {
  if (!r) return;
  const prev = r.quote?.items || [];
  const rows = r.items.map((it, i) => {
    const q = prev[i] || { available: true };
    return `<div class="quote-line" data-i="${i}">
      <label class="ql-check"><input type="checkbox" class="ql-av" ${q.available ? 'checked' : ''}> <span><b>${it.qty}× ${esc(it.name)}</b>${it.notes ? `<br><span class="muted small">${esc(it.notes)}</span>` : ''}</span></label>
      <div class="ql-fields"><input class="ql-price" type="number" min="0" step="0.01" placeholder="Precio c/u" value="${q.price ?? ''}" aria-label="Precio unitario">
        <input class="ql-brand" placeholder="Marca" maxlength="60" value="${esc(q.brand || '')}">
        <input class="ql-note" placeholder="Nota (ej. original, 6 meses de garantía)" maxlength="120" value="${esc(q.note || '')}"></div></div>`;
  }).join('');
  openModal(`Cotizar a ${r.taller.name}`, `
    ${r.vehicle ? `<p class="small"><b>🚗 ${esc(r.vehicle)}</b>${r.vin ? ` · VIN ${esc(r.vin)}` : ''}</p>` : ''}${rfqMeta(r)}
    <p class="muted small">Desmarca lo que no tengas. El total se calcula solo.</p>
    <div id="qlines">${rows}</div>
    <div class="row2">${field('Costo de envío', 'delivery_cost', r.quote?.delivery_cost ?? 0, 'number', 'min="0" step="0.01"')}
      <label class="field">Tiempo de entrega<select name="eta">${ETAS.map((e) => `<option ${r.quote?.eta === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label></div>
    <label class="field">Notas para el taller<textarea name="notes" maxlength="300">${esc(r.quote?.notes || '')}</textarea></label>
    <p class="small">Total: <b id="qtotal">—</b></p>`,
  async (d) => {
    const items = $$('.quote-line').map((l) => ({
      available: $('.ql-av', l).checked, price: $('.ql-price', l).value === '' ? null : Number($('.ql-price', l).value),
      brand: $('.ql-brand', l).value.trim(), note: $('.ql-note', l).value.trim(),
    }));
    const missingPrice = items.findIndex((x) => x.available && (x.price === null || Number.isNaN(x.price)));
    if (missingPrice >= 0) throw new Error(`Falta el precio de: ${r.items[missingPrice].name}`);
    const res = await api('POST', `/api/supplier/rfqs/${r.id}/quote`, { ...d, items });
    toast(`Cotización enviada por ${money(res.total)}. Te avisamos en "Ventas" si el taller la acepta.`);
    await loadSummary();
    go(st.view);
  }, r.quote ? 'Actualizar cotización' : 'Enviar cotización');
  const calc = () => {
    let total = Number($('#modal [name=delivery_cost]').value) || 0;
    $$('.quote-line').forEach((l) => {
      const av = $('.ql-av', l).checked;
      $('.ql-fields', l).classList.toggle('off', !av);
      if (av) total += (Number($('.ql-price', l).value) || 0) * r.items[Number(l.dataset.i)].qty;
    });
    $('#qtotal').textContent = money(total);
  };
  $('#modal-body').addEventListener('input', calc);
  calc();
}

/* ---------- catálogo ---------- */
const CSV_COLS = ['codigo', 'nombre', 'marca', 'categoria', 'numero_parte', 'compatibilidad', 'precio', 'existencia'];
const COL_ALIASES = {
  sku: ['codigo', 'código', 'sku', 'clave', 'code'], name: ['nombre', 'descripcion', 'descripción', 'articulo', 'artículo', 'name'],
  brand: ['marca', 'brand'], category: ['categoria', 'categoría', 'linea', 'línea', 'category'],
  oem: ['numero_parte', 'número de parte', 'numero de parte', 'no_parte', 'oem', 'np'], fits: ['compatibilidad', 'aplicacion', 'aplicación', 'aplica', 'fits'],
  price: ['precio', 'precio_venta', 'price'], stock: ['existencia', 'existencias', 'stock', 'inventario'],
};

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function csvToItems(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('El archivo no tiene artículos.');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {};
  for (const [key, names] of Object.entries(COL_ALIASES)) idx[key] = header.findIndex((h) => names.includes(h));
  if (idx.sku < 0 || idx.name < 0) throw new Error('El archivo necesita al menos las columnas "codigo" y "nombre". Usa la plantilla.');
  return rows.slice(1).map((r) => Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, i >= 0 ? (r[i] ?? '').trim() : ''])))
    .filter((it) => it.sku || it.name);
}

function itemModal(it) {
  openModal(it ? 'Editar artículo' : 'Nuevo artículo', `
    <div class="row2">${field('Código', 'sku', it?.sku, 'text', `required maxlength="60" ${it ? 'readonly' : ''}`)}${field('Nombre', 'name', it?.name, 'text', 'required maxlength="160" placeholder="Balatas delanteras cerámicas"')}</div>
    <div class="row2">${field('Marca', 'brand', it?.brand)}${field('Categoría', 'category', it?.category, 'text', 'placeholder="Frenos"')}</div>
    ${field('Números de parte equivalentes', 'oem', it?.oem, 'text', 'placeholder="D1338, 41060-3AA0A"')}
    ${field('Compatibilidad', 'fits', it?.fits, 'text', 'placeholder="Nissan Versa 2012-2019, March 2012-2020"')}
    <div class="row2">${field('Precio (MXN, IVA incluido)', 'price', it?.price ?? '', 'number', 'min="0" step="0.01"')}${field('Existencia', 'stock', it?.stock ?? '', 'number', 'min="0" step="1"')}</div>`,
  async (d) => { await api('POST', '/api/supplier/catalog', { items: [d] }); toast('Artículo guardado.'); await loadSummary(); go('catalogo'); });
}

function bindCatalog(app) {
  const q = $('#cat-q', app);
  let timer;
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { st.catQ = q.value; st.catOffset = 0; go('catalogo').then(() => { const n = $('#cat-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); }, 300); });
  $('#add-item', app).onclick = () => itemModal(null);
  $('#cat-more', app)?.addEventListener('click', async () => {
    const prev = st.data.catalogo.items;
    st.catOffset += 100;
    await load('catalogo');
    st.data.catalogo.items = prev.concat(st.data.catalogo.items);
    st.catOffset = 0;
    render();
  });
  $$('[data-edit-item]', app).forEach((b) => b.onclick = () => itemModal(st.data.catalogo.items.find((x) => String(x.id) === b.dataset.editItem)));
  $$('[data-del-item]', app).forEach((b) => b.onclick = async () => {
    if (!confirm('¿Quitar este artículo del catálogo?')) return;
    try { await api('DELETE', `/api/supplier/catalog/${b.dataset.delItem}`); go('catalogo'); } catch (e) { toast(e.message); }
  });
  $('#csv-template', app).onclick = () => {
    const sample = `${CSV_COLS.join(',')}\nBAL-001,Balatas delanteras cerámicas,Brembo,Frenos,D1338,"Nissan Versa 2012-2019, March 2012-2020",1250,6\nBUJ-010,Bujía iridio,NGK,Encendido,ILZKR7B11,,189,40\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + sample], { type: 'text/csv;charset=utf-8' }));
    a.download = 'plantilla-catalogo-nau.csv';
    a.click();
  };
  $('#csv-file', app).onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let items;
    try { items = csvToItems(await file.text()); } catch (ex) { e.target.value = ''; return toast(ex.message); }
    openModal('Importar catálogo', `<p>Encontramos <b>${items.length.toLocaleString('es-MX')}</b> artículos en <b>${esc(file.name)}</b>.</p>
      <p class="small muted">Primeros: ${items.slice(0, 3).map((it) => esc(it.name)).join(' · ')}</p>
      <label class="field" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="replace" value="1" style="width:auto"> Reemplazar todo el catálogo (borra lo que no venga en el archivo)</label>
      <p class="muted small">Si no marcas la casilla, se agregan los nuevos y se actualizan los que tengan el mismo código.</p>`,
    async (d) => {
      let saved = 0;
      for (let i = 0; i < items.length; i += 5000) {
        const r = await api('POST', '/api/supplier/catalog', { items: items.slice(i, i + 5000), replace: Boolean(d.replace) && i === 0 });
        saved += r.saved;
      }
      toast(`${saved.toLocaleString('es-MX')} artículos importados.`);
      await loadSummary();
      go('catalogo');
    }, 'Importar');
    e.target.value = '';
  };
}

/* ---------- perfil ---------- */
function bindProfile(app) {
  const f = $('#profile-form', app);
  $('#gps', app).onclick = () => {
    if (!navigator.geolocation) return toast('Tu navegador no permite obtener la ubicación.');
    $('#coords').textContent = 'Obteniendo ubicación…';
    navigator.geolocation.getCurrentPosition((pos) => {
      f.lat.value = pos.coords.latitude; f.lng.value = pos.coords.longitude;
      $('#coords').textContent = `Ubicación exacta: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} ✓ (pulsa Guardar)`;
    }, () => toast('No se pudo obtener la ubicación. Revisa los permisos del navegador.'), { enableHighAccuracy: true, timeout: 10000 });
  };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    d.delivers = Boolean(d.delivers);
    try { st.data.perfil = await api('PUT', '/api/profile', d); toast('Perfil guardado.'); await loadSummary(); render(); } catch (ex) { toast(ex.message); }
  });
  $('#logout', app).onclick = async () => { await api('POST', '/api/auth/logout', {}); location.href = '/'; };
}

/* ---------- arranque ---------- */
$('#nav').addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b) go(b.dataset.view); });
(async () => {
  try { st.me = await api('GET', '/api/me'); } catch { return; }
  if (st.me.tenant.kind !== 'refaccionaria') { location.href = '/app/'; return; }
  $('#who').innerHTML = `<span>${esc(st.me.tenant.name)}</span><span class="muted small">${esc(st.me.user.name)}</span>`;
  await loadSummary();
  go('nuevas');
  setInterval(async () => {
    if (document.hidden || $('#modal').open) return;
    const before = st.summary?.nuevas || 0;
    await loadSummary();
    if ((st.summary?.nuevas || 0) > before) {
      toast('Llegó una nueva solicitud de cotización.');
      if (st.view === 'nuevas') go('nuevas');
    }
  }, 30000);
})();

/* Nau — buscador de refacciones y cotizaciones con refaccionarias cercanas (lado del taller). */
'use strict';

const mk = {
  tab: 'buscar', q: '', vehicle: '', radius: 20, loading: false,
  results: null, local: null, ai: null, suppliersNearby: 0, needsLocation: false, error: '',
  rfqs: null,
};
const RFQ_STATUS = { abierta: ['Abierta', 'info'], adjudicada: ['Comprada', 'ok'], vencida: ['Vencida', ''], cancelada: ['Cancelada', ''] };
const NEEDED_TXT = { hoy: 'Hoy', manana: 'Mañana', semana: 'Esta semana' };
const normTxt = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtWhen = (ms) => new Date(ms).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const distTxt = (d) => (d === null || d === undefined ? 'en tu municipio' : `a ${d.toLocaleString('es-MX')} km`);

// Una refacción del inventario coincide si contiene todas las palabras de alguno de los términos.
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'un', 'una', 'en', 'por', 'al']);
function localMatches(terms) {
  const groups = terms.map((t) => normTxt(t).split(/[^a-z0-9ñ]+/)
    .filter((x) => x.length >= 2 && !STOPWORDS.has(x) && !/^(19|20)\d\d$/.test(x))
    .map((x) => (x.length > 4 ? x.replace(/(es|s)$/, '') : x))) // singular aproximado: balatas → balata
    .filter((g) => g.length);
  if (!groups.length) return [];
  return S.parts.filter((p) => {
    const hay = normTxt(`${p.sku} ${p.name} ${p.category}`);
    return groups.some((g) => g.every((x) => hay.includes(x)));
  }).slice(0, 20);
}

function openRfqCount() {
  return (mk.rfqs || []).filter((r) => r.status === 'abierta' && r.quotes > 0).length;
}
function updateMarketBadge() {
  const b = $('#nav button[data-view="refacciones"]');
  if (!b) return;
  const n = openRfqCount();
  b.innerHTML = `Refacciones${n ? ` <span class="nav-badge" title="Solicitudes con respuestas">${n}</span>` : ''}`;
}
async function loadRfqs() {
  if (MODE !== 'cloud' || cloud.me?.tenant.kind !== 'taller') return;
  try { mk.rfqs = (await api('GET', '/api/rfqs')).rfqs; } catch { /* sin conexión */ }
  updateMarketBadge();
}

VIEWS.refacciones = function refacciones() {
  const cloudOk = MODE === 'cloud';
  const aiOk = cloudOk && cloud.me?.ai.enabled;
  const tabs = `<div class="seg">
    <button data-mtab="buscar" class="${mk.tab === 'buscar' ? 'on' : ''}">Buscar</button>
    <button data-mtab="cotizaciones" class="${mk.tab === 'cotizaciones' ? 'on' : ''}">Mis cotizaciones${openRfqCount() ? ` <span class="nav-badge">${openRfqCount()}</span>` : ''}</button></div>`;
  const head = `<div class="page-head"><div><h1>Refacciones</h1>
    <p class="sub">Busca en tu inventario y en el catálogo de refaccionarias cercanas, o pide cotización a varias a la vez.</p></div>
    ${cloudOk ? '<button class="btn primary" id="new-rfq">+ Pedir cotización</button>' : ''}</div>${tabs}`;
  if (mk.tab === 'cotizaciones') return head + rfqListHtml();

  const form = `<form id="part-search" class="card search-card">
    <div class="search-row">
      <input id="pq" type="search" placeholder="Ej.: balatas delanteras Versa 2019, bomba de agua Tsuru" value="${esc(mk.q)}" required>
      <input id="pv" placeholder="Vehículo (opcional)" value="${esc(mk.vehicle)}">
      ${cloudOk ? `<select id="pr" aria-label="Distancia">${[5, 10, 20, 50].map((r) => `<option value="${r}" ${mk.radius === r ? 'selected' : ''}>Hasta ${r} km</option>`).join('')}</select>` : ''}
      <button class="btn primary" type="submit">Buscar</button>
      ${aiOk ? '<button class="btn" type="button" id="ai-search" title="La IA entiende jerga, sinónimos y faltas de ortografía">✦ Buscar con IA</button>' : ''}
    </div></form>`;
  let body = '';
  if (!cloudOk) body += '<div class="banner info"><span>En la demo se busca solo en tu inventario. Con tu cuenta también verás el catálogo de refaccionarias cercanas y podrás pedirles cotización.</span></div>';
  if (mk.needsLocation) body += '<div class="banner warn"><span>Para buscar en refaccionarias cercanas, indica la ubicación de tu taller.</span> <button class="btn sm primary" data-goto-location>Configurar ubicación</button></div>';
  if (mk.error) body += `<div class="banner danger"><span>${esc(mk.error)}</span></div>`;
  if (mk.loading) body += '<div class="empty">Buscando…</div>';
  if (mk.ai) {
    body += `<div class="card ai-interp"><b>✦ La IA entendió:</b> ${esc(mk.ai.pieza)}${mk.ai.vehiculo ? ` para <b>${esc(mk.ai.vehiculo)}</b>` : ''} <span class="badge">${esc(mk.ai.categoria)}</span>
      ${mk.ai.sinonimos.length ? `<div class="muted small">También se conoce como: ${mk.ai.sinonimos.map(esc).join(', ')}</div>` : ''}
      ${mk.ai.preguntas.length ? `<div class="small" style="margin-top:6px"><b>Antes de pedir, confirma:</b><ul>${mk.ai.preguntas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
      ${mk.ai.nota ? `<div class="muted small">${esc(mk.ai.nota)}</div>` : ''}</div>`;
  }
  if (!mk.loading && mk.local) {
    body += `<div class="card"><h2>En tu inventario</h2>${mk.local.length ? `<ul class="list">${mk.local.map((p) => {
      const { reserved } = allocation();
      const disp = p.stock - (reserved[p.id] || 0);
      return `<li><span><b>${esc(p.name)}</b> <code class="small">${esc(p.sku)}</code><br><span class="muted small">Ubicación ${esc(p.location || '—')} · stock ${p.stock} · disponible ${disp}</span></span>
        <span style="white-space:nowrap"><span class="badge ${disp > 0 ? 'ok' : 'danger'}">${disp > 0 ? 'Disponible' : 'Sin disponible'}</span>
        ${cloudOk ? `<button class="btn sm" data-quote-part="${p.id}">Cotizar</button>` : ''}</span></li>`;
    }).join('')}</ul>` : '<div class="empty">No la tienes en tu inventario.</div>'}</div>`;
  }
  if (!mk.loading && cloudOk && mk.results && !mk.needsLocation) {
    const n = mk.suppliersNearby;
    body += `<div class="card"><div class="page-head" style="margin:0 0 8px"><h2 style="margin:0">En refaccionarias cerca de ti</h2>
      ${n ? `<button class="btn sm primary" id="rfq-all">Pedir cotización a ${n === 1 ? 'la refaccionaria cercana' : `las ${n} refaccionarias cercanas`}</button>` : ''}</div>`;
    if (!n) body += `<div class="empty">Aún no hay refaccionarias de Nau en ${mk.radius} km a la redonda. Prueba con una distancia mayor o invita a tus proveedores a registrarse gratis en <b>${esc(location.host)}/cuenta.html#refaccionaria</b>.</div>`;
    else if (!mk.results.length) body += '<div class="empty">No aparece en sus catálogos publicados. Pídeles cotización: muchas refaccionarias tienen más piezas que las que publican.</div>';
    else {
      body += `<ul class="list results">${mk.results.map((r, i) => `<li>
        <span><b>${esc(r.name)}</b>${r.brand ? ` · ${esc(r.brand)}` : ''}${r.exact ? '' : ' <span class="badge">similar</span>'}
          <br><span class="muted small">${r.fits ? `${esc(r.fits)} · ` : ''}${esc(r.sku)}${r.oem ? ` · Núm. de parte ${esc(r.oem)}` : ''}</span>
          <br><span class="small">🏪 ${esc(r.supplier.name)} · ${esc(r.supplier.colonia || r.supplier.municipio || '')} · ${distTxt(r.supplier.distance_km)}${r.supplier.delivers ? ' · <span class="badge info">Entrega a domicilio</span>' : ''}</span></span>
        <span class="result-side">${r.price != null ? `<b class="price">${money(r.price)}</b>` : '<span class="muted small">Precio a cotizar</span>'}
          <span class="badge ${r.stock > 0 ? 'ok' : r.stock === 0 ? 'danger' : ''}">${r.stock > 0 ? `${r.stock} en existencia` : r.stock === 0 ? 'Sin existencia' : 'Consultar existencia'}</span>
          <button class="btn sm primary" data-order="${i}">Pedir</button></span></li>`).join('')}</ul>
        <p class="muted small">Precios y existencias publicados por cada refaccionaria; se confirman al cotizar. El pago y la entrega se acuerdan directamente con ella.</p>`;
    }
    body += '</div>';
  }
  if (!mk.loading && !mk.local && !mk.results) {
    body += `<div class="card empty-state"><p><b>¿Qué refacción necesitas?</b></p><p class="muted">Escribe el nombre como lo dirías en el mostrador: "balatas Versa 2019", "kit de clutch Tsuru", "bujías NGK Aveo".${aiOk ? ' Si no estás seguro del nombre, usa <b>Buscar con IA</b>.' : ''}</p></div>`;
  }
  return head + form + body;
};

function rfqListHtml() {
  if (mk.rfqs === null) return '<div class="empty">Cargando…</div>';
  if (!mk.rfqs.length) return '<div class="card empty-state"><p><b>Aún no pides cotizaciones.</b></p><p class="muted">Pide una y las refaccionarias cercanas te responden con precio, existencia y tiempo de entrega. Tú eliges la mejor.</p></div>';
  return `<div class="card table-wrap"><table><thead><tr><th>#</th><th>Pedida</th><th>Refacciones</th><th>Vehículo</th><th>Estado</th><th class="num">Mejor total</th></tr></thead><tbody>
    ${mk.rfqs.map((r) => {
      const [txt, cls] = RFQ_STATUS[r.status] || [r.status, ''];
      return `<tr class="clickable" data-rfq="${r.id}"><td><b>${r.number}</b></td><td class="small">${fmtWhen(r.created_at)}</td>
        <td class="small">${r.items.map((it) => `${it.qty}× ${esc(it.name)}`).join('<br>')}</td><td class="small">${esc(r.vehicle || '—')}</td>
        <td><span class="badge ${cls}">${txt}</span>${r.status === 'abierta' ? `<div class="small muted">${r.quotes} respuesta${r.quotes === 1 ? '' : 's'}</div>` : ''}</td>
        <td class="num">${r.best != null ? money(r.best) : '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

async function doPartSearch(extraTerms = []) {
  mk.loading = true; mk.error = ''; mk.needsLocation = false;
  render();
  mk.local = localMatches([mk.q, ...extraTerms]);
  if (MODE === 'cloud') {
    try {
      const params = new URLSearchParams({ q: mk.q, radius: String(mk.radius) });
      if (extraTerms.length) params.set('terms', JSON.stringify(extraTerms));
      const r = await api('GET', `/api/parts/search?${params}`);
      mk.results = r.results; mk.suppliersNearby = r.suppliersNearby; mk.needsLocation = Boolean(r.needsLocation);
    } catch (e) { mk.error = e.message; mk.results = null; }
  }
  mk.loading = false;
  render();
}

async function aiPartSearch() {
  if (!mk.q.trim()) return toast('Escribe qué refacción buscas.');
  mk.loading = true; mk.error = ''; mk.ai = null;
  render();
  try {
    mk.ai = await api('POST', '/api/parts/interpret', { q: mk.q, vehicle: mk.vehicle });
    if (cloud.me) cloud.me.ai.remaining = Math.max(0, cloud.me.ai.remaining - 1);
    if (!mk.vehicle && mk.ai.vehiculo) mk.vehicle = mk.ai.vehiculo;
    await doPartSearch([mk.ai.pieza, ...mk.ai.terminos, ...mk.ai.sinonimos]);
  } catch (e) {
    mk.loading = false; mk.error = e.message;
    render();
  }
}

/* ---------- pedir cotización ---------- */
function rfqItemRow(it = { name: '', qty: 1, notes: '', ref: '' }) {
  return `<div class="rfq-row" data-ref="${esc(it.ref || '')}">
    <input class="ri-name" placeholder="Refacción (ej. Balatas delanteras)" value="${esc(it.name)}" required maxlength="120">
    <input class="ri-qty" type="number" min="1" max="999" value="${it.qty}" aria-label="Cantidad">
    <input class="ri-notes" placeholder="Marca, medida, notas" value="${esc(it.notes || '')}" maxlength="200">
    <button type="button" class="btn sm danger ri-del" aria-label="Quitar">✕</button></div>`;
}

function rfqModal({ items = [], target = null, vehicle = '' } = {}) {
  if (MODE !== 'cloud') return toast('Crea tu cuenta para pedir cotizaciones a refaccionarias.');
  if (!cloud.me.tenant.hasLocation) {
    toast('Primero indica la ubicación de tu taller.');
    view = 'ajustes'; render();
    return;
  }
  const rows = (items.length ? items : [undefined]).map((it) => rfqItemRow(it)).join('');
  openModal(target ? `Pedir a ${target.name}` : 'Pedir cotización a refaccionarias cercanas', `
    ${target ? `<p class="muted small">Solo ${esc(target.name)} recibirá esta solicitud (${distTxt(target.distance_km)}).</p>` : '<p class="muted small">La reciben las refaccionarias de Nau dentro de la distancia que elijas. Te responden con precio, existencia y tiempo de entrega.</p>'}
    <div class="row2">${field('Vehículo', 'vehicle', vehicle || mk.vehicle, 'text', 'placeholder="Marca, modelo, año y motor" maxlength="120"')}${field('VIN (opcional)', 'vin', '', 'text', 'maxlength="20" placeholder="17 caracteres"')}</div>
    <h3>Refacciones</h3><div id="rfq-items">${rows}</div>
    <button type="button" class="btn sm" id="rfq-add">+ Añadir refacción</button>
    <div class="row2" style="margin-top:12px">${selectField('Entrega', 'delivery', [['recoger', 'Paso a recoger'], ['domicilio', 'Que me la traigan al taller']], 'recoger')}
      ${selectField('La necesito', 'needed', [['hoy', 'Hoy'], ['manana', 'Mañana'], ['semana', 'Esta semana']], 'manana')}</div>
    ${target ? '' : selectField('Enviar a refaccionarias a', 'radius_km', [5, 10, 20, 50].map((r) => [String(r), `Hasta ${r} km`]), String(mk.radius))}
    <label class="field">Notas para la refaccionaria<textarea name="notes" maxlength="500" placeholder="Ej.: original o equivalente, factura, horario para recibir"></textarea></label>`,
  asyncModal(async (d, form) => {
    const its = $$('.rfq-row', form).map((r) => ({
      name: $('.ri-name', r).value.trim(), qty: Number($('.ri-qty', r).value) || 1, notes: $('.ri-notes', r).value.trim(), ref: r.dataset.ref || undefined,
    })).filter((x) => x.name);
    if (!its.length) throw new Error('Agrega al menos una refacción.');
    const r = await api('POST', '/api/rfqs', { ...d, items: its, target_supplier_id: target?.id });
    toast(r.matched
      ? `Solicitud #${r.number} enviada a ${r.matched === 1 ? '1 refaccionaria' : `${r.matched} refaccionarias`}. Te avisamos aquí cuando respondan.`
      : `Solicitud #${r.number} creada, pero aún no hay refaccionarias de Nau en esa distancia. Prueba con una mayor.`);
    mk.tab = 'cotizaciones'; mk.rfqs = null; view = 'refacciones';
    render(); loadRfqs().then(render);
  }), 'Enviar solicitud');
  const box = $('#rfq-items');
  $('#rfq-add').onclick = () => box.insertAdjacentHTML('beforeend', rfqItemRow());
  box.addEventListener('click', (e) => { if (e.target.classList.contains('ri-del') && $$('.rfq-row', box).length > 1) e.target.closest('.rfq-row').remove(); });
}

/* ---------- comparar respuestas y comprar ---------- */
async function rfqDetailModal(id, justAccepted) {
  let d;
  try { d = await api('GET', `/api/rfqs/${id}`); } catch (e) { return toast(e.message); }
  const r = d.rfq;
  const [stTxt, stCls] = RFQ_STATUS[r.status] || [r.status, ''];
  const quoteCard = (x) => {
    const won = x.status === 'aceptada';
    const lines = r.items.map((it, i) => {
      const qi = x.items[i];
      return `<tr><td>${it.qty}× ${esc(it.name)}${qi.brand ? `<div class="muted small">${esc(qi.brand)}</div>` : ''}${qi.note ? `<div class="muted small">${esc(qi.note)}</div>` : ''}</td>
        <td class="num">${qi.available ? money(qi.price) + '<div class="muted small">c/u</div>' : '<span class="badge danger">No tiene</span>'}</td></tr>`;
    }).join('');
    const missing = x.items.filter((qi) => !qi.available).length;
    return `<div class="quote ${won ? 'won' : ''}">
      <div class="quote-head"><div><b>${esc(x.supplier.name)}</b><div class="muted small">${esc(x.supplier.colonia || x.supplier.municipio || '')} · ${distTxt(x.supplier.distance_km)}</div></div>
        <div class="num"><b class="price">${money(x.total)}</b><div class="muted small">${x.delivery_cost ? `incluye ${money(x.delivery_cost)} de envío` : 'sin costo de envío'}</div></div></div>
      <div class="small">🚚 ${esc(x.eta || 'Tiempo de entrega por confirmar')}${missing ? ` · <span class="badge warn">Le faltan ${missing}</span>` : ' · <span class="badge ok">Tiene todo</span>'}</div>
      <table class="small" style="margin-top:6px"><tbody>${lines}</tbody></table>
      ${x.notes ? `<p class="small muted">“${esc(x.notes)}”</p>` : ''}
      ${won && x.contact ? `<div class="contact"><b>✓ Compraste esta cotización.</b> Acuerda la entrega y el pago directamente:<br>
          📞 ${esc(x.contact.whatsapp || x.contact.phone || '')}${x.contact.address ? ` · ${esc(x.contact.address)}` : ''}
          ${x.contact.whatsappLink ? `<br><a class="btn sm primary" href="${esc(x.contact.whatsappLink)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : ''}</div>` : ''}
      ${r.status === 'abierta' && x.status === 'enviada' ? `<button type="button" class="btn primary" data-accept="${x.id}">Comprar con ${esc(x.supplier.name)}</button>` : ''}
      ${x.status === 'no_seleccionada' ? '<span class="badge">No seleccionada</span>' : ''}
    </div>`;
  };
  openModal(`Solicitud #${r.number}`, `
    <p><span class="badge ${stCls}">${stTxt}</span> <span class="muted small">Pedida ${fmtWhen(r.created_at)} · ${r.delivery === 'domicilio' ? 'entrega a domicilio' : 'pasa a recoger'} · la necesitas ${(NEEDED_TXT[r.needed] || '').toLowerCase()}${r.status === 'abierta' ? ` · abierta hasta ${fmtWhen(r.expires_at)}` : ''}</span></p>
    ${r.vehicle ? `<p class="small"><b>Vehículo:</b> ${esc(r.vehicle)}${r.vin ? ` · VIN ${esc(r.vin)}` : ''}</p>` : ''}
    ${justAccepted ? `<div class="banner ok-banner"><span>${esc(justAccepted)}</span></div>` : ''}
    <h3>Respuestas (${d.quotes.length})</h3>
    ${d.quotes.length ? `<div class="quotes">${d.quotes.map(quoteCard).join('')}</div>` : `<div class="empty">${r.status === 'abierta' ? 'Aún no hay respuestas. Las refaccionarias suelen contestar en minutos u horas; te avisamos en el menú "Refacciones".' : 'No hubo respuestas.'}</div>`}
    ${r.status === 'abierta' ? '<button type="button" class="btn sm danger" id="rfq-cancel">Cancelar solicitud</button>' : ''}`,
  () => true, 'Cerrar');
  $('#modal-cancel').hidden = true;
  $('#modal').addEventListener('close', () => { $('#modal-cancel').hidden = false; }, { once: true });
  $$('[data-accept]').forEach((b) => b.onclick = async () => {
    const x = d.quotes.find((q) => q.id === b.dataset.accept);
    if (!confirm(`¿Comprar a ${x.supplier.name} por ${money(x.total)}? Las demás refaccionarias verán que no fueron seleccionadas.`)) return;
    b.disabled = true;
    try {
      const after = await api('POST', `/api/rfqs/${r.id}/accept`, { quoteId: x.id });
      const won = after.quotes.find((q) => q.id === x.id);
      const po = applyAcceptedQuote(after.rfq, won);
      $('#modal').close();
      loadRfqs().then(() => { render(); rfqDetailModal(r.id, po ? `Se creó la orden de compra OC #${po} en Compras. Cuando lleguen las refacciones, márcala como recibida para sumarlas al inventario.` : ''); });
    } catch (e) { toast(e.message); b.disabled = false; }
  });
  $('#rfq-cancel')?.addEventListener('click', async () => {
    if (!confirm('¿Cancelar esta solicitud? Las refaccionarias ya no podrán responder.')) return;
    try { await api('POST', `/api/rfqs/${r.id}/cancel`, {}); $('#modal').close(); await loadRfqs(); render(); } catch (e) { toast(e.message); }
  });
}

/** Registra la compra en el taller: proveedor, refacciones nuevas y una orden de compra pendiente de recibir. */
function applyAcceptedQuote(rfq, quote) {
  if (S.purchases.some((p) => p.marketQuoteId === quote.id)) return null;
  let sup = S.suppliers.find((s) => s.marketId === quote.supplier.id);
  if (!sup) {
    sup = { id: uid(), name: quote.supplier.name, phone: quote.contact?.whatsapp || quote.contact?.phone || '', email: '', leadDays: 1, marketId: quote.supplier.id };
    S.suppliers.push(sup);
  }
  const items = [];
  rfq.items.forEach((it, i) => {
    const qi = quote.items[i];
    if (!qi?.available) return;
    let part = (it.ref && byId(S.parts, it.ref)) || S.parts.find((p) => normTxt(p.name) === normTxt(it.name));
    if (!part) {
      part = { id: uid(), sku: `NAU-${rfq.number}-${i + 1}`, name: it.name, category: '', stock: 0, min: 0, location: '', supplierId: sup.id, cost: qi.price };
      S.parts.push(part);
    } else part.cost = qi.price;
    items.push({ partId: part.id, qty: it.qty });
  });
  if (!items.length) return null;
  const number = S.seq.purchase++;
  S.purchases.push({
    id: uid(), number, supplierId: sup.id, status: 'pendiente', createdAt: today(),
    eta: rfq.needed === 'hoy' ? today() : addDays(1), items, marketQuoteId: quote.id, marketRfq: rfq.number,
  });
  save();
  return number;
}

BIND.refacciones = function bindRefacciones(app) {
  $$('[data-mtab]', app).forEach((b) => b.onclick = () => {
    mk.tab = b.dataset.mtab;
    render();
    if (mk.tab === 'cotizaciones') loadRfqs().then(render);
  });
  $('#new-rfq', app)?.addEventListener('click', () => rfqModal({}));
  $$('[data-goto-location]', app).forEach((b) => b.onclick = () => { view = 'ajustes'; render(); $('#loc-card')?.scrollIntoView({ behavior: 'smooth' }); });
  const formEl = $('#part-search', app);
  if (formEl) {
    const read = () => { mk.q = $('#pq').value.trim(); mk.vehicle = $('#pv').value.trim(); if ($('#pr')) mk.radius = Number($('#pr').value); };
    formEl.addEventListener('submit', (e) => { e.preventDefault(); read(); mk.ai = null; doPartSearch(mk.vehicle ? [`${mk.q} ${mk.vehicle}`] : []); });
    $('#ai-search', app)?.addEventListener('click', () => { read(); aiPartSearch(); });
  }
  $$('[data-order]', app).forEach((b) => b.onclick = () => {
    const r = mk.results[Number(b.dataset.order)];
    rfqModal({ items: [{ name: r.name, qty: 1, notes: [r.brand, r.sku].filter(Boolean).join(' · ') }], target: r.supplier, vehicle: mk.vehicle });
  });
  $$('[data-quote-part]', app).forEach((b) => b.onclick = () => {
    const p = byId(S.parts, b.dataset.quotePart);
    rfqModal({ items: [{ name: p.name, qty: Math.max(1, p.min - p.stock || 1), ref: p.id }] });
  });
  $('#rfq-all', app)?.addEventListener('click', () => rfqModal({ items: [{ name: mk.ai?.pieza || mk.q, qty: 1 }] }));
  $$('[data-rfq]', app).forEach((tr) => tr.onclick = () => rfqDetailModal(tr.dataset.rfq));
};

/* ---------- ubicación del taller (Ajustes) ---------- */
function locationCard() {
  const owner = cloud.me?.user.role === 'owner';
  return `<div class="card" id="loc-card"><h2>Ubicación y contacto del taller</h2>
    <p class="muted small">Con esto encontramos refaccionarias cercanas y les pasamos tus datos solo cuando les compras.</p>
    <form id="loc-form">
      <div class="row2">${field('Municipio', 'municipio', '', 'text', `list="municipios" required ${owner ? '' : 'disabled'}`)}${field('Colonia', 'colonia', '', 'text', owner ? '' : 'disabled')}</div>
      ${field('Dirección', 'address', '', 'text', `placeholder="Calle y número" ${owner ? '' : 'disabled'}`)}
      <div class="row2">${field('Teléfono', 'phone', '', 'tel', owner ? '' : 'disabled')}${field('WhatsApp', 'whatsapp', '', 'tel', owner ? '' : 'disabled')}</div>
      <input type="hidden" name="lat"><input type="hidden" name="lng">
      <p class="small" id="loc-coords">Ubicación exacta: sin definir</p>
      ${owner ? '<div class="toolbar"><button type="button" class="btn" id="loc-gps">📍 Usar mi ubicación actual</button><button class="btn primary" type="submit">Guardar</button></div>' : '<p class="muted small">Solo el dueño de la cuenta puede cambiarla.</p>'}
    </form></div>`;
}

async function bindLocationCard() {
  const formEl = $('#loc-form');
  if (!formEl) return;
  const coordsTxt = () => {
    const lat = formEl.lat.value; const lng = formEl.lng.value;
    $('#loc-coords').textContent = lat ? `Ubicación exacta: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)} ✓` : 'Ubicación exacta: sin definir (se usará el municipio)';
  };
  try {
    const p = await api('GET', '/api/profile');
    ['municipio', 'colonia', 'address', 'phone', 'whatsapp'].forEach((k) => { formEl[k].value = p[k] || ''; });
    formEl.lat.value = p.lat ?? ''; formEl.lng.value = p.lng ?? '';
    coordsTxt();
  } catch { /* sin conexión */ }
  $('#loc-gps')?.addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Tu navegador no permite obtener la ubicación.');
    $('#loc-coords').textContent = 'Obteniendo ubicación…';
    navigator.geolocation.getCurrentPosition(
      (pos) => { formEl.lat.value = pos.coords.latitude; formEl.lng.value = pos.coords.longitude; coordsTxt(); toast('Ubicación obtenida. Pulsa Guardar.'); },
      () => { coordsTxt(); toast('No se pudo obtener la ubicación. Revisa los permisos del navegador o usa solo el municipio.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('PUT', '/api/profile', Object.fromEntries(new FormData(formEl)));
      await refreshMe();
      toast('Ubicación guardada.');
    } catch (ex) { toast(ex.message); }
  });
}

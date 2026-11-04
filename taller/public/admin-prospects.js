'use strict';
/* Admin: refaccionarias por invitar (prospectos) con invitación por WhatsApp. */
(() => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = {
    por_contactar: ['Por contactar', ''], contactado: ['Contactada', 'warn'], interesado: ['Interesada', 'warn'],
    registrado: ['Registrada', 'ok'], no_interesado: ['No interesada', 'danger'],
  };
  const api = async (method, url, body) => {
    const res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error');
    return json;
  };
  const senderEl = document.getElementById('p-sender');
  try { senderEl.value = localStorage.getItem('nau.sender') || ''; } catch { /* sin almacenamiento */ }
  senderEl.addEventListener('change', () => { try { localStorage.setItem('nau.sender', senderEl.value); } catch { /* */ } render(); });

  let data = { prospects: [], counts: {} };

  const waNumber = (phone) => (phone ? (phone.length === 10 ? `52${phone}` : phone) : '');
  const message = (p) => {
    const who = senderEl.value.trim();
    return `Hola, buen día. ${who ? `Soy ${who}, de Nau` : 'Le escribo de Nau'}, una app que usan talleres mecánicos de ${p.municipio || 'Querétaro'} para organizar su trabajo y pedir refacciones.\n\n`
      + 'Los talleres cercanos le pueden enviar solicitudes de cotización y usted responde con precio y existencia desde el celular. También puede publicar su catálogo para que lo encuentren en el buscador.\n\n'
      + `Es gratis para refaccionarias. Si le interesa, puede registrarse aquí:\n${p.invite_url}`;
  };

  function render() {
    const filter = document.getElementById('p-filter').value;
    const c = data.counts;
    document.getElementById('p-kpis').innerHTML = Object.entries(STATUS).map(([k, [txt]]) => `<div>${txt}<b>${c[k] || 0}</b></div>`).join('');
    const rows = data.prospects.filter((p) => !filter || p.status === filter);
    document.getElementById('p-rows').innerHTML = rows.map((p) => {
      const [, cls] = STATUS[p.status];
      const wa = waNumber(p.phone);
      return `<tr data-id="${p.id}">
        <td><b>${esc(p.name)}</b><div class="muted small">${esc(p.municipio || '')}${p.address ? ` · ${esc(p.address)}` : ''}</div>
          ${p.source ? `<div class="small">${/^https?:\/\//.test(p.source) ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">fuente</a>` : esc(p.source)}</div>` : ''}</td>
        <td class="small">${esc(p.phone || '—')}</td>
        <td><select class="p-status">${Object.entries(STATUS).map(([k, [txt]]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${txt}</option>`).join('')}</select>
          <div><span class="badge ${cls}">${STATUS[p.status][0]}</span></div></td>
        <td><textarea class="p-notes" maxlength="500" placeholder="Ej.: habló con el encargado, llamar el lunes">${esc(p.notes || '')}</textarea></td>
        <td style="white-space:nowrap">
          ${p.status !== 'registrado' && wa ? `<a class="btn wa p-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(message(p))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${p.status !== 'registrado' ? '<button class="btn p-copy">Copiar enlace</button>' : ''}
          <button class="btn p-del" title="Quitar">✕</button></td></tr>`;
    }).join('') || '<tr><td colspan="5" class="muted">Sin refaccionarias en esta lista. Agrégalas a mano o importa un CSV.</td></tr>';
    document.querySelectorAll('#p-rows tr[data-id]').forEach((tr) => {
      const p = data.prospects.find((x) => x.id === tr.dataset.id);
      tr.querySelector('.p-status').onchange = (e) => update(p, { status: e.target.value });
      tr.querySelector('.p-notes').onchange = (e) => update(p, { notes: e.target.value });
      tr.querySelector('.p-wa')?.addEventListener('click', () => { if (p.status === 'por_contactar') update(p, { status: 'contactado' }); });
      tr.querySelector('.p-copy')?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(message(p)); alert('Mensaje con enlace copiado. Pégalo en WhatsApp, Messenger o correo.'); } catch { prompt('Copia el enlace:', p.invite_url); }
      });
      tr.querySelector('.p-del').onclick = async () => {
        if (!confirm(`¿Quitar a ${p.name} de la lista?`)) return;
        await api('DELETE', `/api/admin/prospects/${p.id}`); load();
      };
    });
  }
  async function update(p, patch) {
    try { await api('PUT', `/api/admin/prospects/${p.id}`, patch); load(); } catch (e) { alert(e.message); }
  }
  async function load() {
    try { data = await api('GET', '/api/admin/prospects'); render(); } catch (e) {
      document.getElementById('p-rows').innerHTML = `<tr><td colspan="5">${esc(e.message)}</td></tr>`;
    }
  }
  document.getElementById('p-filter').onchange = render;

  const form = document.getElementById('p-form');
  document.getElementById('p-add').onclick = () => { form.hidden = !form.hidden; if (!form.hidden) form.name.focus(); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/admin/prospects', Object.fromEntries(new FormData(form)));
      if (r.skipped) alert('Ya estaba en la lista.');
      form.reset(); load();
    } catch (ex) { alert(ex.message); }
  });

  // CSV: nombre, telefono, municipio, direccion, fuente
  function parseCsv(text) {
    const first = text.split(/\r?\n/, 1)[0];
    const d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = []; let cell = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; } else if (ch === '"') q = true;
      else if (ch === d) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  const ALIASES = { name: ['nombre', 'name', 'negocio'], phone: ['telefono', 'teléfono', 'whatsapp', 'phone', 'tel'], municipio: ['municipio', 'ciudad'], address: ['direccion', 'dirección', 'domicilio'], source: ['fuente', 'source', 'url'], notes: ['notas', 'notes', 'comentarios'] };
  document.getElementById('p-csv').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rows = parseCsv((await f.text()).replace(/^﻿/, ''));
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const idx = Object.fromEntries(Object.entries(ALIASES).map(([k, names]) => [k, head.findIndex((h) => names.includes(h))]));
    e.target.value = '';
    if (idx.name < 0) return alert('El CSV necesita una columna "nombre".');
    const items = rows.slice(1).map((r) => Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, i >= 0 ? (r[i] || '').trim() : '']))).filter((x) => x.name);
    try { const r = await api('POST', '/api/admin/prospects', { items }); alert(`${r.added} agregadas${r.skipped ? `, ${r.skipped} ya estaban` : ''}.`); load(); } catch (ex) { alert(ex.message); }
  };
  load();
})();

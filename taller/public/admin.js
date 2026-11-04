'use strict';
(() => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const d = (ms) => (ms ? new Date(ms).toLocaleDateString('es-MX') : '—');
  const STATUS = { trial: 'Prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada' };
  const api = async (method, url, body) => {
    const res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) { location.href = '/cuenta.html'; throw new Error(); }
    if (!res.ok) throw new Error(json.error || 'Error');
    return json;
  };

  async function load() {
    let r;
    try { r = await api('GET', '/api/admin/tenants'); } catch (e) {
      document.getElementById('rows').innerHTML = `<tr><td colspan="8">${esc(e.message)}</td></tr>`;
      return;
    }
    const fmt = (n) => n.toLocaleString('es-MX', { style: 'currency', currency: r.currency, maximumFractionDigits: 0 });
    const paying = r.tenants.filter((t) => t.status === 'active');
    const mrr = paying.reduce((s, t) => s + (r.plans[t.plan]?.price || 0), 0);
    document.getElementById('kpis').innerHTML = `
      <div>Talleres<b>${r.tenants.length}</b></div>
      <div>Pagando<b>${paying.length}</b></div>
      <div>En prueba<b>${r.tenants.filter((t) => t.status === 'trial' && t.access.canWrite).length}</b></div>
      <div>Ingreso mensual estimado<b>${fmt(mrr)}</b></div>`;
    const planOpts = Object.values(r.plans).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    document.getElementById('rows').innerHTML = r.tenants.map((t) => `<tr data-id="${t.id}">
      <td><b>${esc(t.name)}</b><br><span class="muted small">alta ${d(t.created_at)}</span></td>
      <td>${esc(t.owner_email)}</td><td>${t.users}</td>
      <td>${esc(r.plans[t.plan]?.name || t.plan)}<br><span class="badge ${t.access.canWrite ? 'ok' : 'danger'}">${STATUS[t.status] || t.status}${t.mp_preapproval_id ? ' · MP' : ''}</span></td>
      <td>${d(t.status === 'trial' ? t.trial_ends_at : t.current_period_end)}</td>
      <td>${d(t.last_activity)}</td>
      <td>${t.ai_messages || 0}</td>
      <td style="white-space:nowrap"><select class="act"><option value="activate">Activar plan</option><option value="extend_trial">Extender prueba</option><option value="suspend">Suspender</option></select>
        <select class="plan">${planOpts}</select> <input class="days" type="number" value="30" min="1" style="width:64px"> días
        <button class="btn go">Aplicar</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Aún no hay talleres registrados.</td></tr>';
    document.querySelectorAll('tr[data-id] .go').forEach((b) => b.addEventListener('click', async () => {
      const row = b.closest('tr');
      const body = { action: row.querySelector('.act').value, plan: row.querySelector('.plan').value, days: row.querySelector('.days').value };
      if (!confirm('¿Aplicar este cambio?')) return;
      try { await api('POST', `/api/admin/tenants/${row.dataset.id}`, body); load(); } catch (e) { alert(e.message); }
    }));
  }
  load();
})();

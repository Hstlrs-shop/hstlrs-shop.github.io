'use strict';
(async () => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const box = document.getElementById('pricing');
  if (!box) return;
  try {
    const info = await (await fetch('/api/plans')).json();
    const fmt = (n) => n.toLocaleString('es', { style: 'currency', currency: info.currency, maximumFractionDigits: 0 });
    document.querySelectorAll('.js-trial').forEach((el) => { el.textContent = info.trialDays; });
    if (info.contactEmail) {
      document.getElementById('contact').innerHTML = `¿Dudas? <a href="mailto:${esc(info.contactEmail)}">${esc(info.contactEmail)}</a>`;
    }
    box.innerHTML = info.plans.map((p) => `
      <article class="plan ${p.highlight ? 'highlight' : ''}">
        ${p.highlight ? '<span class="tag">Más elegido</span>' : ''}
        <h3>${esc(p.name)}</h3>
        <p class="price">${fmt(p.price)}<span> / mes</span></p>
        <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <a class="btn ${p.highlight ? 'primary' : ''}" href="/cuenta.html#registro">Probar gratis</a>
      </article>`).join('');
  } catch {
    box.innerHTML = '<p class="center muted">No se pudieron cargar los precios. Recarga la página.</p>';
  }
})();

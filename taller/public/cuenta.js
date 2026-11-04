'use strict';
(() => {
  const forms = { login: document.getElementById('login'), registro: document.getElementById('registro') };
  const show = (tab) => {
    Object.entries(forms).forEach(([k, f]) => { f.hidden = k !== tab; });
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    forms[tab].querySelector('input').focus();
  };
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.tab); show(b.dataset.tab); }));
  // Tipo de negocio: taller (prueba gratis) o refaccionaria (gratis, pide WhatsApp y municipio).
  const setKind = (kind) => {
    const sup = kind === 'refaccionaria';
    document.querySelector(`input[name=kind][value=${kind}]`).checked = true;
    document.getElementById('supplier-fields').hidden = !sup;
    document.getElementById('biz-label').textContent = sup ? 'Nombre de la refaccionaria' : 'Nombre del taller';
    forms.registro.workshop.placeholder = sup ? 'Ej.: Refacciones El Pueblito' : 'Ej.: Taller Mecánico San Martín';
    forms.registro.whatsapp.required = sup;
    forms.registro.municipio.required = sup;
    document.getElementById('reg-note').textContent = sup ? 'Gratis: recibe solicitudes de talleres cercanos y publica tu catálogo.' : 'Prueba gratis, sin tarjeta.';
  };
  document.querySelectorAll('input[name=kind]').forEach((r) => r.addEventListener('change', () => setKind(r.value)));
  if (location.hash === '#refaccionaria') { setKind('refaccionaria'); show('registro'); } else show(location.hash === '#registro' ? 'registro' : 'login');

  // Si ya hay sesión, ir directo a la app.
  const home = (me) => (me?.tenant?.kind === 'refaccionaria' ? '/proveedor/' : '/app/');
  fetch('/api/me', { credentials: 'same-origin' }).then(async (r) => { if (r.ok) location.href = home(await r.json()); }).catch(() => {});
  fetch('/api/plans').then((r) => r.json()).then((p) => document.querySelectorAll('.js-trial').forEach((el) => { el.textContent = p.trialDays; })).catch(() => {});

  const submit = (form, url) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('.form-error');
    const btn = form.querySelector('button[type=submit]');
    err.textContent = '';
    btn.disabled = true;
    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'nau' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo completar. Intenta de nuevo.');
      location.href = home(json);
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  });
  submit(forms.login, '/api/auth/login');
  submit(forms.registro, '/api/auth/register');
})();

'use strict';
(() => {
  const forms = { login: document.getElementById('login'), registro: document.getElementById('registro') };
  const show = (tab) => {
    Object.entries(forms).forEach(([k, f]) => { f.hidden = k !== tab; });
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    forms[tab].querySelector('input').focus();
  };
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.tab); show(b.dataset.tab); }));
  show(location.hash === '#registro' ? 'registro' : 'login');

  // Si ya hay sesión, ir directo a la app.
  fetch('/api/me', { credentials: 'same-origin' }).then((r) => { if (r.ok) location.href = '/app/'; }).catch(() => {});
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
      location.href = '/app/';
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  });
  submit(forms.login, '/api/auth/login');
  submit(forms.registro, '/api/auth/register');
})();

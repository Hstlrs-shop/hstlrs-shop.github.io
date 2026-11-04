'use strict';
/* TallerFlow SaaS — servidor HTTP sin dependencias externas (Node >= 22.5). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const { openDb } = require('./db');
const { PLANS, TRIAL_PLAN, publicPlans } = require('./plans');
const MP = require('./mercadopago');

const DAY = 86400000;
const SESSION_DAYS = 30;
const COOKIE = 'tf_session';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 6 * 1024 * 1024;

/* ---------------- utilidades ---------------- */
class HttpError extends Error {
  constructor(status, message, body) { super(message); this.status = status; this.body = body; }
}
const now = () => Date.now();
const uuid = () => crypto.randomUUID();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const a = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), 64);
  const b = Buffer.from(hash, 'base64');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function str(v, field, { min = 1, max = 200 } = {}) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min || s.length > max) throw new HttpError(400, `Revisa el campo "${field}".`);
  return s;
}
function email(v) {
  const e = str(v, 'email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(e)) throw new HttpError(400, 'El email no es válido.');
  return e;
}
function password(v) {
  if (typeof v !== 'string' || v.length < 8 || v.length > 200) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
  return v;
}

function emptyState() {
  return {
    suppliers: [], parts: [], mechanics: [], orders: [], purchases: [],
    bays: [{ id: 'b1', name: 'Bahía 1' }, { id: 'b2', name: 'Bahía 2' }],
    seq: { order: 1, purchase: 1 },
  };
}

// Limitador simple en memoria para intentos de inicio de sesión / registro.
const attempts = new Map();
function rateLimit(key, max = 10, windowMs = 15 * 60000) {
  const t = now();
  const rec = attempts.get(key);
  if (!rec || rec.reset < t) { attempts.set(key, { n: 1, reset: t + windowMs }); return; }
  if (++rec.n > max) throw new HttpError(429, 'Demasiados intentos. Prueba de nuevo en unos minutos.');
}
setInterval(() => { const t = now(); for (const [k, v] of attempts) if (v.reset < t) attempts.delete(k); }, 60000).unref();

/* ---------------- aplicación ---------------- */
function createApp(db) {
  const q = {
    tenant: db.prepare('SELECT * FROM tenants WHERE id = ?'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    usersOf: db.prepare('SELECT id, name, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at'),
    countUsers: db.prepare('SELECT COUNT(*) AS n FROM users WHERE tenant_id = ?'),
    session: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    state: db.prepare('SELECT version, data, updated_at FROM tenant_state WHERE tenant_id = ?'),
    stateVersion: db.prepare('SELECT version FROM tenant_state WHERE tenant_id = ?'),
    updateState: db.prepare('UPDATE tenant_state SET version = version + 1, data = ?, updated_at = ?, updated_by = ? WHERE tenant_id = ? AND version = ?'),
    logEvent: db.prepare('INSERT INTO billing_events (tenant_id, kind, payload, created_at) VALUES (?, ?, ?, ?)'),
  };
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());

  function setTenant(id, fields) {
    const keys = Object.keys(fields);
    db.prepare(`UPDATE tenants SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), id);
  }

  function access(t) {
    const n = now();
    const ok = (reason, extra = {}) => ({ canWrite: true, reason, ...extra });
    const no = (reason) => ({ canWrite: false, reason });
    switch (t.status) {
      case 'trial':
        return t.trial_ends_at > n ? ok('trial', { daysLeft: Math.ceil((t.trial_ends_at - n) / DAY) }) : no('trial_expired');
      case 'active':
        // Con suscripción de Mercado Pago manda el estado de MP; si se activó a mano, manda la fecha.
        if (t.mp_preapproval_id || !t.current_period_end || t.current_period_end > n) return ok('active');
        return no('expired');
      case 'past_due':
        return t.grace_until > n ? ok('past_due', { daysLeft: Math.ceil((t.grace_until - n) / DAY) }) : no('past_due');
      case 'canceled':
        return t.current_period_end > n ? ok('canceled', { daysLeft: Math.ceil((t.current_period_end - n) / DAY) }) : no('canceled');
      default:
        return no('unknown');
    }
  }
  const limitsOf = (t) => PLANS[t.status === 'trial' ? TRIAL_PLAN : t.plan] || PLANS[TRIAL_PLAN];

  function me(user) {
    const t = q.tenant.get(user.tenant_id);
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: {
        id: t.id, name: t.name, plan: t.plan, status: t.status,
        trialEndsAt: t.trial_ends_at, currentPeriodEnd: t.current_period_end, graceUntil: t.grace_until,
        hasSubscription: Boolean(t.mp_preapproval_id) && t.status === 'active',
        payerEmail: t.mp_payer_email,
      },
      limits: limitsOf(t),
      access: access(t),
      isAdmin: config.adminEmails.includes(user.email),
      billing: { enabled: MP.configured() || config.devBilling, simulated: config.devBilling, currency: config.currency },
    };
  }

  /* ---- sesiones ---- */
  function cookieHeader(value, maxAgeSec) {
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${config.secureCookies ? '; Secure' : ''}`;
  }
  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    q.insertSession.run(sha256(token), userId, now() + SESSION_DAYS * DAY);
    res.setHeader('Set-Cookie', cookieHeader(token, SESSION_DAYS * 86400));
  }
  function readToken(req) {
    const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
    return m ? m[1] : null;
  }
  function currentUser(req) {
    const token = readToken(req);
    return token ? q.session.get(sha256(token), now()) : null;
  }

  /* ---- facturación ---- */
  async function syncSubscription(pre) {
    const { tenantId, planId } = MP.parseRef(pre.external_reference);
    const t = tenantId && q.tenant.get(tenantId);
    if (!t) return null;
    q.logEvent.run(t.id, `preapproval.${pre.status}`, JSON.stringify({ id: pre.id, status: pre.status, plan: planId }), now());
    const nextPayment = pre.next_payment_date ? Date.parse(pre.next_payment_date) : null;
    if (pre.status === 'authorized') {
      setTenant(t.id, {
        status: 'active', plan: PLANS[planId] ? planId : t.plan, mp_preapproval_id: pre.id,
        current_period_end: nextPayment, grace_until: null, mp_payer_email: pre.payer_email || t.mp_payer_email,
      });
    } else if (pre.status === 'paused' && t.mp_preapproval_id === pre.id) {
      setTenant(t.id, { status: 'past_due', grace_until: now() + config.graceDays * DAY });
    } else if (pre.status === 'cancelled' && t.mp_preapproval_id === pre.id) {
      setTenant(t.id, { status: 'canceled', mp_preapproval_id: null, current_period_end: t.current_period_end || now() });
    }
    return q.tenant.get(t.id);
  }

  /* ---- rutas ---- */
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => routes.push({ method, pattern, handler, ...opts });
  const requireOwner = (user) => { if (user.role !== 'owner') throw new HttpError(403, 'Solo el dueño de la cuenta puede hacer esto.'); };

  route('GET', '/api/plans', () => publicPlans(), { auth: false });

  route('POST', '/api/auth/register', ({ body, req, res }) => {
    rateLimit(`reg:${clientIp(req)}`, 20, 60 * 60000);
    const workshop = str(body.workshop, 'nombre del taller', { min: 2, max: 80 });
    const name = str(body.name, 'tu nombre', { max: 80 });
    const mail = email(body.email);
    const pw = password(body.password);
    if (q.userByEmail.get(mail)) throw new HttpError(409, 'Ya existe una cuenta con ese email. Inicia sesión.');
    const tenantId = uuid();
    const userId = uuid();
    const t = now();
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO tenants (id, name, plan, status, trial_ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(tenantId, workshop, TRIAL_PLAN, 'trial', t + config.trialDays * DAY, t);
      db.prepare('INSERT INTO users (id, tenant_id, name, email, pass, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(userId, tenantId, name, mail, hashPassword(pw), 'owner', t);
      db.prepare('INSERT INTO tenant_state (tenant_id, version, data, updated_at) VALUES (?, 1, ?, ?)')
        .run(tenantId, JSON.stringify(emptyState()), t);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    startSession(res, userId);
    return me(q.userById.get(userId));
  }, { auth: false });

  route('POST', '/api/auth/login', ({ body, req, res }) => {
    const mail = email(body.email);
    rateLimit(`login:${clientIp(req)}:${mail}`);
    const user = q.userByEmail.get(mail);
    if (!user || !checkPassword(String(body.password || ''), user.pass)) throw new HttpError(401, 'Email o contraseña incorrectos.');
    startSession(res, user.id);
    return me(user);
  }, { auth: false });

  route('POST', '/api/auth/logout', ({ req, res }) => {
    const token = readToken(req);
    if (token) q.deleteSession.run(sha256(token));
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return { ok: true };
  }, { auth: false });

  route('GET', '/api/me', ({ user }) => me(user));

  route('POST', '/api/me/password', ({ user, body }) => {
    if (!checkPassword(String(body.current || ''), user.pass)) throw new HttpError(400, 'La contraseña actual no es correcta.');
    db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(hashPassword(password(body.next)), user.id);
    return { ok: true };
  });

  /* datos del taller */
  route('GET', '/api/state', ({ user }) => {
    const s = q.state.get(user.tenant_id);
    return { version: s.version, data: JSON.parse(s.data), updatedAt: s.updated_at };
  });
  route('GET', '/api/state/version', ({ user }) => ({ version: q.stateVersion.get(user.tenant_id).version }));
  route('PUT', '/api/state', ({ user, body }) => {
    const t = q.tenant.get(user.tenant_id);
    if (!access(t).canWrite) throw new HttpError(402, 'Tu suscripción no está activa. Elige un plan para seguir editando.');
    const data = body.data;
    if (!data || typeof data !== 'object' || !['orders', 'parts', 'bays', 'mechanics', 'suppliers', 'purchases'].every((k) => Array.isArray(data[k]))) {
      throw new HttpError(400, 'Formato de datos inválido.');
    }
    const lim = limitsOf(t);
    if (lim.maxBays && data.bays.length > lim.maxBays) {
      throw new HttpError(403, `Tu plan ${lim.name} permite hasta ${lim.maxBays} bahías. Mejora tu plan para añadir más.`);
    }
    const json = JSON.stringify(data);
    const r = q.updateState.run(json, now(), user.id, user.tenant_id, Number(body.version));
    if (r.changes === 0) {
      const s = q.state.get(user.tenant_id);
      throw new HttpError(409, 'Los datos cambiaron en otro dispositivo.', { version: s.version, data: JSON.parse(s.data) });
    }
    return { version: Number(body.version) + 1 };
  });

  /* usuarios del taller */
  route('GET', '/api/users', ({ user }) => ({ users: q.usersOf.all(user.tenant_id), max: limitsOf(q.tenant.get(user.tenant_id)).maxUsers }));
  route('POST', '/api/users', ({ user, body }) => {
    requireOwner(user);
    const t = q.tenant.get(user.tenant_id);
    const lim = limitsOf(t);
    if (q.countUsers.get(t.id).n >= lim.maxUsers) throw new HttpError(403, `Tu plan ${lim.name} permite hasta ${lim.maxUsers} usuarios.`);
    const mail = email(body.email);
    if (q.userByEmail.get(mail)) throw new HttpError(409, 'Ese email ya está registrado.');
    const role = body.role === 'owner' ? 'owner' : 'staff';
    const id = uuid();
    db.prepare('INSERT INTO users (id, tenant_id, name, email, pass, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, t.id, str(body.name, 'nombre', { max: 80 }), mail, hashPassword(password(body.password)), role, now());
    return { ok: true, id };
  });
  route('DELETE', /^\/api\/users\/([\w-]+)$/, ({ user, params }) => {
    requireOwner(user);
    if (params[0] === user.id) throw new HttpError(400, 'No puedes eliminar tu propio usuario.');
    const r = db.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?').run(params[0], user.tenant_id);
    if (!r.changes) throw new HttpError(404, 'Usuario no encontrado.');
    return { ok: true };
  });
  route('POST', /^\/api\/users\/([\w-]+)\/password$/, ({ user, params, body }) => {
    requireOwner(user);
    const r = db.prepare('UPDATE users SET pass = ? WHERE id = ? AND tenant_id = ?').run(hashPassword(password(body.password)), params[0], user.tenant_id);
    if (!r.changes) throw new HttpError(404, 'Usuario no encontrado.');
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(params[0]);
    return { ok: true };
  });

  /* suscripción */
  route('POST', '/api/billing/checkout', async ({ user, body }) => {
    requireOwner(user);
    const plan = PLANS[body.plan];
    if (!plan) throw new HttpError(400, 'Plan desconocido.');
    const t = q.tenant.get(user.tenant_id);
    const users = q.countUsers.get(t.id).n;
    if (users > plan.maxUsers) throw new HttpError(400, `Tienes ${users} usuarios y el plan ${plan.name} admite ${plan.maxUsers}. Elimina usuarios o elige otro plan.`);
    const st = JSON.parse(q.state.get(t.id).data);
    if (plan.maxBays && st.bays.length > plan.maxBays) throw new HttpError(400, `Tienes ${st.bays.length} bahías y el plan ${plan.name} admite ${plan.maxBays}.`);

    if (config.devBilling) {
      setTenant(t.id, { status: 'active', plan: plan.id, current_period_end: now() + 30 * DAY, grace_until: null });
      q.logEvent.run(t.id, 'dev.activated', JSON.stringify({ plan: plan.id }), now());
      return { url: '/app/?pago=simulado' };
    }
    if (!MP.configured()) throw new HttpError(503, 'Los pagos aún no están configurados. Contáctanos para activar tu cuenta.');

    // Si ya hay una suscripción activa, solo se cambia el importe.
    if (t.mp_preapproval_id && t.status === 'active') {
      const pre = await MP.changePlan(t.mp_preapproval_id, t.id, plan);
      await syncSubscription({ ...pre, external_reference: `${t.id}|${plan.id}` });
      return { url: '/app/?plan=actualizado' };
    }
    const payerEmail = body.payerEmail ? email(body.payerEmail) : user.email;
    const pre = await MP.createSubscription({ tenantId: t.id, plan, payerEmail, backUrl: `${config.appUrl}/app/` });
    setTenant(t.id, { mp_payer_email: payerEmail });
    q.logEvent.run(t.id, 'checkout.created', JSON.stringify({ id: pre.id, plan: plan.id }), now());
    return { url: pre.init_point };
  });

  route('POST', '/api/billing/sync', async ({ user, body }) => {
    if (!MP.configured() || !body.preapprovalId) return me(user);
    const pre = await MP.getSubscription(String(body.preapprovalId));
    if (MP.parseRef(pre.external_reference).tenantId !== user.tenant_id) throw new HttpError(403, 'Esta suscripción no pertenece a tu taller.');
    await syncSubscription(pre);
    return me(user);
  });

  route('POST', '/api/billing/cancel', async ({ user }) => {
    requireOwner(user);
    const t = q.tenant.get(user.tenant_id);
    if (t.mp_preapproval_id && MP.configured()) {
      await MP.updateSubscription(t.mp_preapproval_id, { status: 'cancelled' });
    }
    setTenant(t.id, { status: 'canceled', mp_preapproval_id: null, current_period_end: t.current_period_end || now() });
    q.logEvent.run(t.id, 'canceled.by_owner', null, now());
    return me(user);
  });

  route('POST', '/api/webhooks/mercadopago', async ({ req, body, url }) => {
    const type = body.type || url.searchParams.get('type') || url.searchParams.get('topic');
    const dataId = body.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!MP.verifySignature(req.headers, url.searchParams.get('data.id') || dataId)) throw new HttpError(401, 'Firma inválida.');
    if (!MP.configured() || !dataId) return { ok: true };
    let preId = null;
    if (type === 'subscription_preapproval' || type === 'preapproval') preId = dataId;
    else if (type === 'subscription_authorized_payment') preId = (await MP.getAuthorizedPayment(dataId)).preapproval_id;
    if (preId) await syncSubscription(await MP.getSubscription(preId));
    return { ok: true };
  }, { auth: false, csrf: false });

  /* administración (dueños del servicio) */
  const requireAdmin = (user) => { if (!config.adminEmails.includes(user.email)) throw new HttpError(403, 'Acceso restringido.'); };
  route('GET', '/api/admin/tenants', ({ user }) => {
    requireAdmin(user);
    const rows = db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS users,
      (SELECT email FROM users u WHERE u.tenant_id = t.id AND u.role = 'owner' ORDER BY created_at LIMIT 1) AS owner_email,
      s.updated_at AS last_activity FROM tenants t LEFT JOIN tenant_state s ON s.tenant_id = t.id ORDER BY t.created_at DESC`).all();
    return { tenants: rows.map((t) => ({ ...t, access: access(t) })), plans: PLANS, currency: config.currency };
  });
  route('POST', /^\/api\/admin\/tenants\/([\w-]+)$/, ({ user, params, body }) => {
    requireAdmin(user);
    const t = q.tenant.get(params[0]);
    if (!t) throw new HttpError(404, 'Taller no encontrado.');
    const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
    if (body.action === 'activate') {
      if (!PLANS[body.plan]) throw new HttpError(400, 'Plan desconocido.');
      const base = Math.max(now(), t.current_period_end || 0);
      setTenant(t.id, { status: 'active', plan: body.plan, current_period_end: base + days * DAY, grace_until: null });
    } else if (body.action === 'extend_trial') {
      setTenant(t.id, { status: 'trial', trial_ends_at: Math.max(now(), t.trial_ends_at || 0) + days * DAY });
    } else if (body.action === 'suspend') {
      setTenant(t.id, { status: 'canceled', current_period_end: now() });
    } else throw new HttpError(400, 'Acción desconocida.');
    q.logEvent.run(t.id, `admin.${body.action}`, JSON.stringify({ by: user.email, plan: body.plan, days }), now());
    return { ok: true };
  });

  /* ---------------- manejador HTTP ---------------- */
  async function handleApi(req, res, url) {
    const r = routes.find((x) => x.method === req.method && (typeof x.pattern === 'string' ? x.pattern === url.pathname : x.pattern.test(url.pathname)));
    if (!r) throw new HttpError(404, 'No encontrado.');
    const params = typeof r.pattern === 'string' ? [] : url.pathname.match(r.pattern).slice(1);
    // Protección CSRF: las peticiones que modifican datos deben llevar este encabezado (no se puede enviar desde otro sitio sin CORS).
    if (req.method !== 'GET' && r.csrf !== false && req.headers['x-requested-with'] !== 'tallerflow') throw new HttpError(403, 'Petición rechazada.');
    const user = currentUser(req);
    if (r.auth !== false && !user) throw new HttpError(401, 'Inicia sesión para continuar.');
    const body = req.method === 'GET' ? {} : await readJson(req);
    return r.handler({ req, res, url, params, body, user });
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://x');
    setSecurityHeaders(res);
    try {
      if (url.pathname.startsWith('/api/')) {
        const out = await handleApi(req, res, url);
        return sendJson(res, 200, out);
      }
      return serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, ...(e.body || {}) });
      if (e.body && e.status) { // error de Mercado Pago
        console.error('Mercado Pago:', e.status, JSON.stringify(e.body));
        return sendJson(res, 502, { error: 'No se pudo comunicar con Mercado Pago. Intenta de nuevo.' });
      }
      console.error(e);
      return sendJson(res, 500, { error: 'Error interno.' });
    }
  };
}

/* ---------------- HTTP helpers ---------------- */
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
}
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
}
function sendJson(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(s);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Los datos son demasiado grandes.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'JSON inválido.')); }
    });
    req.on('error', reject);
  });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Método no permitido.' });
  let p = decodeURIComponent(url.pathname);
  if (p === '/app' || p === '/demo') { res.writeHead(301, { Location: p + '/' }); return res.end(); }
  if (p.startsWith('/demo/')) p = '/app/' + p.slice(6); // la demo usa la misma app, en modo local
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 403, { error: 'Prohibido.' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const nf = path.join(PUBLIC_DIR, '404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return fs.existsSync(nf) ? fs.createReadStream(nf).pipe(res) : res.end('No encontrado');
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

if (require.main === module) {
  const db = openDb(path.join(config.dataDir, 'tallerflow.db'));
  const server = http.createServer(createApp(db));
  server.listen(config.port, () => {
    console.log(`TallerFlow escuchando en ${config.appUrl} (puerto ${config.port})`);
    if (config.devBilling) console.log('⚠ Modo de prueba: los pagos se SIMULAN (configura MP_ACCESS_TOKEN para cobrar de verdad).');
    if (config.production && !config.mp.webhookSecret) console.log('⚠ Falta MP_WEBHOOK_SECRET: las notificaciones de Mercado Pago serán rechazadas.');
  });
}

module.exports = { createApp, openDb };

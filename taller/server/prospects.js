'use strict';
/* Prospectos: refaccionarias reales que el dueño de Nau invita a registrarse (no se publican sin su alta). */
const crypto = require('node:crypto');

const STATUSES = ['por_contactar', 'contactado', 'interesado', 'registrado', 'no_interesado'];

function migrateProspects(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      invite_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      municipio TEXT,
      address TEXT,
      phone TEXT,
      source TEXT,                       -- de dónde salió el dato (URL o "visita")
      status TEXT NOT NULL,
      notes TEXT,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function registerProspects({ db, route, HttpError, str, now, requireAdmin, appUrl }) {
  migrateProspects(db);
  const opt = (v, field, max) => (v === undefined || v === null || String(v).trim() === '' ? null : str(String(v), field, { min: 1, max }));
  const digits = (v) => String(v || '').replace(/\D/g, '').slice(0, 15) || null;
  const code = () => crypto.randomBytes(5).toString('base64url');
  const inviteUrl = (p) => `${appUrl}/cuenta.html?inv=${p.invite_code}&nombre=${encodeURIComponent(p.name)}${p.municipio ? `&municipio=${encodeURIComponent(p.municipio)}` : ''}${p.phone ? `&whatsapp=${p.phone}` : ''}#refaccionaria`;
  const view = (p) => ({ ...p, invite_url: inviteUrl(p) });

  route('GET', '/api/admin/prospects', ({ user }) => {
    requireAdmin(user);
    const rows = db.prepare('SELECT * FROM prospects ORDER BY CASE status WHEN \'registrado\' THEN 9 WHEN \'no_interesado\' THEN 8 ELSE 0 END, municipio, name').all();
    const counts = Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));
    return { prospects: rows.map(view), counts };
  });

  route('POST', '/api/admin/prospects', ({ user, body }) => {
    requireAdmin(user);
    const list = Array.isArray(body.items) ? body.items : [body];
    if (!list.length || list.length > 2000) throw new HttpError(400, 'Envía entre 1 y 2,000 prospectos.');
    const ins = db.prepare(`INSERT INTO prospects (id, invite_code, name, municipio, address, phone, source, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'por_contactar', ?, ?, ?)`);
    const exists = db.prepare('SELECT 1 FROM prospects WHERE lower(name) = lower(?) AND (phone IS ? OR phone = ?)');
    let added = 0; let skipped = 0;
    db.exec('BEGIN');
    try {
      list.forEach((it, i) => {
        const line = list.length > 1 ? ` (fila ${i + 1})` : '';
        const name = str(String(it?.name ?? ''), `nombre${line}`, { min: 2, max: 120 });
        const phone = digits(it?.phone);
        if (exists.get(name, phone, phone)) { skipped++; return; }
        ins.run(crypto.randomUUID(), code(), name, opt(it?.municipio, `municipio${line}`, 80), opt(it?.address, `dirección${line}`, 200),
          phone, opt(it?.source, `fuente${line}`, 300), opt(it?.notes, `notas${line}`, 500), now(), now());
        added++;
      });
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return { added, skipped };
  });

  route('PUT', /^\/api\/admin\/prospects\/([\w-]+)$/, ({ user, params, body }) => {
    requireAdmin(user);
    const p = db.prepare('SELECT * FROM prospects WHERE id = ?').get(params[0]);
    if (!p) throw new HttpError(404, 'Prospecto no encontrado.');
    const status = body.status === undefined ? p.status : body.status;
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Estado desconocido.');
    const notes = body.notes === undefined ? p.notes : opt(body.notes, 'notas', 500);
    db.prepare('UPDATE prospects SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(status, notes, now(), p.id);
    return view(db.prepare('SELECT * FROM prospects WHERE id = ?').get(p.id));
  });

  route('DELETE', /^\/api\/admin\/prospects\/([\w-]+)$/, ({ user, params }) => {
    requireAdmin(user);
    const r = db.prepare('DELETE FROM prospects WHERE id = ?').run(params[0]);
    if (!r.changes) throw new HttpError(404, 'Prospecto no encontrado.');
    return { ok: true };
  });

  /** Al registrarse con un enlace de invitación, el prospecto queda vinculado a la cuenta. */
  return function linkInvite(inviteCode, tenantId) {
    if (!inviteCode) return;
    db.prepare("UPDATE prospects SET status = 'registrado', tenant_id = ?, updated_at = ? WHERE invite_code = ?").run(tenantId, now(), String(inviteCode).slice(0, 20));
  };
}

module.exports = { registerProspects, STATUSES };

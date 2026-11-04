'use strict';
const fs = require('node:fs');
const path = require('node:path');
// node:sqlite viene incluido en Node >= 22.5; silenciamos su aviso de "experimental".
const origEmit = process.emitWarning;
process.emitWarning = (w, ...a) => (String(w).includes('SQLite') ? undefined : origEmit.call(process, w, ...a));
const { DatabaseSync } = require('node:sqlite');

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,              -- trial | active | past_due | canceled
      trial_ends_at INTEGER,
      current_period_end INTEGER,
      grace_until INTEGER,
      mp_preapproval_id TEXT,
      mp_payer_email TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      pass TEXT NOT NULL,
      role TEXT NOT NULL,                -- owner | staff
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS users_tenant ON users(tenant_id);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tenant_state (
      tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    );
    CREATE TABLE IF NOT EXISTS ai_usage (
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      month TEXT NOT NULL,               -- AAAA-MM
      messages INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, month)
    );
    CREATE TABLE IF NOT EXISTS billing_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT,
      kind TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  migrateMarket(db);
  return db;
}

/* Mercado de refacciones: perfiles con ubicación, catálogos, solicitudes de cotización y respuestas. */
function migrateMarket(db) {
  const cols = new Set(db.prepare('PRAGMA table_info(tenants)').all().map((c) => c.name));
  const add = (name, type) => { if (!cols.has(name)) db.exec(`ALTER TABLE tenants ADD COLUMN ${name} ${type}`); };
  add('kind', "TEXT NOT NULL DEFAULT 'taller'"); // taller | refaccionaria
  add('phone', 'TEXT');
  add('whatsapp', 'TEXT');
  add('address', 'TEXT');
  add('colonia', 'TEXT');
  add('municipio', 'TEXT');
  add('lat', 'REAL');
  add('lng', 'REAL');
  add('radius_km', 'INTEGER');
  add('delivers', 'INTEGER');
  add('hours', 'TEXT');
  add('categories', 'TEXT');
  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      oem TEXT,                          -- números de parte equivalentes
      fits TEXT,                         -- compatibilidad, ej. "Nissan Versa 2012-2019"
      price REAL,
      stock INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE (tenant_id, sku)
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(
      name, brand, category, oem, fits, sku,
      content = 'catalog_items', content_rowid = 'id', tokenize = 'unicode61 remove_diacritics 2'
    );
    CREATE TRIGGER IF NOT EXISTS catalog_ai AFTER INSERT ON catalog_items BEGIN
      INSERT INTO catalog_fts (rowid, name, brand, category, oem, fits, sku) VALUES (new.id, new.name, new.brand, new.category, new.oem, new.fits, new.sku);
    END;
    CREATE TRIGGER IF NOT EXISTS catalog_ad AFTER DELETE ON catalog_items BEGIN
      INSERT INTO catalog_fts (catalog_fts, rowid, name, brand, category, oem, fits, sku) VALUES ('delete', old.id, old.name, old.brand, old.category, old.oem, old.fits, old.sku);
    END;
    CREATE TRIGGER IF NOT EXISTS catalog_au AFTER UPDATE ON catalog_items BEGIN
      INSERT INTO catalog_fts (catalog_fts, rowid, name, brand, category, oem, fits, sku) VALUES ('delete', old.id, old.name, old.brand, old.category, old.oem, old.fits, old.sku);
      INSERT INTO catalog_fts (rowid, name, brand, category, oem, fits, sku) VALUES (new.id, new.name, new.brand, new.category, new.oem, new.fits, new.sku);
    END;
    CREATE TABLE IF NOT EXISTS rfqs (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      taller_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT,
      target_supplier_id TEXT,           -- si se pide a una refaccionaria concreta (desde el buscador)
      status TEXT NOT NULL,              -- abierta | adjudicada | cancelada | vencida
      vehicle TEXT,
      vin TEXT,
      items TEXT NOT NULL,               -- JSON [{name, qty, notes, ref}]
      delivery TEXT NOT NULL,            -- recoger | domicilio
      needed TEXT,                       -- hoy | manana | semana
      radius_km INTEGER NOT NULL,
      notes TEXT,
      lat REAL, lng REAL, municipio TEXT,
      accepted_quote_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS rfqs_taller ON rfqs(taller_id, created_at);
    CREATE INDEX IF NOT EXISTS rfqs_status ON rfqs(status, expires_at);
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
      supplier_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT,
      items TEXT NOT NULL,               -- JSON [{available, price, brand, note}] en el orden de la solicitud
      total REAL NOT NULL,
      delivery_cost REAL NOT NULL DEFAULT 0,
      eta TEXT,
      notes TEXT,
      status TEXT NOT NULL,              -- enviada | aceptada | no_seleccionada | retirada
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (rfq_id, supplier_id)
    );
  `);
}

module.exports = { openDb };

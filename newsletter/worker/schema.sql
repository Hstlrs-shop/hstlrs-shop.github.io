-- Esquema D1 del newsletter. Aplicar con:
--   npx wrangler d1 execute lanaconcafe-news-db --remote --file=schema.sql
-- (instalación nueva). Cambios sobre una base existente: carpeta migrations/.

CREATE TABLE IF NOT EXISTS news (
  id            TEXT PRIMARY KEY,          -- sha256 del enlace normalizado
  fingerprint   TEXT NOT NULL,             -- huella del titular (agrupa la misma noticia en varias fuentes)
  source_id     TEXT NOT NULL,
  source_name   TEXT NOT NULL,
  tier          TEXT NOT NULL,             -- oficial | agencia | medio | agregador
  scope         TEXT NOT NULL,             -- global | nacional
  title         TEXT NOT NULL,
  link          TEXT NOT NULL,
  summary       TEXT,                      -- descripción del feed (recortada)
  published_at  INTEGER NOT NULL,          -- epoch ms según la fuente
  detected_at   INTEGER NOT NULL,          -- epoch ms en que lo vimos nosotros
  score         INTEGER NOT NULL,          -- puntuación heurística 0-100
  impact        INTEGER,                   -- 1-5 (IA o heurística)
  category      TEXT,
  assets        TEXT,                      -- JSON: ["USD/MXN","S&P 500",...]
  bias          TEXT,                      -- alcista | bajista | mixto | neutral
  headline_es   TEXT,                      -- titular reescrito en español
  brief_es      TEXT,                      -- resumen propio 1-2 frases
  ai            INTEGER NOT NULL DEFAULT 0,
  alerted_pro   INTEGER NOT NULL DEFAULT 0,
  alerted_free  INTEGER NOT NULL DEFAULT 0,
  image         TEXT,                      -- foto publicada por la fuente en su RSS
  views         INTEGER NOT NULL DEFAULT 0,
  likes         INTEGER NOT NULL DEFAULT 0,
  dislikes      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_news_views ON news(views DESC);
CREATE TABLE IF NOT EXISTS reactions (
  news_id  TEXT NOT NULL,
  who      TEXT NOT NULL,
  value    INTEGER NOT NULL,
  PRIMARY KEY (news_id, who)
);
CREATE INDEX IF NOT EXISTS idx_news_detected ON news(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_fp ON news(fingerprint);
CREATE INDEX IF NOT EXISTS idx_news_free_queue ON news(alerted_free, impact, detected_at);

CREATE TABLE IF NOT EXISTS digests (
  id           TEXT PRIMARY KEY,           -- AAAA-MM-DD
  created_at   INTEGER NOT NULL,
  subject      TEXT NOT NULL,
  markdown     TEXT NOT NULL,
  html         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  email        TEXT PRIMARY KEY,
  created_at   INTEGER NOT NULL,
  source       TEXT                        -- utm / página de origen
);

-- Suscriptores de pago (Mercado Pago) y su acceso al canal privado de Telegram
CREATE TABLE IF NOT EXISTS members (
  id                  TEXT PRIMARY KEY,    -- preapproval_id de Mercado Pago
  email               TEXT,
  plan                TEXT NOT NULL,       -- pro | api
  status              TEXT NOT NULL,       -- authorized | paused | cancelled
  invite_link         TEXT,
  telegram_user_id    INTEGER,
  api_key             TEXT UNIQUE,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

-- Estado de cada fuente (ETag / Last-Modified) para descargas condicionales
CREATE TABLE IF NOT EXISTS feeds (
  id             TEXT PRIMARY KEY,
  etag           TEXT,
  last_modified  TEXT,
  updated_at     INTEGER NOT NULL
);

-- ===== Funciones Pro del bot =====
-- Radar personal: palabras/tickers que cada usuario sigue
CREATE TABLE IF NOT EXISTS watch (
  tg          INTEGER NOT NULL,
  term        TEXT NOT NULL,          -- normalizado (minúsculas, sin acentos)
  label       TEXT NOT NULL,          -- como lo escribió el usuario
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (tg, term)
);
-- Pruebas Pro (3 días al pedirla, +7 días por cada 3 referidos, regalos del admin)
CREATE TABLE IF NOT EXISTS trials (
  tg          INTEGER PRIMARY KEY,
  until       INTEGER NOT NULL,
  used_trial  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS referrals (
  new_tg      INTEGER PRIMARY KEY,
  referrer    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals(referrer);
-- Uso diario de la IA (límite por plan)
CREATE TABLE IF NOT EXISTS usage (
  tg   INTEGER NOT NULL,
  day  TEXT NOT NULL,
  n    INTEGER NOT NULL,
  PRIMARY KEY (tg, day)
);
-- Cola de mensajes a Telegram (se envían por tandas desde el cron)
CREATE TABLE IF NOT EXISTS outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     TEXT NOT NULL,
  text        TEXT NOT NULL,
  send_after  INTEGER NOT NULL,       -- epoch ms (los gratis reciben el radar con retraso)
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_due ON outbox(send_after);
-- Agenda económica (la carga el admin con /evento) con recordatorio 15 min antes
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          INTEGER NOT NULL,       -- epoch ms
  title       TEXT NOT NULL,
  notified    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);
-- Banderas varias (p. ej. último briefing enviado)
CREATE TABLE IF NOT EXISTS flags (
  k  TEXT PRIMARY KEY,
  v  TEXT NOT NULL
);

-- Memoria corta de "Pregúntale a Lana" (últimos 3 intercambios por usuario, 2 h)
CREATE TABLE IF NOT EXISTS convo (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  tg    INTEGER NOT NULL,
  role  TEXT NOT NULL,        -- user | assistant
  text  TEXT NOT NULL,
  at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_convo_tg ON convo(tg, id);

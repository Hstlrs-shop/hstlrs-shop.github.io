-- Esquema D1 del newsletter. Aplicar con:
--   npx wrangler d1 execute pulso-db --remote --file=schema.sql

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
  alerted_free  INTEGER NOT NULL DEFAULT 0
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

-- Suscriptores de pago (Stripe) y su acceso al canal privado de Telegram
CREATE TABLE IF NOT EXISTS members (
  stripe_customer     TEXT PRIMARY KEY,
  checkout_session    TEXT UNIQUE,
  email               TEXT,
  plan                TEXT NOT NULL,       -- pro | api
  status              TEXT NOT NULL,       -- active | canceled
  invite_link         TEXT,
  telegram_user_id    INTEGER,
  api_key             TEXT UNIQUE,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

-- Videos diarios con aprobación desde Telegram, guía de pago y enlaces de la bio por red
CREATE TABLE IF NOT EXISTS approvals (
  id           TEXT PRIMARY KEY,        -- p. ej. 2026-11-21-0830
  slot         TEXT NOT NULL,           -- hora CDMX "08:30"
  publish_at   INTEGER NOT NULL,        -- ms UTC
  kind         TEXT NOT NULL,           -- educativo | curioso | noticia | cierre
  title        TEXT NOT NULL,
  caption      TEXT NOT NULL,
  video_url    TEXT,                    -- URL directa (firmada) para la vista previa
  drive_url    TEXT,
  post_id      TEXT NOT NULL,           -- borrador de vidIQ (Instagram + TikTok)
  revision     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new',  -- new → sent → approved | rejected → published | failed | expired
  note         TEXT,
  created_at   INTEGER NOT NULL,
  sent_at      INTEGER,
  decided_at   INTEGER,
  published_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status, publish_at);

CREATE TABLE IF NOT EXISTS purchases (
  charge_id  TEXT PRIMARY KEY,          -- telegram_payment_charge_id (sirve para reembolsar)
  tg         INTEGER NOT NULL,
  product    TEXT NOT NULL,
  stars      INTEGER NOT NULL,
  refunded   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_tg ON purchases(tg);

CREATE TABLE IF NOT EXISTS downloads (
  token      TEXT PRIMARY KEY,
  tg         INTEGER NOT NULL,
  product    TEXT NOT NULL,
  expires    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clicks (
  day  TEXT NOT NULL,
  src  TEXT NOT NULL,                   -- ig | tt | yt | web
  dest TEXT NOT NULL,                   -- view | canal | guia | pro | bot
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, src, dest)
);

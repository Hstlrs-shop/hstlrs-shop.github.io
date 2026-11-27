-- Afiliados (creadores aliados) y atribución de usuarios
CREATE TABLE IF NOT EXISTS affiliates (
  code        TEXT PRIMARY KEY,       -- minúsculas, números y _
  name        TEXT NOT NULL,
  tg          INTEGER,                -- Telegram del creador (para que vea sus números con /comisiones)
  pct         INTEGER NOT NULL,       -- % de comisión sobre lo que recibes por suscriptor
  clicks      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attribution (
  tg    INTEGER PRIMARY KEY,          -- usuario del bot (primer creador que lo trajo)
  code  TEXT NOT NULL,
  at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attr_code ON attribution(code);

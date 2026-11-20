-- Secuencia de bienvenida del bot (día 1, día 3)
CREATE TABLE IF NOT EXISTS drip (
  tg          INTEGER PRIMARY KEY,
  step        INTEGER NOT NULL,       -- siguiente paso a enviar (1, 2; 3 = terminado)
  next_at     INTEGER NOT NULL,
  started_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drip_due ON drip(next_at);

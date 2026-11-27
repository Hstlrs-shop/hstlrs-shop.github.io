-- Memoria corta de "Pregúntale a Lana"
CREATE TABLE IF NOT EXISTS convo (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  tg    INTEGER NOT NULL,
  role  TEXT NOT NULL,
  text  TEXT NOT NULL,
  at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_convo_tg ON convo(tg, id);

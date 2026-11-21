-- Señales de scalping BTC (solo admin) con su resultado real en R
CREATE TABLE IF NOT EXISTS scalp_signals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  t          INTEGER NOT NULL UNIQUE,   -- apertura (s) de la vela de 1 min del gatillo
  day        TEXT NOT NULL,             -- fecha CDMX
  side       TEXT NOT NULL,             -- long | short
  entry      REAL NOT NULL, stop REAL NOT NULL, tp1 REAL NOT NULL, tp2 REAL NOT NULL, risk REAL NOT NULL,
  score      INTEGER NOT NULL, grade TEXT NOT NULL, reasons TEXT,
  status     TEXT NOT NULL,             -- open | objetivo | stop | tiempo
  exit       REAL, r REAL, closed_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scalp_day ON scalp_signals(day, t);
CREATE INDEX IF NOT EXISTS idx_scalp_status ON scalp_signals(status);

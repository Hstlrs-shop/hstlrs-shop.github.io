-- Fotos, vistas y reacciones de cada noticia (ya aplicada en producción el 2026-11-20)
ALTER TABLE news ADD COLUMN image TEXT;
ALTER TABLE news ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN likes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN dislikes INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_news_views ON news(views DESC);
CREATE TABLE IF NOT EXISTS reactions (
  news_id  TEXT NOT NULL,
  who      TEXT NOT NULL,   -- hash de IP + navegador (no se guarda la IP)
  value    INTEGER NOT NULL,
  PRIMARY KEY (news_id, who)
);

-- Fase 2: la cola del canal gratis corre cada minuto. El índice anterior (alerted_free, impact, detected_at)
-- no podía usar la fecha y recorría todo el historial de noticias sin alertar (agotó el límite diario de lecturas de D1).
-- Con (alerted_free, detected_at) solo se recorren las noticias de las últimas 3 horas.
CREATE INDEX IF NOT EXISTS idx_news_free_recent ON news(alerted_free, detected_at);

-- Fase 1 del motor eficiente: registro de cada llamada a Claude (tokens y tiempo) para medir costo por tarea.
CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,             -- epoch ms
  task TEXT NOT NULL,              -- classify | digest | ask_fast | ask_deep | kit
  model TEXT NOT NULL,             -- modelo que respondió (response.model)
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read INTEGER NOT NULL DEFAULT 0,
  cache_write INTEGER NOT NULL DEFAULT 0,
  ms INTEGER NOT NULL DEFAULT 0,   -- duración de la llamada
  stop TEXT                        -- stop_reason
);
CREATE INDEX IF NOT EXISTS ai_usage_ts ON ai_usage(ts);
CREATE INDEX IF NOT EXISTS ai_usage_task ON ai_usage(task, ts);

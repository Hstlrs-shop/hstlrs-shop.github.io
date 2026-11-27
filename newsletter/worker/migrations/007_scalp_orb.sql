-- v2 del motor: tipo de señal y etapa de la gestión (0 = completa, 1 = 50 % cerrado y stop en equilibrio)
ALTER TABLE scalp_signals ADD COLUMN kind TEXT NOT NULL DEFAULT 'pullback';
ALTER TABLE scalp_signals ADD COLUMN stage INTEGER NOT NULL DEFAULT 0;

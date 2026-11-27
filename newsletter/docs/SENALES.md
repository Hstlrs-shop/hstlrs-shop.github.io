# Señales de BTC: método y resultados

Señales privadas para el administrador (bot de Telegram), en **práctica con cuenta demo**. No son asesoría ni se ofrecen a terceros mientras no haya historial en vivo.

## Método (para no engañarnos)

1. **Hipótesis con lógica de mercado**, no combinaciones al azar de indicadores.
2. **Calibración y prueba separadas**: se elige con el periodo viejo y se califica con el reciente, que no se usó para elegir.
3. **Todo neto de comisiones** (0.05 % por lado taker; 0.02 % maker).
4. **Sensibilidad**: si el resultado solo existe con un parámetro exacto, se descarta.
5. **El código en vivo es el mismo del backtest** (`src/scalp-core.ts`); `scripts/verify-*.ts` comprueba que da los mismos números.
6. **Bitácora en vivo** (`/bitacora`): si una estrategia queda muy por debajo de su backtest tras ~30 operaciones, se apaga.

## Resultados (R neto por operación)

| Estrategia | Datos | Calibración | Prueba | Estado |
|---|---|---|---|---|
| Retroceso 1 min (VWAP/EMA/Fibo) | 130 sesiones | −0.75R | −0.78R | Apagada |
| **Ruptura del rango de apertura 8:30–8:45 + tendencia 1 h** (50 % en 2R, resto 3R) | 130 sesiones | +0.08R | +0.34R | **Activa** |
| Fibonacci 38.2–61.8 % + tendencia 1 h, 2R | 130 días | +0.02R | −0.01R | Activa (práctica) |
| **Tendencia 4 h: Donchian 20/10 + EMA 200, stop 2×ATR dinámico** | 2 años | +0.07R | +0.11R | **Activa** |
| Estacionalidad por hora | 2 años | — | correlación −0.03 | Descartada |
| RSI 2 (reversión a la media) | 2 años | −0.17R | −0.24R | Descartada |
| Compresión de Bollinger | 2 años | −0.07R | −0.17R | Descartada |
| Financiamiento extremo (Hyperliquid) | 2 años | contradictorio | contradictorio | Descartada |

Las órdenes límite (maker) mejoran cualquier estrategia en +0.02 a +0.08R por operación.

## Scripts

- `scripts/scalp-data.ts`, `scripts/edge-data.ts`: descargan velas de Bitstamp a una caché local.
- `scripts/lab-scalp.ts`, `scripts/lab-fib.ts`, `scripts/lab-edge.ts`, `scripts/edge-funding.ts`: laboratorios.
- `scripts/verify-orb.ts`, `scripts/verify-trend.ts`: el código en vivo reproduce el laboratorio.

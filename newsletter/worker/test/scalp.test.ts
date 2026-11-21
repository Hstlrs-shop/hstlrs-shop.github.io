import { test } from "node:test";
import assert from "node:assert/strict";
import { emaSeries, rsi, atr, vwapBands, fibo, read, trigger, type Bar } from "../src/scalp-core.ts";

test("EMA, RSI y ATR básicos", () => {
  assert.deepEqual(emaSeries([10, 10, 10], 9), [10, 10, 10]);
  assert.equal(rsi(Array.from({ length: 30 }, (_, i) => 100 + i)), 100);           // solo subidas
  assert.ok(rsi(Array.from({ length: 30 }, (_, i) => 100 - i)) < 1);                // solo bajadas
  const bars: Bar[] = Array.from({ length: 20 }, (_, i) => ({ t: i * 60, o: 100, h: 101, l: 99, c: 100, v: 1 }));
  assert.equal(Math.round(atr(bars)), 2);
});

test("VWAP pondera por volumen", () => {
  const { vwap } = vwapBands([{ t: 0, o: 10, h: 10, l: 10, c: 10, v: 1 }, { t: 60, o: 20, h: 20, l: 20, c: 20, v: 3 }]);
  assert.equal(vwap, 17.5);
});

test("Fibonacci de un impulso alcista", () => {
  const b: Bar[] = Array.from({ length: 36 }, (_, i) => ({ t: i * 300, o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i, v: 1 }));
  const f = fibo(b, "long");
  assert.ok(f.valid);
  assert.equal(f.r500, (f.high + f.low) / 2);
  assert.ok(f.r382 > f.r500 && f.r500 > f.r618);
});

test("Mercado plano: sin dirección ni señal", () => {
  const now = 2_000_000_000 - (2_000_000_000 % 86400) + 15 * 3600;
  const b1: Bar[] = Array.from({ length: 1000 }, (_, i) => ({ t: now - (1000 - i) * 60, o: 100, h: 100.01, l: 99.99, c: 100, v: 1 }));
  const b5: Bar[] = Array.from({ length: 300 }, (_, i) => ({ t: now - (300 - i) * 300, o: 100, h: 100.01, l: 99.99, c: 100, v: 1 }));
  const r = read(b1, b5, [{ t: now - 86400 * 2, o: 100, h: 101, l: 99, c: 100, v: 1 }], now);
  assert.equal(r.side, null);
  assert.equal(trigger(b1, r, now), null);
});

test("Gestión: 50 % en objetivo 1, stop a equilibrio, luego objetivo 2", async () => {
  const { manage } = await import("../src/scalp-core.ts");
  const p = { side: "long", entry: 100, stop: 99, tp1: 102, tp2: 103, risk: 1, t0: 0 };
  const bar = (t: number, h: number, l: number, c = (h + l) / 2) => ({ t, o: c, h, l, c, v: 1 });
  // sube a 102 (parcial +1R asegurado) y luego a 103 → 0.5×2 + 0.5×3 = 2.5R
  assert.equal(manage([bar(0, 101, 99.5), bar(60, 102.1, 100.5), bar(120, 103.2, 101.5)], p, 600, 0, 90).r, 2.5);
  // sube a 102 y regresa a la entrada → solo el parcial: +1R
  const back = manage([bar(0, 102.1, 99.5), bar(60, 101, 99.9)], p, 600, 0, 90);
  assert.equal(back.status, "equilibrio"); assert.equal(back.r, 1);
  // toca el stop primero → −1R
  assert.equal(manage([bar(0, 100.5, 98.9)], p, 600, 0, 90).r, -1);
});

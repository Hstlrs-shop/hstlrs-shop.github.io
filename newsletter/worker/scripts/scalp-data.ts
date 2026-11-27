// Descarga y guarda en caché las velas de Bitstamp por sesión (para el laboratorio de backtest).
// Uso: node --experimental-strip-types scripts/scalp-data.ts <carpeta> [días=180]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import type { Bar } from "../src/scalp-core.ts";

const dir = process.argv[2], DAYS = Number(process.argv[3] ?? 180);
if (!dir) throw new Error("falta carpeta");
mkdirSync(dir, { recursive: true });

async function ohlc(step: number, limit: number, end: number): Promise<Bar[]> {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=${step}&limit=${limit}&end=${end}`);
    if (r.ok) return ((await r.json()) as any).data.ohlc.map((x: any) => ({ t: +x.timestamp, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume }));
    await new Promise((s) => setTimeout(s, 3000 * (i + 1)));
  }
  throw new Error("Bitstamp no respondió");
}

const today0 = Math.floor(Date.now() / 1000 / 86400) * 86400;
let n = 0;
for (let d = DAYS; d >= 1; d--) {
  const day0 = today0 - d * 86400, dow = new Date(day0 * 1000).getUTCDay();
  if (dow === 0 || dow === 6) continue;
  const f = `${dir}/${new Date(day0 * 1000).toISOString().slice(0, 10)}.json`;
  if (existsSync(f)) { n++; continue; }
  const end = day0 + 16 * 3600 + 59 * 60;
  const [b1, b5, h1, d1] = await Promise.all([ohlc(60, 1000, end), ohlc(300, 300, end), ohlc(3600, 300, end), ohlc(86400, 5, end)]);
  writeFileSync(f, JSON.stringify({ day0, b1, b5, h1, d1 }));
  n++;
  await new Promise((s) => setTimeout(s, 250));
}
console.log(`sesiones en caché: ${n}`);

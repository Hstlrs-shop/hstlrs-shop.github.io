// Descarga historial continuo de BTC/USD (Bitstamp) para el laboratorio de ventaja.
// Uso: node --experimental-strip-types scripts/edge-data.ts <archivo.json> <paso_segundos> <días>
import { writeFileSync } from "node:fs";
const [out, step, days] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const now = Math.floor(Date.now() / 1000 / step) * step, start = now - days * 86400;
const bars: any[] = [];
for (let end = start + 1000 * step; ; end += 1000 * step) {
  const e = Math.min(end, now);
  let j: any;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=${step}&limit=1000&end=${e}`);
    if (r.ok) { j = await r.json(); break; }
    await new Promise((s) => setTimeout(s, 3000 * (i + 1)));
  }
  for (const x of j.data.ohlc) { const t = +x.timestamp; if (t >= start && (!bars.length || t > bars[bars.length - 1].t)) bars.push({ t, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume }); }
  if (e >= now) break;
  await new Promise((s) => setTimeout(s, 200));
}
writeFileSync(out, JSON.stringify(bars));
console.log(`${out}: ${bars.length} velas desde ${new Date(bars[0].t * 1000).toISOString().slice(0, 10)} hasta ${new Date(bars[bars.length - 1].t * 1000).toISOString().slice(0, 16)}`);

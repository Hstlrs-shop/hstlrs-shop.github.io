// Backtest del motor de scalping con velas reales de Bitstamp.
// Uso: node --experimental-strip-types scripts/backtest-scalp.ts [días=45]
// Simula cada minuto de la sesión 8:30–10:30 (CDMX) con las mismas reglas que el Worker:
// una señal a la vez, máximo 5 por día, 2 pérdidas seguidas = fin, enfriamiento de 5 min, stop de tiempo de 15 min.
// Si en la misma vela se tocan stop y objetivo, cuenta como stop (conservador). No incluye comisiones ni deslizamiento.
import { read, trigger, SESSION, CONFIG, type Bar } from "../src/scalp-core.ts";
if (process.argv[4]) CONFIG.minRiskPct = Number(process.argv[4]);

const DAYS = Number(process.argv[2] ?? 45);
const SKIP = Number(process.argv[3] ?? 0); // omite los días más recientes (para validar fuera de muestra)
const CDMX = 6 * 3600;

async function ohlc(step: number, limit: number, end: number): Promise<Bar[]> {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=${step}&limit=${limit}&end=${end}`);
    if (r.ok) {
      const j: any = await r.json();
      return j.data.ohlc.map((x: any) => ({ t: +x.timestamp, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume }));
    }
    await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
  }
  throw new Error("Bitstamp no respondió");
}

type Trade = { day: string; side: string; grade: string; score: number; r: number; status: string; t: number; riskPct: number };
const trades: Trade[] = [];
const today0 = Math.floor(Date.now() / 1000 / 86400) * 86400;
let sessions = 0;

for (let d = DAYS; d >= 1 + SKIP; d--) {
  const day0 = today0 - d * 86400;
  const dow = new Date(day0 * 1000).getUTCDay();
  if (dow === 0 || dow === 6) continue;
  const end = day0 + 16 * 3600 + 50 * 60;
  const [b1, b5, d1] = await Promise.all([ohlc(60, 1000, end), ohlc(300, 300, end), ohlc(86400, 5, end)]);
  sessions++;
  const day = new Date(day0 * 1000).toISOString().slice(0, 10);
  let open: any = null, lastClosed = 0;
  const dayTrades: Trade[] = [];
  const startSec = day0 + CDMX + SESSION.from * 60, stopSec = day0 + CDMX + SESSION.to * 60;
  for (let now = startSec; now <= stopSec + 25 * 60; now += 60) {
    if (open) {
      const L = open.side === "long";
      for (const x of b1.filter((x) => x.t > open.t && x.t + 60 <= now && x.t >= open.checked)) {
        open.checked = x.t + 1;
        const hitStop = L ? x.l <= open.stop : x.h >= open.stop, hitTp = L ? x.h >= open.tp1 : x.l <= open.tp1;
        let st = "", ex = 0;
        if (hitStop) { st = "stop"; ex = open.stop; } else if (hitTp) { st = "objetivo"; ex = open.tp1; } else if (x.t + 60 - open.t >= 15 * 60) { st = "tiempo"; ex = x.c; }
        if (st) {
          const r = (L ? ex - open.entry : open.entry - ex) / open.risk;
          const tr = { day, side: open.side, grade: open.grade, score: open.score, r, status: st, t: open.t, riskPct: open.risk / open.entry };
          trades.push(tr); dayTrades.push(tr); open = null; lastClosed = now; break;
        }
      }
    }
    if (open || now >= stopSec) continue;
    if (dayTrades.length >= 5) continue;
    const l2 = dayTrades.slice(-2);
    if (l2.length === 2 && l2.every((x) => x.r < 0)) continue;
    if (lastClosed && now - lastClosed < 300) continue;
    const r = read(b1, b5, d1, now);
    const s = trigger(b1, r, now);
    if (s) open = { ...s, checked: s.t + 60 };
  }
}

const sum = (a: Trade[]) => a.reduce((s, x) => s + x.r, 0);
const line = (name: string, a: Trade[]) => {
  if (!a.length) return `${name}: sin operaciones`;
  const w = a.filter((x) => x.r > 0.05).length;
  let peak = 0, eq = 0, dd = 0;
  for (const x of a) { eq += x.r; peak = Math.max(peak, eq); dd = Math.min(dd, eq - peak); }
  return `${name}: ${a.length} ops · acierto ${((w / a.length) * 100).toFixed(0)}% · ${(sum(a) / a.length).toFixed(2)}R/op · total ${sum(a).toFixed(1)}R · peor racha ${dd.toFixed(1)}R`;
};
console.log(`Sesiones simuladas: ${sessions} (últimos ${DAYS} días naturales)`);
console.log(line("TODAS", trades));
console.log(line("Calidad A", trades.filter((x) => x.grade === "A")));
console.log(line("Calidad B", trades.filter((x) => x.grade === "B")));
console.log(line("Compras", trades.filter((x) => x.side === "long")));
console.log(line("Ventas", trades.filter((x) => x.side === "short")));
const st = (k: string) => trades.filter((x) => x.status === k).length;
console.log(`Salidas: objetivo ${st("objetivo")} · stop ${st("stop")} · tiempo ${st("tiempo")}`);
for (const s of [6, 7, 8, 9]) console.log(line(`Puntaje ≥ ${s}`, trades.filter((x) => x.score >= s)));
const avgRisk = trades.reduce((s, x) => s + x.riskPct, 0) / Math.max(trades.length, 1);
console.log(`Riesgo promedio por operación: ${(avgRisk * 100).toFixed(3)}% del precio`);
for (const fee of [0.0002, 0.0005, 0.001]) {
  const costR = (2 * fee) / avgRisk;
  const a = trades.filter((x) => x.score >= 8);
  console.log(`Comisión ${(fee * 100).toFixed(2)}% por lado = ${costR.toFixed(2)}R por operación → calidad A neta: ${(a.reduce((s, x) => s + x.r, 0) / Math.max(a.length, 1) - costR).toFixed(2)}R/op · todas netas: ${(trades.reduce((s, x) => s + x.r, 0) / Math.max(trades.length, 1) - costR).toFixed(2)}R/op`);
}

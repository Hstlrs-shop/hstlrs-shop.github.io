// Laboratorio de ventaja: hipótesis con lógica de mercado sobre 2 años de BTC/USD (Bitstamp).
// Uso: node --experimental-strip-types scripts/lab-edge.ts <carpeta con h1.json y m15.json>
// CALIBRACIÓN = primeros 16 meses · PRUEBA = últimos 8 meses (no se usan para elegir nada).
// Resultados en R (riesgo inicial = distancia al stop), netos de comisión de entrada + salida.
import { readFileSync } from "node:fs";
import { emaSeries, atr, rsi, type Bar } from "../src/scalp-core.ts";

const dir = process.argv[2];
const h1: Bar[] = JSON.parse(readFileSync(`${dir}/h1.json`, "utf8"));
const m15: Bar[] = JSON.parse(readFileSync(`${dir}/m15.json`, "utf8"));
const T0 = h1[0].t, SPLIT = T0 + Math.round((h1[h1.length - 1].t - T0) * (16 / 24));
const agg = (b: Bar[], n: number): Bar[] => {
  const out: Bar[] = [];
  for (let i = 0; i + n <= b.length; i += n) { const s = b.slice(i, i + n); out.push({ t: s[0].t, o: s[0].o, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), c: s[n - 1].c, v: s.reduce((a, x) => a + x.v, 0) }); }
  return out;
};
const h4 = agg(h1.slice(h1.findIndex((x) => x.t % 14400 === 0)), 4);

type Tr = { t: number; entry: number; risk: number; gross: number; j: number }; // gross en R; j = índice de salida
const show = (name: string, tr: Tr[]) => {
  const f = (a: Tr[], fee: number) => {
    if (a.length < 5) return `${a.length} ops`.padEnd(28);
    const r = a.map((x) => x.gross - (2 * fee * x.entry) / x.risk);
    const w = r.filter((x) => x > 0).length, s = r.reduce((p, x) => p + x, 0);
    return `${String(a.length).padStart(4)} ${String(Math.round((w / a.length) * 100)).padStart(3)}% ${(s / a.length >= 0 ? "+" : "") + (s / a.length).toFixed(2)}R`.padEnd(28);
  };
  const c = tr.filter((x) => x.t < SPLIT), p = tr.filter((x) => x.t >= SPLIT);
  console.log(`${name.padEnd(40)}│ CALIB taker ${f(c, 0.0005)} maker ${f(c, 0.0002)}│ PRUEBA taker ${f(p, 0.0005)} maker ${f(p, 0.0002)}`);
};

// Ejecuta una posición con stop inicial y salida por función; devuelve R bruto
function runTrade(b: Bar[], i: number, side: 1 | -1, entry: number, stop: number, exit: (j: number, st: { stop: number }) => number | null, maxBars = 500): Tr | null {
  const risk = Math.abs(entry - stop);
  if (!risk) return null;
  const st = { stop };
  for (let j = i + 1; j < Math.min(b.length, i + maxBars); j++) {
    const x = b[j];
    if (side > 0 ? x.l <= st.stop : x.h >= st.stop) return { t: b[i].t, entry, risk, gross: (side * (st.stop - entry)) / risk, j };
    const e = exit(j, st);
    if (e !== null) return { t: b[i].t, entry, risk, gross: (side * (e - entry)) / risk, j };
  }
  return null;
}

// ---------- H1: estacionalidad por hora (UTC) ----------
{
  const byHour = (a: Bar[]) => { const m = Array.from({ length: 24 }, () => [0, 0]); for (const x of a) { const h = new Date(x.t * 1000).getUTCHours(); m[h][0] += Math.log(x.c / x.o); m[h][1]++; } return m.map(([s, n]) => (s / n) * 1e4); };
  const a = byHour(h1.filter((x) => x.t < SPLIT)), b = byHour(h1.filter((x) => x.t >= SPLIT));
  const top = a.map((v, h) => ({ v, h })).sort((x, y) => y.v - x.v);
  const corr = (() => { const ma = a.reduce((s, x) => s + x, 0) / 24, mb = b.reduce((s, x) => s + x, 0) / 24; let n = 0, da = 0, db = 0; for (let i = 0; i < 24; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db); })();
  console.log(`H1 estacionalidad horaria · correlación calibración→prueba de la rentabilidad media por hora: ${corr.toFixed(2)} (cerca de 0 = no se repite)`);
  console.log(`   mejores 3 horas en calibración (UTC): ${top.slice(0, 3).map((x) => `${x.h}h ${x.v.toFixed(1)}pb`).join(", ")} → en prueba: ${top.slice(0, 3).map((x) => `${b[x.h].toFixed(1)}pb`).join(", ")}`);
  console.log(`   peores 3 horas en calibración (UTC): ${top.slice(-3).map((x) => `${x.h}h ${x.v.toFixed(1)}pb`).join(", ")} → en prueba: ${top.slice(-3).map((x) => `${b[x.h].toFixed(1)}pb`).join(", ")}\n`);
}

// ---------- H2: seguimiento de tendencia (ruptura Donchian en 4h) con stop ATR y salida por canal opuesto ----------
function donchian(b: Bar[], n: number, exitN: number, atrMult: number, longOnly = false, trendFilter = true): Tr[] {
  const c = b.map((x) => x.c), e200 = emaSeries(c, 200), tr: Tr[] = [];
  for (let i = 210; i < b.length - 1; i++) {
    const w = b.slice(i - n, i), hi = Math.max(...w.map((x) => x.h)), lo = Math.min(...w.map((x) => x.l));
    const a = atr(b.slice(i - 30, i + 1));
    const side: 1 | -1 | 0 = b[i].c > hi && (!trendFilter || b[i].c > e200[i]) ? 1 : !longOnly && b[i].c < lo && (!trendFilter || b[i].c < e200[i]) ? -1 : 0;
    if (!side) continue;
    const entry = b[i].c, stop = entry - side * atrMult * a;
    const t = runTrade(b, i, side, entry, stop, (j, st) => {
      const w2 = b.slice(j - exitN, j);
      const ex = side > 0 ? Math.min(...w2.map((x) => x.l)) : Math.max(...w2.map((x) => x.h));
      if (side > 0 ? b[j].c < ex : b[j].c > ex) return b[j].c;
      const trail = b[j].c - side * atrMult * atr(b.slice(j - 30, j + 1)); // stop de seguimiento
      if (side > 0 ? trail > st.stop : trail < st.stop) st.stop = trail;
      return null;
    });
    if (t) { tr.push(t); i = t.j; }                                       // no se abre otra hasta salir
  }
  return tr;
}

// ---------- H3: compresión de volatilidad → ruptura (Bollinger en 1h) ----------
function squeeze(b: Bar[], pct = 0.2, tpR = 2): Tr[] {
  const c = b.map((x) => x.c), tr: Tr[] = [], bw: number[] = [];
  const e200 = emaSeries(c, 200);
  for (let i = 20; i < b.length; i++) { const w = c.slice(i - 20, i), m = w.reduce((s, x) => s + x, 0) / 20, sd = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / 20); bw[i] = (4 * sd) / m; }
  for (let i = 220; i < b.length - 1; i++) {
    const hist = bw.slice(i - 200, i).filter((x) => x !== undefined).sort((x, y) => x - y);
    if (bw[i - 1] > hist[Math.floor(hist.length * pct)]) continue;            // venía comprimido
    const w = c.slice(i - 20, i), m = w.reduce((s, x) => s + x, 0) / 20, sd = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / 20);
    const side: 1 | -1 | 0 = b[i].c > m + 2 * sd && b[i].c > e200[i] ? 1 : b[i].c < m - 2 * sd && b[i].c < e200[i] ? -1 : 0;
    if (!side) continue;
    const entry = b[i].c, stop = m, risk = Math.abs(entry - stop), tp = entry + side * tpR * risk;
    const t = runTrade(b, i, side, entry, stop, (j) => (side > 0 ? b[j].h >= tp : b[j].l <= tp) ? tp : null, 72);
    if (t) { tr.push(t); i = t.j; }
  }
  return tr;
}

// ---------- H4: reversión a la media con tendencia (RSI 2 en 15 min a favor de la EMA 200 de 4h) ----------
function rsi2(b: Bar[], trendB: Bar[], low = 10, high = 90): Tr[] {
  const tc = trendB.map((x) => x.c), te = emaSeries(tc, 50), tr: Tr[] = [];
  const c = b.map((x) => x.c), e5 = emaSeries(c, 5);
  let k = 0;
  for (let i = 300; i < b.length - 1; i++) {
    while (k + 1 < trendB.length && trendB[k + 1].t + 14400 <= b[i].t) k++;
    const up = trendB[k].c > te[k], r = rsi(c.slice(i - 30, i + 1), 2), a = atr(b.slice(i - 30, i + 1));
    const side: 1 | -1 | 0 = up && r < low ? 1 : !up && r > high ? -1 : 0;
    if (!side) continue;
    const entry = b[i].c, stop = entry - side * 2 * a;
    const t = runTrade(b, i, side, entry, stop, (j) => (side > 0 ? b[j].c > e5[j] : b[j].c < e5[j]) ? b[j].c : null, 24);
    if (t) { tr.push(t); i = t.j; }
  }
  return tr;
}

console.log(`Datos: ${new Date(h1[0].t * 1000).toISOString().slice(0, 10)} → ${new Date(h1[h1.length - 1].t * 1000).toISOString().slice(0, 10)} · corte calibración/prueba: ${new Date(SPLIT * 1000).toISOString().slice(0, 10)}\n`);
show("H2 Donchian 4h 20/10, ATR×2, filtro 200", donchian(h4, 20, 10, 2));
show("H2 Donchian 4h 55/20, ATR×3, filtro 200", donchian(h4, 55, 20, 3));
show("H2 Donchian 4h 20/10 solo compras", donchian(h4, 20, 10, 2, true));
show("H2 Donchian 1h 48/24, ATR×3, filtro 200", donchian(h1, 48, 24, 3));
show("H2 Donchian 4h 20/10 SIN filtro", donchian(h4, 20, 10, 2, false, false));
show("H3 Compresión Bollinger 1h → 2R", squeeze(h1));
show("H3 Compresión Bollinger 1h → 3R", squeeze(h1, 0.2, 3));
show("H3 Compresión Bollinger 4h → 2R", squeeze(h4));
show("H4 RSI2 15m a favor de 4h (10/90)", rsi2(m15, h4));
show("H4 RSI2 15m a favor de 4h (5/95)", rsi2(m15, h4, 5, 95));

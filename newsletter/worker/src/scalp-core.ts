// Lógica pura del motor de scalping (sin red ni base de datos): indicadores, lectura y gatillo.
// La usan el Worker (src/scalp.ts), las pruebas y el backtest (scripts/backtest-scalp.ts).

export interface Bar { t: number; o: number; h: number; l: number; c: number; v: number } // t en segundos (apertura)

export const SESSION = { from: 8 * 60 + 30, to: 10 * 60 + 30 }; // minutos del día, hora CDMX
export const MIN_R = 1.5, MIN_SCORE = 6;
/** Ajustables (el backtest los cambia para comparar variantes). minRiskPct: stop mínimo como fracción del precio. */
export const CONFIG = { minRiskPct: 0.0005, maxRiskPct: 0.005, htf: false, tf: 60 as 60 | 300, minScore: MIN_SCORE, minR: MIN_R };

// ---------- Indicadores ----------
export function emaSeries(v: number[], n: number): number[] {
  const k = 2 / (n + 1), out: number[] = [];
  v.forEach((x, i) => out.push(i ? x * k + out[i - 1] * (1 - k) : x));
  return out;
}
export function rsi(closes: number[], n = 14): number {
  if (closes.length <= n) return 50;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; d > 0 ? (g += d) : (l -= d); }
  g /= n; l /= n;
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
export function atr(b: Bar[], n = 14): number {
  if (b.length < 2) return 0;
  const tr = b.slice(1).map((x, i) => Math.max(x.h - x.l, Math.abs(x.h - b[i].c), Math.abs(x.l - b[i].c)));
  let a = tr.slice(0, n).reduce((s, x) => s + x, 0) / Math.min(n, tr.length);
  for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n;
  return a;
}
export function macdHist(closes: number[]): number[] {
  const f = emaSeries(closes, 12), s = emaSeries(closes, 26);
  const m = f.map((x, i) => x - s[i]);
  const sig = emaSeries(m, 9);
  return m.map((x, i) => x - sig[i]);
}
/** VWAP de sesión (reinicia 00:00 UTC, como TradingView en cripto) con bandas de ±1/2/3 desviaciones. */
export function vwapBands(b: Bar[]): { vwap: number; sd: number } {
  let pv = 0, vol = 0, p2v = 0;
  for (const x of b) { const tp = (x.h + x.l + x.c) / 3; pv += tp * x.v; p2v += tp * tp * x.v; vol += x.v; }
  if (!vol) return { vwap: b[b.length - 1]?.c ?? 0, sd: 0 };
  const vwap = pv / vol;
  return { vwap, sd: Math.sqrt(Math.max(p2v / vol - vwap * vwap, 0)) };
}
/** Retrocesos y extensiones de Fibonacci del último impulso en la dirección del sesgo. */
export function fibo(b5: Bar[], side: "long" | "short", look = 36) {
  const w = b5.slice(-look);
  let hi = 0, lo = 0;
  w.forEach((x, i) => { if (x.h > w[hi].h) hi = i; if (x.l < w[lo].l) lo = i; });
  const H = w[hi].h, L = w[lo].l, rng = H - L;
  const valid = side === "long" ? lo < hi : hi < lo; // el impulso va en la dirección del sesgo
  const at = (f: number) => (side === "long" ? H - rng * f : L + rng * f);
  const ext = (f: number) => (side === "long" ? L + rng * f : H - rng * f);
  return { valid: valid && rng > 0, high: H, low: L, r382: at(0.382), r500: at(0.5), r618: at(0.618), e1272: ext(1.272), e1618: ext(1.618) };
}

// ---------- Lectura del mercado ----------
export interface Reading {
  price: number; t: number; side: "long" | "short" | null; regime: string;
  vwap: number; sd: number; e9: number; e21: number; e55: number; e200_5: number; e9_5: number; e21_5: number; e55_5: number; htfSide: "long" | "short" | null;
  rsi1: number; rsi5: number; atr1: number; atr5: number; relVol: number; macdUp: boolean; macdDown: boolean;
  fib: ReturnType<typeof fibo> | null; levels: { name: string; px: number }[];
  pdh: number; pdl: number; pdc: number; onh: number; onl: number;
}

export function read(b1all: Bar[], b5all: Bar[], d1: Bar[], nowSec: number, h1all: Bar[] = []): Reading {
  const b1 = b1all.filter((x) => x.t + 60 <= nowSec);   // solo velas cerradas
  const b5 = b5all.filter((x) => x.t + 300 <= nowSec);
  const day0 = Math.floor(nowSec / 86400) * 86400;       // 00:00 UTC
  const ses1 = b1.filter((x) => x.t >= day0);
  const { vwap, sd } = vwapBands(ses1.length ? ses1 : b1.slice(-60));
  const c1 = b1.map((x) => x.c), c5 = b5.map((x) => x.c);
  const last = b1[b1.length - 1], last5 = b5[b5.length - 1];
  const E = (v: number[], n: number) => emaSeries(v, n)[v.length - 1];
  const e9 = E(c1, 9), e21 = E(c1, 21), e55 = E(c1, 55), e9_5 = E(c5, 9), e21_5 = E(c5, 21), e55_5 = E(c5, 55), e200_5 = E(c5, 200);
  // Tendencia de 1 hora: precio vs EMA 50 y EMA 50 vs EMA 200
  const h1c = h1all.filter((x) => x.t + 3600 <= nowSec).map((x) => x.c);
  const h50 = h1c.length > 60 ? E(h1c, 50) : 0, h200 = h1c.length > 60 ? E(h1c, 200) : 0;
  const htfSide: Reading["htfSide"] = !h50 ? null : b1all[b1all.length - 1].c > h50 && h50 > h200 ? "long" : b1all[b1all.length - 1].c < h50 && h50 < h200 ? "short" : null;
  const hist = macdHist(c1);
  const h0 = hist[hist.length - 1], h1 = hist[hist.length - 2];
  const vols = b1.slice(-21, -1).map((x) => x.v);
  const relVol = last.v / Math.max(vols.reduce((s, x) => s + x, 0) / Math.max(vols.length, 1), 1e-9);

  // Niveles: día anterior (velas diarias UTC), rango nocturno (00:00 UTC → apertura de sesión), redondos
  const prev = d1.filter((x) => x.t < day0).pop();
  const pdh = prev?.h ?? 0, pdl = prev?.l ?? 0, pdc = prev?.c ?? 0;
  const openSec = day0 + 14 * 3600 + 30 * 60;           // 8:30 CDMX = 14:30 UTC
  const night = ses1.filter((x) => x.t < openSec);
  const onh = night.length ? Math.max(...night.map((x) => x.h)) : 0;
  const onl = night.length ? Math.min(...night.map((x) => x.l)) : 0;

  // Régimen en 5 min: tendencia, rango (muchos cruces del VWAP) o mercado lento (ATR muy bajo)
  const recent5 = b5.slice(-12);
  let crosses = 0;
  for (let i = 1; i < recent5.length; i++) if ((recent5[i - 1].c - vwap) * (recent5[i].c - vwap) < 0) crosses++;
  const atr5 = atr(b5.slice(-60)), atr1 = atr(b1.slice(-60));
  let side: Reading["side"] = null, regime = "neutral";
  if (last5.c > vwap && e9_5 > e21_5) side = "long";
  else if (last5.c < vwap && e9_5 < e21_5) side = "short";
  if (crosses >= 3) { side = null; regime = "rango (el precio cruza el VWAP de un lado a otro)"; }
  else if (CONFIG.htf && side && side !== htfSide) { side = null; regime = "5 min contra la tendencia de 1 hora"; }
  else if (atr5 / last.c < 0.0006) { side = null; regime = "mercado lento (volatilidad muy baja)"; }
  else regime = side === "long" ? "tendencia alcista en 5 min" : side === "short" ? "tendencia bajista en 5 min" : "sin dirección clara";

  const fib = side ? fibo(b5, side) : null;
  const round = (step: number) => [Math.floor(last.c / step) * step, Math.ceil(last.c / step) * step];
  const levels = [
    { name: "VWAP", px: vwap }, { name: "VWAP +1σ", px: vwap + sd }, { name: "VWAP −1σ", px: vwap - sd },
    { name: "VWAP +2σ", px: vwap + 2 * sd }, { name: "VWAP −2σ", px: vwap - 2 * sd },
    { name: "Máx. de ayer", px: pdh }, { name: "Mín. de ayer", px: pdl }, { name: "Cierre de ayer", px: pdc },
    { name: "Máx. nocturno", px: onh }, { name: "Mín. nocturno", px: onl },
    ...round(500).map((px) => ({ name: "Redondo", px })), ...round(1000).map((px) => ({ name: "Redondo", px })),
    ...(fib?.valid ? [{ name: "Fibo 127.2 %", px: fib.e1272 }, { name: "Fibo 161.8 %", px: fib.e1618 }, { name: "Máx. del impulso", px: fib.high }, { name: "Mín. del impulso", px: fib.low }] : []),
  ].filter((x) => x.px > 0);

  return {
    price: last.c, t: last.t, side, regime, vwap, sd, e9, e21, e55, e200_5, e9_5, e21_5, e55_5, htfSide,
    rsi1: rsi(c1.slice(-200)), rsi5: rsi(c5.slice(-200)), atr1, atr5, relVol,
    macdUp: h0 > h1, macdDown: h0 < h1,
    fib, levels, pdh, pdl, pdc, onh, onl,
  };
}

export interface Signal {
  side: "long" | "short"; entry: number; stop: number; tp1: number; tp2: number; tp1Name: string; tp2Name: string;
  risk: number; r1: number; r2: number; score: number; grade: string; reasons: string[]; zone: string; t: number;
}

/** Busca un gatillo en la última vela de 1 min cerrada. Devuelve null si no hay señal limpia. */
export function trigger(b1all: Bar[], r: Reading, nowSec: number, tf: 60 | 300 = CONFIG.tf): Signal | null {
  if (!r.side) return null;
  const b1 = b1all.filter((x) => x.t + tf <= nowSec);             // b1all = velas del marco de entrada (1 o 5 min)
  const k = b1[b1.length - 1], long = r.side === "long";
  if (!k || k.t + 2 * tf <= nowSec) return null;                    // solo la vela que acaba de cerrar
  const A = tf === 300 ? r.atr5 : r.atr1;
  const tol = Math.max(A * 0.25, k.c * 0.0002);
  // Zonas de retroceso que tocó la vela
  const zones: { name: string; px: number }[] = [
    ...(tf === 300 ? [{ name: "EMA 9 (5m)", px: r.e9_5 }, { name: "EMA 21 (5m)", px: r.e21_5 }, { name: "EMA 55 (5m)", px: r.e55_5 }] : [{ name: "EMA 9", px: r.e9 }, { name: "EMA 21", px: r.e21 }, { name: "EMA 55", px: r.e55 }]), { name: "VWAP", px: r.vwap },
    ...(r.fib?.valid ? [{ name: "Fibo 38.2 %", px: r.fib.r382 }, { name: "Fibo 50 %", px: r.fib.r500 }, { name: "Fibo 61.8 %", px: r.fib.r618 }] : []),
  ];
  const touched = zones.filter((z) => (long ? k.l <= z.px + tol && k.c >= z.px - tol : k.h >= z.px - tol && k.c <= z.px + tol));
  if (!touched.length) return null;
  const body = Math.abs(k.c - k.o), range = Math.max(k.h - k.l, 1e-9);
  const closesInFavor = long ? k.c > k.o : k.c < k.o;
  if (!closesInFavor) return null;                                  // gatillo: vela que cierra a favor
  if (long ? k.c < r.vwap - tol : k.c > r.vwap + tol) return null;  // no comprar debajo del VWAP ni vender arriba

  const buf = Math.max(A * 0.2, k.c * 0.0001);
  const zoneExtreme = long ? Math.min(...touched.map((z) => z.px)) : Math.max(...touched.map((z) => z.px));
  const stop = long ? Math.min(k.l, zoneExtreme) - buf : Math.max(k.h, zoneExtreme) + buf;
  const entry = k.c;
  let stopPx = stop;
  // Stop mínimo: si la vela deja un stop demasiado pegado, se aleja hasta minRiskPct (las comisiones pesan menos en R)
  if (Math.abs(entry - stopPx) / entry < CONFIG.minRiskPct) stopPx = long ? entry * (1 - CONFIG.minRiskPct) : entry * (1 + CONFIG.minRiskPct);
  const riskAdj = Math.abs(entry - stopPx);
  if (riskAdj / entry > CONFIG.maxRiskPct) return null;            // stop demasiado lejos
  const risk = riskAdj;

  // Objetivo = siguiente nivel con al menos 1.5R; si no hay espacio, no hay operación
  const ahead = r.levels
    .filter((x) => (long ? x.px > entry : x.px < entry))
    .sort((a, b) => (long ? a.px - b.px : b.px - a.px));
  const ok = ahead.filter((x) => Math.abs(x.px - entry) >= CONFIG.minR * risk);
  const blocker = ahead.find((x) => Math.abs(x.px - entry) < CONFIG.minR * risk && !/Redondo/.test(x.name) && Math.abs(x.px - entry) > risk * 0.5);
  if (!ok.length) return null;
  const t1 = ok[0], t2 = ok.find((x) => Math.abs(x.px - entry) >= Math.abs(t1.px - entry) * 1.3) ?? { name: "2.5R", px: long ? entry + 2.5 * risk : entry - 2.5 * risk };
  const r1 = Math.abs(t1.px - entry) / risk, r2 = Math.abs(t2.px - entry) / risk;

  // Puntaje de confluencia (0–10)
  const reasons: string[] = [];
  let score = 0;
  score += 2; reasons.push(`5 min a favor: precio ${long ? "arriba" : "abajo"} del VWAP y EMA 9 ${long ? ">" : "<"} EMA 21`);
  if (long ? r.price > r.e200_5 : r.price < r.e200_5) { score += 1; reasons.push(`del lado correcto de la EMA 200 de 5 min`); }
  const fibTouch = touched.some((z) => z.name.startsWith("Fibo")), maTouch = touched.some((z) => !z.name.startsWith("Fibo"));
  if (touched.length >= 2) { score += 1; reasons.push(`retroceso a zona doble: ${touched.map((z) => z.name).join(" + ")}`); }
  else reasons.push(`retroceso a ${touched[0].name}`);
  if (fibTouch && maTouch) { score += 1; reasons.push("Fibonacci coincide con media/VWAP"); }
  if (body / range >= 0.5) { score += 1; reasons.push("vela de gatillo con cuerpo fuerte"); }
  if (r.relVol >= 1.2) { score += 1; reasons.push(`volumen ${r.relVol.toFixed(1)}× el promedio`); }
  if (long ? r.rsi1 >= 40 && r.rsi1 <= 68 : r.rsi1 <= 60 && r.rsi1 >= 32) { score += 1; reasons.push(`RSI 1m sano (${r.rsi1.toFixed(0)})`); }
  if (long ? r.macdUp : r.macdDown) { score += 1; reasons.push(`histograma MACD girando a favor`); }
  if (r1 >= 2) { score += 1; reasons.push(`espacio hasta el objetivo: ${r1.toFixed(1)}R`); }
  if (blocker) { score -= 1; reasons.push(`⚠️ ${blocker.name} en medio del camino (${Math.round(blocker.px)})`); }
  if (CONFIG.htf && r.htfSide === r.side) { score += 1; reasons.push("a favor de la tendencia de 1 hora"); }
  if (score < CONFIG.minScore) return null;
  return {
    side: r.side, entry, stop: stopPx, tp1: t1.px, tp2: t2.px, tp1Name: t1.name, tp2Name: t2.name, risk, r1, r2,
    score, grade: score >= 8 ? "A" : "B", reasons, zone: touched.map((z) => z.name).join(" + "), t: k.t,
  };
}


// ---------- Estrategia principal: ruptura del rango de apertura (ORB) a favor de la tendencia de 1 h ----------
// Validada en backtest (130 sesiones, calibración/prueba separadas, neto de comisión 0.05 % por lado).
// Rango = primeros ORB.minutes de la sesión (Wall Street abre a las 8:30 CDMX). Gatillo: vela de 5 min que cierra
// fuera del rango en la dirección de la tendencia de 1 h. Stop: mitad del rango. Objetivo 1: ORB.tpR × riesgo
// (se toma 50 % y el stop pasa a equilibrio); objetivo 2: (tpR + 1) × riesgo. Una operación por día.
export const ORB = { minutes: 15, windowMin: 60, tpR: 2, minRiskPct: 0.002, maxRiskPct: 0.006, timeStopMin: 90 };

export function orbSignal(b1: Bar[], b5: Bar[], r: Reading, nowSec: number, sessionOpenSec: number): Signal | null {
  const o = sessionOpenSec, om = ORB.minutes;
  if (nowSec < o + om * 60 || nowSec > o + (om + ORB.windowMin) * 60) return null;
  const rng = b1.filter((x) => x.t >= o && x.t < o + om * 60);
  if (rng.length < om * 0.66) return null;
  const H = Math.max(...rng.map((x) => x.h)), L = Math.min(...rng.map((x) => x.l));
  const k = b5.filter((x) => x.t + 300 <= nowSec).pop();
  if (!k || k.t + 600 <= nowSec || k.t < o + om * 60 - 300) return null;  // solo la vela de 5 min recién cerrada
  const side = k.c > H ? "long" : k.c < L ? "short" : null;
  if (!side || r.htfSide !== side) return null;
  const entry = k.c, stop = (H + L) / 2, risk = Math.abs(entry - stop);
  if (risk / entry < ORB.minRiskPct || risk / entry > ORB.maxRiskPct) return null;
  const d = side === "long" ? 1 : -1;
  const reasons = [
    `rango de apertura (8:30–${String(8 + Math.floor((30 + om) / 60)).padStart(1)}:${String((30 + om) % 60).padStart(2, "0")}): ${Math.round(L)} – ${Math.round(H)}`,
    `vela de 5 min cerró ${side === "long" ? "arriba" : "abajo"} del rango en ${Math.round(entry)}`,
    `tendencia de 1 hora a favor (precio ${side === "long" ? ">" : "<"} EMA 50 ${side === "long" ? ">" : "<"} EMA 200)`,
    `stop en la mitad del rango; objetivo ${ORB.tpR}R, se asegura 50 % y el resto busca ${ORB.tpR + 1}R`,
  ];
  if (r.relVol >= 1.2) reasons.push(`volumen ${r.relVol.toFixed(1)}× el promedio`);
  return { side, entry, stop, tp1: entry + d * ORB.tpR * risk, tp2: entry + d * (ORB.tpR + 1) * risk, tp1Name: `${ORB.tpR}R`, tp2Name: `${ORB.tpR + 1}R`,
    risk, r1: ORB.tpR, r2: ORB.tpR + 1, score: 0, grade: "ORB", reasons, zone: "rango de apertura", t: k.t };
}

/** Repite la gestión de la posición desde la entrada (sin estado): parcial 50 % en tp1 + stop a equilibrio, tp2, stop de tiempo.
 *  Devuelve el resultado bruto en R (las comisiones se descuentan en las estadísticas). */
export function manage(b1: Bar[], p: { side: string; entry: number; stop: number; tp1: number; tp2: number; risk: number; t0: number }, nowSec: number, fee: number, timeStopMin: number, partial = true) {
  const L = p.side === "long", fav = (x: number) => ((L ? x - p.entry : p.entry - x) / p.risk);
  let stop = p.stop, stage = 0, banked = 0, part = 1;
  for (const x of b1) {
    if (x.t < p.t0 || x.t + 60 > nowSec) continue;
    if (L ? x.l <= stop : x.h >= stop) return { closed: true, stage, status: stage ? "equilibrio" : "stop", exit: stop, r: part * fav(stop) + banked };
    const target = stage ? p.tp2 : p.tp1;
    if (L ? x.h >= target : x.l <= target) {
      if (stage) return { closed: true, stage, status: "objetivo 2", exit: target, r: part * fav(target) + banked };
      if (!partial) return { closed: true, stage: 1, status: "objetivo", exit: target, r: fav(target) };
      banked = 0.5 * fav(target); part = 0.5; stage = 1;
      stop = p.entry + (L ? 1 : -1) * p.entry * fee * 2;               // equilibrio que cubre comisiones
    }
    if (x.t + 60 - p.t0 >= timeStopMin * 60) return { closed: true, stage, status: "tiempo", exit: x.c, r: part * fav(x.c) + banked };
  }
  return { closed: false, stage, status: "abierta", exit: 0, r: 0 };
}

// ---------- Estrategia Fibonacci (zona dorada) a favor de la tendencia de 1 h ----------
// Impulso en 5 min (mínimo FIB.minImpulseAtr × ATR de 5 min) → retroceso a la zona 50–61.8 % → vela de 5 min que
// cierra de regreso a favor. Stop más allá del 78.6 %; objetivo FIB.tpR × riesgo. Cada impulso se opera una sola vez.
export const FIB = { lookback: 48, minImpulseAtr: 2, zoneLo: 0.382, zoneHi: 0.618, stopLevel: 0.786, tpR: 2, minRiskPct: 0.0015, maxRiskPct: 0.008, needHtf: true };

export function fibSignal(b5all: Bar[], r: Reading, nowSec: number, used: Set<string>): (Signal & { key: string }) | null {
  const b5 = b5all.filter((x) => x.t + 300 <= nowSec);
  const k = b5[b5.length - 1];
  if (!k || k.t + 600 <= nowSec) return null;
  const side = FIB.needHtf ? r.htfSide : r.side ?? r.htfSide;
  if (!side) return null;
  const w = b5.slice(-FIB.lookback - 1, -1);                     // impulso previo a la vela de gatillo
  if (w.length < 12) return null;
  let hi = 0, lo = 0;
  w.forEach((x, i) => { if (x.h > w[hi].h) hi = i; if (x.l < w[lo].l) lo = i; });
  const L = side === "long", H = w[hi].h, Lo = w[lo].l, rng = H - Lo;
  if (L ? lo >= hi : hi >= lo) return null;                       // el impulso debe ir en la dirección de la tendencia
  if (rng < FIB.minImpulseAtr * r.atr5) return null;
  const key = `${w[hi].t}-${w[lo].t}`;
  if (used.has(key)) return null;
  const lvl = (f: number) => (L ? H - rng * f : Lo + rng * f);
  const zA = lvl(FIB.zoneLo), zB = lvl(FIB.zoneHi), s786 = lvl(FIB.stopLevel);
  const since = b5.slice(b5.length - (L ? w.length - hi : w.length - lo));      // velas después del extremo del impulso
  const touched = since.some((x) => (L ? x.l <= zA : x.h >= zA));
  const broke = since.some((x) => (L ? x.l < s786 : x.h > s786));
  if (!touched || broke) return null;
  if (L ? !(k.c > k.o && k.c > zB) : !(k.c < k.o && k.c < zB)) return null; // vela de confirmación a favor
  const buf = Math.max(r.atr5 * 0.1, k.c * 0.0002);
  const entry = k.c, stop = L ? s786 - buf : s786 + buf, risk = Math.abs(entry - stop);
  if (risk / entry < FIB.minRiskPct || risk / entry > FIB.maxRiskPct) return null;
  const d = L ? 1 : -1;
  return {
    key, side, entry, stop, risk, tp1: entry + d * FIB.tpR * risk, tp2: entry + d * (FIB.tpR + 1) * risk, tp1Name: `${FIB.tpR}R`, tp2Name: `${FIB.tpR + 1}R`,
    r1: FIB.tpR, r2: FIB.tpR + 1, score: 0, grade: "FIB", zone: "Fibo 38.2–61.8 %", t: k.t,
    reasons: [`impulso ${L ? "alcista" : "bajista"} ${Math.round(Lo)} → ${Math.round(H)} (${(rng / r.atr5).toFixed(1)}× ATR 5m)`, `retroceso a la zona 38.2–61.8 % (${Math.round(Math.min(zA, zB))}–${Math.round(Math.max(zA, zB))})`, `vela de 5 min de confirmación`, `stop más allá del 78.6 % (${Math.round(s786)})`, `tendencia de 1 hora a favor`],
  };
}

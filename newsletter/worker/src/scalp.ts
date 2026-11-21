// Motor de señales de SCALPING / intradía para BTC/USD (Bitstamp), solo para el administrador.
//
// Estrategia principal (v2, validada en backtest de 130 sesiones con calibración y prueba separadas, neta de
// comisiones): RUPTURA DEL RANGO DE APERTURA (ORB). Wall Street abre a las 8:30 CDMX; el rango son los primeros
// 15 min. Si una vela de 5 min cierra fuera del rango EN LA DIRECCIÓN DE LA TENDENCIA DE 1 HORA, hay señal.
// Stop en la mitad del rango; en 2R se asegura 50 % y el stop pasa a equilibrio; el resto busca 3R. Una al día.
// La señal de retroceso de 1 min (v1) perdía después de comisiones: queda apagada (SCALP_PULLBACK=1 la activa).
// Cada señal se registra en D1 con su resultado real (R bruto; las estadísticas descuentan la comisión).

import { num, type Env } from "./env";
import { esc, tgCall } from "./telegram";
import { read, trigger, orbSignal, manage, ORB, SESSION, type Bar, type Reading, type Signal } from "./scalp-core";
export { SESSION };

const CDMX = 6 * 3600;
const MAX_SIGNALS = 3, PULLBACK_TIME_STOP = 15;
const END_MIN = 11 * 60 + 25; // el motor sigue vigilando posiciones hasta las 11:25 CDMX

// ---------- Datos (Bitstamp, públicos) ----------
async function ohlc(step: number, limit: number): Promise<Bar[]> {
  const r = await fetch(`https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=${step}&limit=${limit}`, { headers: { "user-agent": "lanaconcafe-scalp" } });
  if (!r.ok) throw new Error(`Bitstamp ${r.status}`);
  const j = (await r.json()) as { data: { ohlc: Record<string, string>[] } };
  return j.data.ohlc.map((x) => ({ t: +x.timestamp, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume }));
}

// ---------- Sesión, bitácora y mensajes ----------
const cdmxMin = (sec: number) => { const d = new Date((sec - CDMX) * 1000); return { day: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes(), dow: d.getUTCDay() }; };
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const hhmm = (sec: number) => new Date((sec - CDMX) * 1000).toISOString().slice(11, 16);
const sessionOpen = (now: number) => Math.floor((now - CDMX) / 86400) * 86400 + CDMX + SESSION.from * 60;

async function fetchAll() {
  const [b1, b5, h1, d1] = await Promise.all([ohlc(60, 1000), ohlc(300, 300), ohlc(3600, 300), ohlc(86400, 3)]);
  return { b1, b5, h1, d1 };
}

async function nearEvent(env: Env, nowMs: number) {
  return env.DB.prepare("SELECT title, at FROM events WHERE at BETWEEN ?1 AND ?2 ORDER BY at LIMIT 1").bind(nowMs - 15 * 60_000, nowMs + 15 * 60_000).first<{ title: string; at: number }>();
}

function signalText(s: Signal, units: number, kind: string) {
  const L = s.side === "long", orb = kind === "orb";
  return `${L ? "🟢 <b>COMPRA</b>" : "🔴 <b>VENTA</b>"} · BTC/USD · ${orb ? "ruptura del rango de apertura" : "retroceso 1 min (experimental)"} (demo)\n\n` +
    `Entrada: <b>${usd(s.entry)}</b> (cierre de la vela de ${orb ? "5" : "1"} min de las ${hhmm(s.t)})\n` +
    `Stop: <b>${usd(s.stop)}</b> (${usd(s.risk)} de riesgo)\n` +
    `Objetivo 1: <b>${usd(s.tp1)}</b> (${s.r1.toFixed(1)}R) → cierra 50 % y mueve el stop a tu entrada\n` +
    `Objetivo 2: <b>${usd(s.tp2)}</b> (${s.r2.toFixed(1)}R) para el 50 % restante\n` +
    `Stop de tiempo: ${orb ? ORB.timeStopMin : PULLBACK_TIME_STOP} min · Tamaño demo: ${units} BTC → arriesgas ${"$" + (s.risk * units).toFixed(2)}\n\n` +
    `<b>Por qué:</b>\n${s.reasons.map((x) => "• " + esc(x)).join("\n")}\n\n` +
    (orb ? `Backtest (130 sesiones, jun–nov 2026, neto de 0.05 % de comisión por lado): ~50–64 % de operaciones ganadoras y +0.08 a +0.34R por operación. Muestra pequeña: aún no es prueba definitiva.\n` : `Experimental: en backtest perdía después de comisiones.\n`) +
    `Si el precio ya se alejó más de 0.3R de la entrada, no la persigas.\n` +
    `<a href="https://www.tradingview.com/chart/?symbol=BITSTAMP:BTCUSD">Abrir gráfica</a>\n\n<i>Práctica en demo. No es asesoría financiera.</i>`;
}

function mapText(r: Reading) {
  const lv = [...r.levels, { name: "Precio actual", px: r.price }]
    .filter((x, i, a) => Math.abs(x.px - r.price) / r.price < 0.03 && a.findIndex((y) => Math.abs(y.px - x.px) < 1) === i)
    .sort((a, b) => b.px - a.px)
    .map((x) => (x.name === "Precio actual" ? `➡️ <b>${usd(x.px)} · precio</b>` : `${usd(x.px)} · ${esc(x.name)}`));
  const fib = r.fib?.valid ? `\n<b>Fibonacci</b> del impulso ${usd(r.fib.low)} → ${usd(r.fib.high)}: 38.2 % ${usd(r.fib.r382)} · 50 % ${usd(r.fib.r500)} · 61.8 % ${usd(r.fib.r618)}` : "";
  const htf = r.htfSide === "long" ? "alcista (precio > EMA 50 > EMA 200)" : r.htfSide === "short" ? "bajista (precio < EMA 50 < EMA 200)" : "sin dirección clara";
  return `Precio: <b>${usd(r.price)}</b>\nTendencia de 1 hora: <b>${htf}</b>\n5 min: ${esc(r.regime)}\n` +
    `VWAP ${usd(r.vwap)} (±1σ ${usd(r.sd)}) · EMA 9/21/200 (5m): ${usd(r.e9_5)} / ${usd(r.e21_5)} / ${usd(r.e200_5)}\n` +
    `RSI 1m ${r.rsi1.toFixed(0)} · RSI 5m ${r.rsi5.toFixed(0)} · ATR 5m ${usd(r.atr5)} · Volumen ${r.relVol.toFixed(1)}×` +
    fib + `\n\n<b>Mapa de niveles</b>\n${lv.join("\n")}`;
}

/** Corre cada minuto de 8:15 a 11:25 (CDMX) en días hábiles. */
export async function scalpTick(env: Env, nowMs = Date.now()) {
  const admin = env.ADMIN_CHAT_ID;
  if (!admin || env.SCALP_ENABLED === "0") return;
  const now = Math.floor(nowMs / 1000), { day, min, dow } = cdmxMin(now);
  if (dow < 1 || dow > 5 || min < SESSION.from - 15 || min > END_MIN) return;
  const units = num(env.SCALP_UNITS, 0.01), fee = num(env.SCALP_FEE, 0.0005);
  const flag = async (k: string) => (await env.DB.prepare("INSERT OR IGNORE INTO flags (k, v) VALUES (?1, '1')").bind(`scalp:${day}:${k}`).run()).meta.changes > 0;
  const send = (text: string) => tgCall(env, "sendMessage", { chat_id: admin, text, parse_mode: "HTML", disable_web_page_preview: true });

  const { b1, b5, h1, d1 } = await fetchAll();
  const r = read(b1, b5, d1, now, h1);

  // 1) Seguimiento de la posición abierta: se repite la gestión desde la entrada (parcial + equilibrio, objetivo 2, tiempo)
  const open = await env.DB.prepare("SELECT * FROM scalp_signals WHERE status = 'open' ORDER BY t DESC LIMIT 1").first<any>();
  if (open) {
    const kind = open.kind ?? "pullback";
    const m = manage(b1, { side: open.side, entry: open.entry, stop: open.stop, tp1: open.tp1, tp2: open.tp2, risk: open.risk, t0: open.created_at }, now, fee, kind === "orb" ? ORB.timeStopMin : PULLBACK_TIME_STOP);
    if (m.stage === 1 && !open.stage) {
      await env.DB.prepare("UPDATE scalp_signals SET stage = 1 WHERE id = ?1").bind(open.id).run();
      if (!m.closed) await send(`🎯 <b>Objetivo 1 alcanzado</b> (${usd(open.tp1)}): cierra el 50 % y mueve el stop a tu entrada (${usd(open.entry)}). El resto busca ${usd(open.tp2)}.`);
    }
    if (m.closed) {
      await env.DB.prepare("UPDATE scalp_signals SET status = ?2, exit = ?3, r = ?4, closed_at = ?5, stage = ?6 WHERE id = ?1").bind(open.id, m.status, m.exit, m.r, now, m.stage).run();
      const net = m.r - (2 * fee * open.entry) / open.risk;
      const icon = net > 0.05 ? "✅" : net < -0.05 ? "❌" : "➖";
      await send(`${icon} <b>Cerrada la ${open.side === "long" ? "compra" : "venta"} de las ${hhmm(open.t)}</b>: ${esc(m.status)} en ${usd(m.exit)} → <b>${m.r >= 0 ? "+" : ""}${m.r.toFixed(2)}R</b> (${net >= 0 ? "+" : ""}${net.toFixed(2)}R neto de comisiones)`);
    }
  }

  // 2) Plan previo a la sesión (8:15–8:29)
  if (min < SESSION.from) {
    if (await flag("map")) {
      const ev = await env.DB.prepare("SELECT title, at FROM events WHERE at BETWEEN ?1 AND ?2 ORDER BY at").bind(nowMs, nowMs + 3 * 3600_000).all<any>();
      const evs = ev.results.length ? `\n\n⚠️ <b>Datos hoy</b> (sin señales 15 min antes y después):\n${ev.results.map((e: any) => `${hhmm(Math.floor(e.at / 1000))} · ${esc(e.title)}`).join("\n")}` : "";
      const plan = r.htfSide
        ? `Plan: el rango de apertura se forma de 8:30 a 8:45. Si una vela de 5 min cierra <b>${r.htfSide === "long" ? "ARRIBA" : "ABAJO"}</b> del rango entre 8:45 y 9:45, habrá señal de <b>${r.htfSide === "long" ? "compra" : "venta"}</b>. Rupturas al otro lado se ignoran (van contra la tendencia de 1 hora).`
        : `Plan: la tendencia de 1 hora no está definida → hoy <b>no habrá señal de ruptura</b>. Es parte del sistema: el backtest pierde cuando opera sin ese filtro.`;
      await send(`☕ <b>BTC · plan de la sesión</b>\n\n${mapText(r)}${evs}\n\n${plan}\n\n<i>Práctica en demo. No es asesoría financiera.</i>`);
    }
    return;
  }

  // 3) Resumen al terminar (cuando ya no hay posición abierta y pasó la ventana)
  if (min >= SESSION.to) {
    if (!open && (await flag("summary"))) await send(await summaryText(env, day));
    if (open || min < SESSION.to) return;
    return;
  }

  // 4) Buscar señal
  if (open) return;
  const today = await env.DB.prepare("SELECT kind, r FROM scalp_signals WHERE day = ?1 ORDER BY t").bind(day).all<any>();
  const rows = today.results as any[];
  if (rows.length >= MAX_SIGNALS) return;
  if (rows.length >= 2 && rows.slice(-2).every((x) => x.r < 0)) return;
  if (await nearEvent(env, nowMs)) return;
  let s: Signal | null = null, kind = "orb";
  if (!rows.some((x) => x.kind === "orb")) s = orbSignal(b1, b5, r, now, sessionOpen(now));
  if (!s && env.SCALP_PULLBACK === "1") { s = trigger(b1, r, now, 60); kind = "pullback"; }
  if (!s) return;
  const ins = await env.DB.prepare(
    `INSERT OR IGNORE INTO scalp_signals (t, day, side, entry, stop, tp1, tp2, risk, score, grade, reasons, status, created_at, kind, stage)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'open', ?12, ?13, 0)`,
  ).bind(s.t, day, s.side, s.entry, s.stop, s.tp1, s.tp2, s.risk, s.score, s.grade, JSON.stringify(s.reasons), now, kind).run();
  if (ins.meta.changes) await send(signalText(s, units, kind));
}

export async function stats(env: Env, days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const fee = num(env.SCALP_FEE, 0.0005); // comisión por lado (fracción); configúrala igual que en tu demo
  const r = await env.DB.prepare("SELECT r, entry, risk FROM scalp_signals WHERE status != 'open' AND t > ?1").bind(since).all<{ r: number; entry: number; risk: number }>();
  const all = r.results, n = all.length;
  const wins = all.filter((x) => x.r > 0.05).length, total = all.reduce((s, x) => s + x.r, 0);
  const net = all.reduce((s, x) => s + x.r - (2 * fee * x.entry) / x.risk, 0);
  return { n, wins, winRate: n ? wins / n : 0, totalR: total, avgR: n ? total / n : 0, avgNet: n ? net / n : 0, feePct: fee * 100 };
}

async function summaryText(env: Env, day: string) {
  const t = await env.DB.prepare("SELECT side, t, r, status FROM scalp_signals WHERE day = ?1 ORDER BY t").bind(day).all<any>();
  const s = await stats(env, 30);
  const list = t.results.map((x: any) => `${hhmm(x.t)} ${x.side === "long" ? "compra" : "venta"} → ${x.r >= 0 ? "+" : ""}${Number(x.r).toFixed(2)}R (${x.status})`).join("\n");
  const dayR = t.results.reduce((a: number, x: any) => a + Number(x.r), 0);
  return `📒 <b>Resumen de la sesión</b> (${day})\n\n${list || "Sin señales hoy: el mercado no dio un setup limpio. No operar también es parte del sistema."}` +
    (t.results.length ? `\nTotal del día: <b>${dayR >= 0 ? "+" : ""}${dayR.toFixed(2)}R</b>` : "") +
    `\n\n<b>Últimos 30 días</b>: ${s.n} señales · acierto ${(s.winRate * 100).toFixed(0)} % · ${s.avgR >= 0 ? "+" : ""}${s.avgR.toFixed(2)}R por señal (bruto) · ${s.avgNet >= 0 ? "+" : ""}${s.avgNet.toFixed(2)}R neto con comisión de ${s.feePct.toFixed(2)}% por lado\n\n` +
    `Recuerda anotar en tu bitácora si seguiste las reglas en cada operación.`;
}

/** Lectura bajo demanda (/scalp en el bot). */
export async function scalpNow(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const { b1, b5, h1, d1 } = await fetchAll();
  const r = read(b1, b5, d1, now, h1);
  const s = orbSignal(b1, b5, r, now, sessionOpen(now));
  const { min, dow } = cdmxMin(now);
  const inSession = dow >= 1 && dow <= 5 && min >= SESSION.from && min < SESSION.to;
  return `📈 <b>Scalping BTC · lectura ahora</b>${inSession ? "" : " (fuera de sesión: solo para estudiar)"}\n\n${mapText(r)}\n\n` +
    (s ? signalText(s, num(env.SCALP_UNITS, 0.01), "orb") : r.htfSide ? `Sin señal ahora. La estrategia solo opera rupturas del rango de 8:30–8:45 a favor de la tendencia de 1 hora (${r.htfSide === "long" ? "compras" : "ventas"}), entre 8:45 y 9:45.` : `Tendencia de 1 hora sin dirección: hoy no hay operación.`) +
    `\n<i>No es asesoría financiera.</i>`;
}

export async function statsText(env: Env) {
  const s = await stats(env, 30), a = await stats(env, 3650);
  return `📒 <b>Bitácora del sistema de scalping</b>\n\n<b>30 días</b>: ${s.n} señales · acierto ${(s.winRate * 100).toFixed(0)} % · ${s.avgR >= 0 ? "+" : ""}${s.avgR.toFixed(2)}R por señal bruto · ${s.avgNet >= 0 ? "+" : ""}${s.avgNet.toFixed(2)}R neto (comisión ${s.feePct.toFixed(2)}% por lado) · total bruto ${s.totalR >= 0 ? "+" : ""}${s.totalR.toFixed(1)}R\n\n` +
    `<b>Histórico</b>: ${a.n} señales · ${a.avgR >= 0 ? "+" : ""}${a.avgR.toFixed(2)}R por señal\n\n` +
    `Con menos de 50 señales los números todavía no son concluyentes.`;
}

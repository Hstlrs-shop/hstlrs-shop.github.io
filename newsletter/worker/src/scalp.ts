// Motor de señales de SCALPING para BTC/USD (Bitstamp), solo para el administrador.
//
// Setup (el del administrador, en demo): dirección en 5 min con VWAP y EMAs; entrada en 1 min cuando el
// precio retrocede a una zona (EMA 9/21/55, VWAP o Fibonacci 38.2–61.8 % del último impulso) y una vela
// cierra a favor. Stop detrás de la vela del retroceso, objetivo en el siguiente nivel con mínimo 1.5R,
// stop de tiempo de 15 min. Sesión lunes a viernes 8:30–10:30 (CDMX). Máximo 5 señales; 2 pérdidas
// seguidas cierran la sesión; nada 15 min antes/después de un dato fuerte; no se opera en rango.
//
// Cada señal lleva un puntaje de confluencia (0–10) y se registra en D1 con su resultado real (R),
// para medir el sistema con honestidad antes de ofrecerlo a nadie más.

import { num, type Env } from "./env";
import { esc, tgCall } from "./telegram";
import { read, trigger, SESSION, type Bar, type Reading, type Signal } from "./scalp-core";
export { SESSION };

const CDMX = 6 * 3600;
const MAX_SIGNALS = 5, TIME_STOP_MIN = 15;

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

async function fetchAll() {
  const [b1, b5, d1] = await Promise.all([ohlc(60, 1000), ohlc(300, 300), ohlc(86400, 3)]);
  return { b1, b5, d1 };
}

async function nearEvent(env: Env, nowMs: number) {
  return env.DB.prepare("SELECT title, at FROM events WHERE at BETWEEN ?1 AND ?2 ORDER BY at LIMIT 1").bind(nowMs - 15 * 60_000, nowMs + 15 * 60_000).first<{ title: string; at: number }>();
}

function signalText(s: Signal, units: number) {
  const L = s.side === "long";
  return `${L ? "🟢 <b>COMPRA</b>" : "🔴 <b>VENTA</b>"} · BTC/USD scalping (demo) · confluencia ${s.score}/10\n\n` +
    `Entrada: <b>${usd(s.entry)}</b> (cierre de la vela de 1 min de las ${hhmm(s.t)})\n` +
    `Stop: <b>${usd(s.stop)}</b> (${usd(s.risk)} de riesgo)\n` +
    `Objetivo 1: <b>${usd(s.tp1)}</b> · ${esc(s.tp1Name)} · ${s.r1.toFixed(1)}R\n` +
    `Objetivo 2: ${usd(s.tp2)} · ${esc(s.tp2Name)} · ${s.r2.toFixed(1)}R\n` +
    `Stop de tiempo: ${TIME_STOP_MIN} min · Tamaño demo: ${units} BTC → arriesgas ${"$" + (s.risk * units).toFixed(2)}\n\n` +
    `<b>Por qué:</b>\n${s.reasons.map((x) => "• " + esc(x)).join("\n")}\n\n` +
    `Antes de entrar (5 s): ¿la vela cerró a favor?, ¿unidades ${units}?, ¿R ≥ 1.5? Si el precio ya se fue más de 0.3R, no la persigas.\n` +
    `Backtest 2 periodos (sept–nov 2026): ~+0.2R por operación ANTES de comisiones; con comisiones realistas, negativo. Herramienta de práctica, no de ingresos.\n` +
    `<a href="https://www.tradingview.com/chart/?symbol=BITSTAMP:BTCUSD">Abrir gráfica</a>\n\n<i>Práctica en demo. No es asesoría financiera.</i>`;
}

function mapText(r: Reading) {
  const lv = [...r.levels, { name: "Precio actual", px: r.price }]
    .filter((x, i, a) => Math.abs(x.px - r.price) / r.price < 0.03 && a.findIndex((y) => Math.abs(y.px - x.px) < 1) === i)
    .sort((a, b) => b.px - a.px)
    .map((x) => (x.name === "Precio actual" ? `➡️ <b>${usd(x.px)} · precio</b>` : `${usd(x.px)} · ${esc(x.name)}`));
  const fib = r.fib?.valid ? `\n<b>Fibonacci</b> del impulso ${usd(r.fib.low)} → ${usd(r.fib.high)}: 38.2 % ${usd(r.fib.r382)} · 50 % ${usd(r.fib.r500)} · 61.8 % ${usd(r.fib.r618)}` : "";
  return `Precio: <b>${usd(r.price)}</b> · Régimen: <b>${esc(r.regime)}</b>\n` +
    `VWAP ${usd(r.vwap)} (±1σ ${usd(r.sd)}) · EMA 9/21/55 (1m): ${usd(r.e9)} / ${usd(r.e21)} / ${usd(r.e55)}\n` +
    `5 min: EMA 9 ${usd(r.e9_5)} · EMA 21 ${usd(r.e21_5)} · EMA 200 ${usd(r.e200_5)}\n` +
    `RSI 1m ${r.rsi1.toFixed(0)} · RSI 5m ${r.rsi5.toFixed(0)} · ATR 1m ${usd(r.atr1)} · ATR 5m ${usd(r.atr5)} · Volumen ${r.relVol.toFixed(1)}×` +
    fib + `\n\n<b>Mapa de niveles</b>\n${lv.join("\n")}`;
}

/** Corre cada minuto de 8:15 a 10:59 (CDMX) en días hábiles. */
export async function scalpTick(env: Env, nowMs = Date.now()) {
  const admin = env.ADMIN_CHAT_ID;
  if (!admin || env.SCALP_ENABLED === "0") return;
  const now = Math.floor(nowMs / 1000), { day, min, dow } = cdmxMin(now);
  if (dow < 1 || dow > 5 || min < SESSION.from - 15 || min > SESSION.to + 25) return;
  const units = num(env.SCALP_UNITS, 0.01);
  const flag = async (k: string) => (await env.DB.prepare("INSERT OR IGNORE INTO flags (k, v) VALUES (?1, '1')").bind(`scalp:${day}:${k}`).run()).meta.changes > 0;
  const send = (text: string) => tgCall(env, "sendMessage", { chat_id: admin, text, parse_mode: "HTML", disable_web_page_preview: true });

  const { b1, b5, d1 } = await fetchAll();
  const r = read(b1, b5, d1, now);

  // 1) Seguimiento de la señal abierta (stop, objetivo o tiempo)
  const open = await env.DB.prepare("SELECT * FROM scalp_signals WHERE status = 'open' ORDER BY t DESC LIMIT 1").first<any>();
  if (open) {
    const after = b1.filter((x) => x.t > open.t && x.t + 60 <= now);
    const L = open.side === "long";
    let status = "", exit = 0;
    for (const x of after) {
      const hitStop = L ? x.l <= open.stop : x.h >= open.stop, hitTp = L ? x.h >= open.tp1 : x.l <= open.tp1;
      if (hitStop) { status = "stop"; exit = open.stop; break; }      // si ambos en la misma vela, se asume el stop (conservador)
      if (hitTp) { status = "objetivo"; exit = open.tp1; break; }
      if (x.t + 60 - open.t >= TIME_STOP_MIN * 60) { status = "tiempo"; exit = x.c; break; }
    }
    if (status) {
      const rr = ((L ? exit - open.entry : open.entry - exit) / open.risk);
      await env.DB.prepare("UPDATE scalp_signals SET status = ?2, exit = ?3, r = ?4, closed_at = ?5 WHERE id = ?1").bind(open.id, status, exit, rr, now).run();
      const icon = rr > 0.05 ? "✅" : rr < -0.05 ? "❌" : "➖";
      await send(`${icon} <b>Resultado ${L ? "compra" : "venta"} de las ${hhmm(open.t)}</b>: ${status === "objetivo" ? "tocó el objetivo" : status === "stop" ? "tocó el stop" : `stop de tiempo (${TIME_STOP_MIN} min)`} en ${usd(exit)} → <b>${rr >= 0 ? "+" : ""}${rr.toFixed(2)}R</b>`);
    }
  }

  // 2) Mapa previo a la sesión (8:15–8:29)
  if (min < SESSION.from) {
    if (await flag("map")) {
      const ev = await env.DB.prepare("SELECT title, at FROM events WHERE at BETWEEN ?1 AND ?2 ORDER BY at").bind(nowMs, nowMs + 3 * 3600_000).all<any>();
      const evs = ev.results.length ? `\n\n⚠️ <b>Datos hoy</b> (sin señales 15 min antes y después):\n${ev.results.map((e: any) => `${hhmm(Math.floor(e.at / 1000))} · ${esc(e.title)}`).join("\n")}` : "";
      await send(`☕ <b>Scalping BTC · plan de la sesión 8:30–10:30</b>\n\n${mapText(r)}${evs}\n\n` +
        (r.side ? `Plan: solo <b>${r.side === "long" ? "compras" : "ventas"}</b> en retrocesos a EMA/VWAP/Fibonacci con vela que cierre a favor.` : `Plan: <b>esperar</b>. ${esc(r.regime)}: sin señales hasta que haya dirección.`) +
        `\n\nReglas: máximo ${MAX_SIGNALS} señales · 2 pérdidas seguidas = fin de sesión · stop de tiempo ${TIME_STOP_MIN} min.\n<i>Práctica en demo. No es asesoría financiera.</i>`);
    }
    return;
  }

  // 3) Resumen al cerrar la sesión
  if (min >= SESSION.to) {
    if (!open && (await flag("summary"))) await send(await summaryText(env, day));
    return;
  }

  // 4) Buscar señal (dentro de la sesión)
  if (open) return;                                                  // una a la vez
  const today = await env.DB.prepare("SELECT status, r FROM scalp_signals WHERE day = ?1 ORDER BY t").bind(day).all<any>();
  const rows = today.results;
  if (rows.length >= MAX_SIGNALS) return;
  const lastTwo = rows.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((x: any) => x.r < 0)) { if (await flag("stopday")) await send("🛑 <b>Fin de la sesión</b>: dos pérdidas seguidas. Mañana es otro día; revisa la bitácora con /bitacora."); return; }
  const lastClosed = await env.DB.prepare("SELECT closed_at FROM scalp_signals WHERE day = ?1 ORDER BY t DESC LIMIT 1").bind(day).first<{ closed_at: number }>();
  if (lastClosed && now - lastClosed.closed_at < 5 * 60) return;     // enfriamiento de 5 min
  const ev = await nearEvent(env, nowMs);
  if (ev) return;
  const s = trigger(b1, r, now);
  if (!s) return;
  const ins = await env.DB.prepare(
    `INSERT OR IGNORE INTO scalp_signals (t, day, side, entry, stop, tp1, tp2, risk, score, grade, reasons, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'open', ?12)`,
  ).bind(s.t, day, s.side, s.entry, s.stop, s.tp1, s.tp2, s.risk, s.score, s.grade, JSON.stringify(s.reasons), now).run();
  if (ins.meta.changes) await send(signalText(s, units));
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
  const { b1, b5, d1 } = await fetchAll();
  const r = read(b1, b5, d1, now);
  const s = trigger(b1, r, now);
  const { min, dow } = cdmxMin(now);
  const inSession = dow >= 1 && dow <= 5 && min >= SESSION.from && min < SESSION.to;
  return `📈 <b>Scalping BTC · lectura ahora</b>${inSession ? "" : " (fuera de sesión: solo para estudiar)"}\n\n${mapText(r)}\n\n` +
    (s ? signalText(s, num(env.SCALP_UNITS, 0.01)) : r.side ? `Sin gatillo en la última vela de 1 min. Espera un retroceso a EMA 9/21/55, VWAP o Fibonacci con vela que cierre a favor.` : `Sin dirección: no operar.`) +
    `\n<i>No es asesoría financiera.</i>`;
}

export async function statsText(env: Env) {
  const s = await stats(env, 30), a = await stats(env, 3650);
  return `📒 <b>Bitácora del sistema de scalping</b>\n\n<b>30 días</b>: ${s.n} señales · acierto ${(s.winRate * 100).toFixed(0)} % · ${s.avgR >= 0 ? "+" : ""}${s.avgR.toFixed(2)}R por señal bruto · ${s.avgNet >= 0 ? "+" : ""}${s.avgNet.toFixed(2)}R neto (comisión ${s.feePct.toFixed(2)}% por lado) · total bruto ${s.totalR >= 0 ? "+" : ""}${s.totalR.toFixed(1)}R\n\n` +
    `<b>Histórico</b>: ${a.n} señales · ${a.avgR >= 0 ? "+" : ""}${a.avgR.toFixed(2)}R por señal\n\n` +
    `Con menos de 50 señales los números todavía no son concluyentes.`;
}

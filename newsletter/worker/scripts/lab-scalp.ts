// Laboratorio: compara variantes del motor con velas reales en caché (scripts/scalp-data.ts).
// Uso: node --experimental-strip-types scripts/lab-scalp.ts <carpeta-caché> [diasPrueba=60] [comisión=0.0005]
// CALIBRACIÓN = sesiones anteriores a los últimos <diasPrueba> días; PRUEBA = los últimos <diasPrueba> días.
// Las variantes se eligen viendo SOLO calibración; la columna PRUEBA es la que cuenta.
// Resultados en R netos de comisión (entrada + salida). Si stop y objetivo caen en la misma vela, cuenta el stop.
import { readdirSync, readFileSync } from "node:fs";
import { read, trigger, CONFIG, SESSION, type Bar } from "../src/scalp-core.ts";

const dir = process.argv[2], TEST_DAYS = Number(process.argv[3] ?? 60), FEE = Number(process.argv[4] ?? 0.0005);
const CDMX = 6 * 3600;
const days = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { day0: number; b1: Bar[]; b5: Bar[]; h1: Bar[]; d1: Bar[] });
const cut = Math.floor(Date.now() / 1000 / 86400) * 86400 - TEST_DAYS * 86400;

type V = { name: string; tf: 60 | 300; htf: boolean; minRiskPct: number; mgmt: "fijo" | "equilibrio" | "parcial"; timeStop: number; minScore: number; strat?: "pullback" | "orb"; minR?: number; orMin?: number; tpR?: number };
type T = { r: number; test: boolean };

function simulate(v: V, d: (typeof days)[number]): number[] {
  Object.assign(CONFIG, { tf: v.tf, htf: v.htf, minRiskPct: v.minRiskPct, minScore: v.minScore, minR: v.minR ?? 1.5 });
  const start = d.day0 + CDMX + SESSION.from * 60, stop = d.day0 + CDMX + SESSION.to * 60;
  const out: number[] = [];
  let pos: any = null, lastClosed = 0;
  const entryBars = v.tf === 300 ? d.b5 : d.b1;
  for (let now = start; now <= stop + 90 * 60; now += 60) {
    if (pos) {
      const L = pos.side === "long";
      for (const x of d.b1.filter((x) => x.t >= pos.next && x.t + 60 <= now)) {
        pos.next = x.t + 60;
        const fav = (p: number) => (L ? p - pos.entry : pos.entry - p) / pos.risk;
        const hitStop = L ? x.l <= pos.stop : x.h >= pos.stop;
        if (hitStop) { pos.closed = pos.part * fav(pos.stop) + pos.banked; break; }
        const target = pos.stage === 0 ? pos.tp1 : pos.tp2;
        const hitT = L ? x.h >= target : x.l <= target;
        if (hitT) {
          if (v.mgmt === "fijo" || pos.stage === 1) { pos.closed = pos.part * fav(target) + pos.banked; break; }
          if (v.mgmt === "parcial") { pos.banked += 0.5 * fav(target); pos.part = 0.5; }
          pos.stage = 1; pos.stop = pos.entry + (L ? 1 : -1) * pos.entry * FEE * 2; // stop a equilibrio (cubre comisiones)
        } else if (v.mgmt === "equilibrio" && pos.stage === 0 && fav(L ? x.h : x.l) >= 1) {
          pos.stop = pos.entry + (L ? 1 : -1) * pos.entry * FEE * 2;
        }
        if (x.t + 60 - pos.t0 >= v.timeStop * 60) { pos.closed = pos.part * fav(x.c) + pos.banked; break; }
      }
      if (pos.closed !== undefined) {
        out.push(pos.closed - (2 * FEE * pos.entry) / pos.risk);
        pos = null; lastClosed = now;
      }
    }
    if (pos || now >= stop || out.length >= 5) continue;
    if (out.length >= 2 && out[out.length - 1] < 0 && out[out.length - 2] < 0) continue;
    if (lastClosed && now - lastClosed < 300) continue;
    if (v.tf === 300 && now % 300 !== 0) continue;
    if (v.strat === "orb" && out.length) continue;              // ORB: una operación por día
    const r = read(d.b1, d.b5, d.d1, now, d.h1);
    let s: any = null;
    if (v.strat === "orb") s = orb(d, r, now, v);
    else s = trigger(entryBars, r, now, v.tf);
    if (s) pos = { side: s.side, entry: s.entry, stop: s.stop, tp1: s.tp1, tp2: s.tp2, risk: s.risk, t0: now, next: now, stage: 0, part: 1, banked: 0 };
  }
  return out;
}

// Ruptura del rango de apertura de Wall Street (8:30–8:45 CDMX): cierre de 5 min fuera del rango a favor de la tendencia de 1 h.
function orb(d: (typeof days)[number], r: ReturnType<typeof read>, now: number, v: V) {
  const o = d.day0 + CDMX + SESSION.from * 60;
  const om = v.orMin ?? 15, R = v.tpR ?? 2;
  if (now < o + om * 60 || now % 300 !== 0 || now > o + (om + 60) * 60) return null;
  const rng = d.b1.filter((x) => x.t >= o && x.t < o + om * 60);
  if (rng.length < 10) return null;
  const H = Math.max(...rng.map((x) => x.h)), L = Math.min(...rng.map((x) => x.l));
  const k = d.b5.filter((x) => x.t + 300 <= now).pop()!;
  if (!k || k.t + 600 <= now) return null;
  const side = k.c > H ? "long" : k.c < L ? "short" : null;
  if (!side || (v.htf && r.htfSide !== side)) return null;
  const entry = k.c, stop = side === "long" ? Math.max(L, (H + L) / 2) : Math.min(H, (H + L) / 2);
  const risk = Math.abs(entry - stop);
  if (risk / entry < v.minRiskPct || risk / entry > 0.006) return null;
  return { side, entry, stop, risk, tp1: side === "long" ? entry + R * risk : entry - R * risk, tp2: side === "long" ? entry + (R + 1) * risk : entry - (R + 1) * risk };
}

function report(v: V) {
  const tr: T[] = [];
  for (const d of days) for (const r of simulate(v, d)) tr.push({ r, test: d.day0 >= cut });
  const f = (a: T[]) => {
    if (!a.length) return "sin ops".padEnd(34);
    const w = a.filter((x) => x.r > 0).length, s = a.reduce((p, x) => p + x.r, 0);
    return `${String(a.length).padStart(3)} ops ${String(Math.round((w / a.length) * 100)).padStart(3)}% ${((s / a.length) >= 0 ? "+" : "") + (s / a.length).toFixed(2)}R/op ${(s >= 0 ? "+" : "") + s.toFixed(1)}R`.padEnd(34);
  };
  console.log(`${v.name.padEnd(46)} | CALIB ${f(tr.filter((x) => !x.test))} | PRUEBA ${f(tr.filter((x) => x.test))}`);
}

console.log(`Sesiones: ${days.length} (calibración ${days.filter((d) => d.day0 < cut).length}, prueba ${days.filter((d) => d.day0 >= cut).length}) · comisión ${(FEE * 100).toFixed(2)}% por lado · R netos\n`);
const base: V = { name: "", tf: 60, htf: false, minRiskPct: 0.0005, mgmt: "fijo", timeStop: 15, minScore: 6 };
const orbBase: V = { ...base, name: "", strat: "orb", tf: 300, minRiskPct: 0.002, timeStop: 90, htf: true, mgmt: "parcial" };
const variants: V[] = process.argv[5] === "sens" ? [
  ...[10, 15, 20, 30].map((m) => ({ ...orbBase, name: `ORB ${m} min, 2R, parcial`, orMin: m })),
  ...[1.5, 2.5, 3].map((r) => ({ ...orbBase, name: `ORB 15 min, ${r}R, parcial`, tpR: r })),
  { ...orbBase, name: "ORB 15 min, 2R, fijo", mgmt: "fijo" as const },
  { ...orbBase, name: "ORB 15 min, 2R, stop mín 0.1%", minRiskPct: 0.001 },
  { ...orbBase, name: "ORB 15 min, 2R, stop mín 0.3%", minRiskPct: 0.003 },
  { ...orbBase, name: "ORB SIN filtro 1h, parcial", htf: false },
] : [
  { ...base, name: "A0 actual (1m, fijo, 15 min)" },
  { ...base, name: "A1 actual + filtro 1h", htf: true },
  { ...base, name: "B0 entrada 5m, stop≥0.25%, fijo 45 min", tf: 300, minRiskPct: 0.0025, timeStop: 45 },
  { ...base, name: "B1 5m + filtro 1h", tf: 300, minRiskPct: 0.0025, timeStop: 45, htf: true },
  { ...base, name: "B2 5m + 1h + equilibrio en 1R", tf: 300, minRiskPct: 0.0025, timeStop: 45, htf: true, mgmt: "equilibrio" },
  { ...base, name: "B3 5m + 1h + parcial 50% y equilibrio", tf: 300, minRiskPct: 0.0025, timeStop: 60, htf: true, mgmt: "parcial" },
  { ...base, name: "B4 5m + 1h, objetivo ≥ 2R", tf: 300, minRiskPct: 0.0025, timeStop: 60, htf: true, minR: 2 },
  { ...base, name: "C0 ORB 8:30-8:45, 2R", strat: "orb", tf: 300, minRiskPct: 0.002, timeStop: 90 },
  { ...base, name: "C1 ORB + filtro 1h, 2R", strat: "orb", tf: 300, minRiskPct: 0.002, timeStop: 90, htf: true },
  { ...base, name: "C2 ORB + 1h + parcial", strat: "orb", tf: 300, minRiskPct: 0.002, timeStop: 90, htf: true, mgmt: "parcial" },
];
for (const v of variants) report(v);

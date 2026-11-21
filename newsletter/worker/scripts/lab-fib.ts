// Laboratorio de la estrategia Fibonacci (zona dorada) en todo el día cripto disponible en caché (00:00–16:30 UTC).
// Uso: node --experimental-strip-types scripts/lab-fib.ts <carpeta-caché> [diasPrueba=60] [comisión=0.0005]
import { readdirSync, readFileSync } from "node:fs";
import { read, fibSignal, manage, FIB, type Bar } from "../src/scalp-core.ts";
const dir = process.argv[2], TEST = Number(process.argv[3] ?? 60), FEE = Number(process.argv[4] ?? 0.0005);
const days = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { day0: number; b1: Bar[]; b5: Bar[]; h1: Bar[]; d1: Bar[] });
const cut = Math.floor(Date.now() / 1000 / 86400) * 86400 - TEST * 86400;
type Cfg = Partial<typeof FIB> & { name: string; partial?: boolean; maxPerDay?: number; timeStop?: number };
function run(c: Cfg) {
  const base = { ...FIB };
  Object.assign(FIB, c);
  const res: { r: number; test: boolean; day: number }[] = [];
  for (const d of days) {
    const used = new Set<string>();
    let pos: any = null, n = 0;
    for (let now = d.day0 + 3600; now <= d.day0 + 16.5 * 3600; now += 300) {
      if (pos) {
        const m = manage(d.b1, pos, now, FEE, c.timeStop ?? 180, c.partial ?? false);
        if (m.closed) { res.push({ r: m.r - (2 * FEE * pos.entry) / pos.risk, test: d.day0 >= cut, day: d.day0 }); pos = null; }
        else continue;
      }
      if (n >= (c.maxPerDay ?? 99)) continue;
      const r = read(d.b1, d.b5, d.d1, now, d.h1);
      const s = fibSignal(d.b5, r, now, used);
      if (s) { used.add(s.key); pos = { ...s, t0: now }; n++; }
    }
  }
  Object.assign(FIB, base);
  const f = (a: typeof res, nd: number) => {
    if (!a.length) return "sin ops".padEnd(44);
    const w = a.filter((x) => x.r > 0).length, s = a.reduce((p, x) => p + x.r, 0);
    return `${(a.length / nd).toFixed(1)}/día ${String(Math.round((w / a.length) * 100)).padStart(3)}% ${(s / a.length >= 0 ? "+" : "") + (s / a.length).toFixed(2)}R/op ${(s >= 0 ? "+" : "") + s.toFixed(1)}R`.padEnd(44);
  };
  const nc = days.filter((d) => d.day0 < cut).length, nt = days.length - nc;
  console.log(`${c.name.padEnd(44)} | CALIB ${f(res.filter((x) => !x.test), nc)} | PRUEBA ${f(res.filter((x) => x.test), nt)}`);
}
console.log(`Días: ${days.length} · ventana 19:00–10:30 CDMX · comisión ${(FEE * 100).toFixed(2)}%/lado · R netos\n`);
run({ name: "FIB 2R fijo, impulso ≥3 ATR, con 1h" });
run({ name: "FIB 2R fijo, impulso ≥2 ATR, con 1h", minImpulseAtr: 2 });
run({ name: "FIB 2R fijo, impulso ≥2 ATR, SIN 1h", minImpulseAtr: 2, needHtf: false });
run({ name: "FIB 2R fijo, impulso ≥4 ATR, con 1h", minImpulseAtr: 4 });
run({ name: "FIB 2R, zona 38.2–61.8, ≥2 ATR, con 1h", minImpulseAtr: 2, zoneLo: 0.382 });
run({ name: "FIB 2R, impulso 2h (24 velas), ≥2 ATR", minImpulseAtr: 2, lookback: 24 });
run({ name: "FIB parcial 2R→3R, ≥3 ATR, con 1h", partial: true });
run({ name: "FIB 1.5R fijo, ≥2 ATR, con 1h", minImpulseAtr: 2, tpR: 1.5 });

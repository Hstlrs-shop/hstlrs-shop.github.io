// Comprueba que el código que corre en vivo (orbSignal + manage) reproduce el backtest del laboratorio.
import { readdirSync, readFileSync } from "node:fs";
import { read, orbSignal, manage, ORB, SESSION, type Bar } from "../src/scalp-core.ts";
const dir = process.argv[2], FEE = 0.0005, TEST = 60, CDMX = 6 * 3600;
const cut = Math.floor(Date.now() / 1000 / 86400) * 86400 - TEST * 86400;
const res: { r: number; test: boolean }[] = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { day0: number; b1: Bar[]; b5: Bar[]; h1: Bar[]; d1: Bar[] };
  const open = d.day0 + CDMX + SESSION.from * 60;
  for (let now = open + ORB.minutes * 60; now <= open + (ORB.minutes + ORB.windowMin) * 60; now += 60) {
    const s = orbSignal(d.b1, d.b5, read(d.b1, d.b5, d.d1, now, d.h1), now, open);
    if (!s) continue;
    const m = manage(d.b1, { ...s, t0: now }, d.day0 + 86400, FEE, ORB.timeStopMin);
    res.push({ r: m.r - (2 * FEE * s.entry) / s.risk, test: d.day0 >= cut });
    break;
  }
}
const f = (a: typeof res) => `${a.length} ops · ${Math.round((a.filter((x) => x.r > 0).length / a.length) * 100)}% · ${(a.reduce((s, x) => s + x.r, 0) / a.length).toFixed(2)}R/op neto · ${a.reduce((s, x) => s + x.r, 0).toFixed(1)}R`;
console.log("CALIB ", f(res.filter((x) => !x.test)));
console.log("PRUEBA", f(res.filter((x) => x.test)));

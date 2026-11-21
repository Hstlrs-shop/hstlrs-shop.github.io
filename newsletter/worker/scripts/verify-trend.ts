// Comprueba que trendSignal + trendManage (código en vivo) reproducen el laboratorio (H2 Donchian 4h 20/10, ATR×2, filtro 200).
import { readFileSync } from "node:fs";
import { trendSignal, trendManage, type Bar } from "../src/scalp-core.ts";
const h1: Bar[] = JSON.parse(readFileSync(`${process.argv[2]}/h1.json`, "utf8"));
const s0 = h1.findIndex((x) => x.t % 14400 === 0), b4: Bar[] = [];
for (let i = s0; i + 4 <= h1.length; i += 4) { const s = h1.slice(i, i + 4); b4.push({ t: s[0].t, o: s[0].o, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), c: s[3].c, v: 0 }); }
const SPLIT = h1[0].t + Math.round((h1[h1.length - 1].t - h1[0].t) * (16 / 24)), FEE = 0.0005;
const res: { r: number; test: boolean }[] = [];
let busyUntil = 0;
for (let k = 211; k < b4.length; k++) {
  const now = b4[k].t + 14400;
  if (now <= busyUntil) continue;
  const s = trendSignal(b4.slice(0, k + 1), now);
  if (!s) continue;
  let m: any = null, end = 0;
  for (let q = k + 1; q < b4.length; q++) { m = trendManage(b4.slice(0, q + 1), s, b4[q].t + 14400); if (m.closed) { end = b4[q].t + 14400; break; } }
  if (!m?.closed) break;
  res.push({ r: m.r - (2 * FEE * s.entry) / s.risk, test: s.t >= SPLIT });
  busyUntil = end;
}
const f = (a: typeof res) => `${a.length} ops · ${Math.round((a.filter((x) => x.r > 0).length / a.length) * 100)}% · ${(a.reduce((s, x) => s + x.r, 0) / a.length).toFixed(2)}R/op neto · ${a.reduce((s, x) => s + x.r, 0).toFixed(1)}R`;
console.log("CALIB ", f(res.filter((x) => !x.test))); console.log("PRUEBA", f(res.filter((x) => x.test)));

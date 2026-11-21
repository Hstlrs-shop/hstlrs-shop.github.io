// Descarga el financiamiento por hora de BTC en Hyperliquid (público) y prueba si sus extremos predicen el precio.
// Uso: node --experimental-strip-types scripts/edge-funding.ts <carpeta con h1.json>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const dir = process.argv[2], f = `${dir}/funding.json`;
let fund: { t: number; r: number }[] = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
if (!fund.length) {
  let start = (Math.floor(Date.now() / 1000) - 730 * 86400) * 1000;
  for (;;) {
    const r = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "fundingHistory", coin: "BTC", startTime: start }) });
    const j = (await r.json()) as any[];
    if (!j.length) break;
    for (const x of j) fund.push({ t: Math.floor(x.time / 3600000) * 3600, r: +x.fundingRate });
    const last = j[j.length - 1].time;
    if (last <= start || j.length < 400) break;
    start = last + 1;
    await new Promise((s) => setTimeout(s, 300));
  }
  writeFileSync(f, JSON.stringify(fund));
}
const h1 = JSON.parse(readFileSync(`${dir}/h1.json`, "utf8")) as { t: number; c: number }[];
const px = new Map(h1.map((x) => [x.t, x.c]));
const SPLIT = h1[0].t + Math.round((h1[h1.length - 1].t - h1[0].t) * (16 / 24));
console.log(`financiamiento: ${fund.length} horas desde ${new Date(fund[0].t * 1000).toISOString().slice(0, 10)}`);
// financiamiento acumulado de 24 h y su percentil en los 30 días previos
const rows: { t: number; pct: number; f24: number }[] = [];
for (let i = 24 * 31; i < fund.length; i++) {
  const s24 = (k: number) => fund.slice(k - 24, k).reduce((a, x) => a + x.r, 0);
  const cur = s24(i), hist: number[] = [];
  for (let k = i - 24 * 30; k < i; k += 6) hist.push(s24(k));
  hist.sort((a, b) => a - b);
  rows.push({ t: fund[i].t, pct: hist.filter((x) => x < cur).length / hist.length, f24: cur });
}
const fwd = (t: number, h: number) => { const a = px.get(t), b = px.get(t + h * 3600); return a && b ? Math.log(b / a) * 1e4 : null; };
for (const H of [24, 72]) {
  for (const [name, test] of [["CALIB", (t: number) => t < SPLIT], ["PRUEBA", (t: number) => t >= SPLIT]] as const) {
    const bucket = (lo: number, hi: number) => { const v = rows.filter((x) => test(x.t) && x.pct >= lo && x.pct < hi && x.t % (24 * 3600) === 0).map((x) => fwd(x.t, H)).filter((x): x is number => x !== null); return v.length ? `${(v.reduce((a, x) => a + x, 0) / v.length).toFixed(0)}pb (n=${v.length})` : "—"; };
    console.log(`${name} retorno siguientes ${H}h · financiamiento muy bajo (<10%): ${bucket(0, 0.1)} · normal: ${bucket(0.1, 0.9)} · muy alto (>90%): ${bucket(0.9, 1.01)}`);
  }
}

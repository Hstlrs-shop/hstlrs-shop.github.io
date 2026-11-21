// Generador de Reels (1080x1920) y carruseles (1080x1350) de Lana con Café.
//
// Uso:  node media/render.mjs <kit.json> <carpeta_salida> [--photos] [--voice voz.mp3]
//   kit.json  → lo que devuelve POST /bot/kit-data del Worker de noticias
//   --photos  → usa las fotos de las fuentes (por defecto NO: arte de marca, para evitar reclamos de derechos)
//   --voice   → pista de voz (mp3/wav) que se mezcla con el video; si no, el Reel va sin audio
//              (en TikTok/Instagram se le pone un sonido en tendencia al publicarlo)
//
// Necesita: Playwright (Chromium) y ffmpeg.

import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // global en el entorno de render
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [kitPath, outDir, ...flags] = process.argv.slice(2);
if (!kitPath || !outDir) { console.error("Uso: node media/render.mjs <kit.json> <salida> [--photos] [--voice archivo]"); process.exit(1); }
const usePhotos = flags.includes("--photos");
const voice = flags.includes("--voice") ? flags[flags.indexOf("--voice") + 1] : null;
mkdirSync(outDir, { recursive: true });

const data = JSON.parse(readFileSync(kitPath, "utf8"));
const logo = readFileSync(join(here, "..", "site", "assets", "logo-mark-light.svg"), "utf8");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const d = new Date(data.date + "T12:00:00Z");
const fecha = `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;

const ACCENT = { "bancos centrales": "#E2B33C", "inflación": "#E8603C", divisas: "#3DDC84", "comercio/geopolítica": "#6FA8DC", "geopolítica": "#6FA8DC", "energía": "#F2C14E", empresas: "#3DDC84", bolsas: "#3DDC84", cripto: "#F7931A" };
const accentOf = (c) => ACCENT[(c || "").toLowerCase()] ?? "#E39A55";
const BIAS = { alcista: ["▲ sube", "#3DDC84"], bajista: ["▼ baja", "#FF7A6B"], mixto: ["mixto", "#E2B33C"], neutral: ["", "#C9B29B"] };
const fuente = (s) => String(s ?? "").replace(/^Google News · .*$/, "medios nacionales e internacionales");

// Velas decorativas (deterministas por semilla)
function candles(seed, w, h, top, n = 28) {
  let x = seed, out = "", y = h * 0.5;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280; const r = x / 233280; const o = y;
    y = Math.max(h * 0.2, Math.min(h * 0.8, y + (r - 0.47) * h * 0.12));
    const up = y < o, cx = (w / n) * i + w / n / 2, col = up ? "#3DDC84" : "#E8603C";
    const hi = Math.min(o, y) - 10 - r * 18, lo = Math.max(o, y) + 10 + r * 18;
    out += `<line x1="${cx}" x2="${cx}" y1="${top + hi}" y2="${top + lo}" stroke="${col}" stroke-width="3" opacity=".45"/><rect x="${cx - 9}" y="${top + Math.min(o, y)}" width="18" height="${Math.max(6, Math.abs(y - o))}" rx="3" fill="${col}" opacity=".5"/>`;
  }
  return out;
}

const BASE_CSS = (W, H) => `*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;overflow:hidden;font-family:Inter,sans-serif;color:#F6EFE6;
background:radial-gradient(1200px 900px at 80% 10%,#4A2E20 0%,#2B1A12 55%,#1C110B 100%);position:relative}
.top{position:absolute;left:72px;right:72px;top:72px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px;font:700 30px Inter;letter-spacing:.04em}.brand svg{width:64px;height:64px}
.date{font:600 26px Inter;color:#C9B29B;text-transform:uppercase;letter-spacing:.08em}
svg.bg{position:absolute;inset:0}
.foot{position:absolute;left:72px;right:72px;bottom:64px;display:flex;justify-content:space-between;align-items:center;font:500 24px Inter;color:#C9B29B}
.chip{display:inline-block;font:800 24px Inter;letter-spacing:.1em;text-transform:uppercase;padding:10px 20px;border-radius:999px}
h1,h2{font-family:Fraunces,serif;letter-spacing:-.02em}`;

const FONT = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet">`;

function cover(W, H) {
  const k = data.kit;
  return `<!doctype html><html><head>${FONT}<style>${BASE_CSS(W, H)}
  .c{position:absolute;left:72px;right:72px;top:${H * 0.26}px}
  .kicker{font:800 30px Inter;color:#E39A55;letter-spacing:.12em;text-transform:uppercase;margin-bottom:28px}
  h1{font-size:${H > 1500 ? 112 : 82}px;line-height:1.02;font-weight:900}
  .list{margin-top:56px;display:grid;gap:22px}.list div{display:flex;gap:18px;align-items:flex-start;font:600 ${H > 1500 ? 42 : 30}px/1.25 Inter;color:#EADFD2}
  .list b{font:900 36px Fraunces;color:#E39A55;min-width:44px}</style></head><body>
  <svg class="bg" viewBox="0 0 ${W} ${H}">${candles(7, W, H > 1500 ? 240 : 150, H - (H > 1500 ? 360 : 210))}</svg>
  <div class="top"><div class="brand">${logo}<span>LANA CON CAFÉ</span></div><div class="date">${esc(fecha)}</div></div>
  <div class="c"><div class="kicker">☕ Lo que mueve tu dinero hoy</div><h1>${esc(k.hook)}</h1>
  <div class="list">${data.news.map((n, i) => `<div><b>${i + 1}</b><span>${esc(n.headline)}</span></div>`).join("")}</div></div>
  <div class="foot"><span>Información, no asesoría</span><span>${H > 1500 ? "3 noticias en 30 segundos" : "Desliza →"}</span></div></body></html>`;
}

function newsSlide(n, i, W, H) {
  const a = accentOf(n.category);
  const [arrow, bcol] = BIAS[n.bias] ?? BIAS.neutral;
  const photo = usePhotos && n.image;
  const big = H > 1500;
  return `<!doctype html><html><head>${FONT}<style>${BASE_CSS(W, H)}
  .num{position:absolute;right:56px;top:${big ? 180 : 150}px;font:900 ${big ? 300 : 240}px/1 Fraunces;color:${a};opacity:.18}
  .ph{position:absolute;left:0;right:0;top:${big ? 200 : 170}px;height:${big ? 640 : 430}px;background:url('${esc(n.image)}') center/cover;filter:saturate(.9)}
  .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(28,17,11,.1),#2B1A12 96%)}
  .c{position:absolute;left:72px;right:72px;top:${photo ? (big ? 780 : 560) : big ? 420 : 330}px}
  .chip{background:${a}26;color:${a};border:2px solid ${a}66}
  h2{font-size:${big ? 92 : 62}px;line-height:1.05;margin:28px 0 34px;font-weight:900}
  .why{font:600 ${big ? 26 : 24}px Inter;color:${a};text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}
  p{font:500 ${big ? 46 : 32}px/1.35 Inter;color:#EADFD2}
  .assets{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}.assets span{font:700 ${big ? 34 : 28}px Inter;padding:12px 20px;border-radius:14px;background:#ffffff12}
  .assets span b{color:${bcol}}</style></head><body>
  ${photo ? `<div class="ph"></div>` : `<svg class="bg" viewBox="0 0 ${W} ${H}">${candles(31 * (i + 2), W, big ? 240 : 150, H - (big ? 360 : 210), 24)}</svg><div class="num">0${i + 1}</div>`}
  <div class="top"><div class="brand">${logo}<span>LANA CON CAFÉ</span></div><div class="date">${i + 1} de ${data.news.length}</div></div>
  <div class="c"><span class="chip">${esc(n.category || "mercados")}</span><h2>${esc(n.headline)}</h2>
  ${n.brief ? `<div class="why">Qué significa para ti</div><p>${esc(n.brief)}</p>` : ""}
  ${n.assets?.length ? `<div class="assets">${n.assets.slice(0, 3).map((x) => `<span>${esc(x)}${arrow ? ` <b>${arrow}</b>` : ""}</span>`).join("")}</div>` : ""}</div>
  <div class="foot"><span>Fuente: ${esc(fuente(n.source))}${photo ? " · Foto: " + esc(fuente(n.source)) : ""}</span><span>Información, no asesoría</span></div></body></html>`;
}

function cta(W, H) {
  return `<!doctype html><html><head>${FONT}<style>${BASE_CSS(W, H)}
  .c{position:absolute;left:72px;right:72px;top:${H * 0.24}px;text-align:center}
  .c svg{width:220px;height:220px}
  h2{font-size:${H > 1500 ? 110 : 76}px;line-height:1.05;margin:40px 0 28px;font-weight:900}
  p{font:600 ${H > 1500 ? 46 : 34}px/1.35 Inter;color:#EADFD2}
  .pill{display:inline-block;margin-top:48px;background:#C8742B;color:#FFFCF7;font:800 ${H > 1500 ? 44 : 38}px Inter;padding:26px 44px;border-radius:999px}
  .small{margin-top:28px;font:600 30px Inter;color:#C9B29B}</style></head><body>
  <svg class="bg" viewBox="0 0 ${W} ${H}">${candles(99, W, H > 1500 ? 240 : 150, H - (H > 1500 ? 360 : 210))}</svg>
  <div class="c">${logo}<h2>Entérate antes<br>que nadie ☕</h2><p>Alertas al instante en Telegram<br>y una IA que te explica qué significa para tu dinero.</p>
  <div class="pill">Link en mi perfil</div><div class="small">@LanaconcafeBot · gratis</div></div>
  <div class="foot"><span>Información, no asesoría de inversión</span><span>lanaconcafe</span></div></body></html>`;
}

const browser = await chromium.launch();
async function shot(html, W, H, file) {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: file, type: "png" });
  await p.close();
  return file;
}

// Reel (9:16) y carrusel (4:5)
const reel = [], carousel = [];
for (const [W, H, list, tag] of [[1080, 1920, reel, "reel"], [1080, 1350, carousel, "post"]]) {
  list.push(await shot(cover(W, H), W, H, join(outDir, `${tag}-1.png`)));
  for (const [i, n] of data.news.entries()) list.push(await shot(newsSlide(n, i, W, H), W, H, join(outDir, `${tag}-${i + 2}.png`)));
  list.push(await shot(cta(W, H), W, H, join(outDir, `${tag}-${data.news.length + 2}.png`)));
}
await browser.close();

// Video: zoom suave en cada pantalla + transiciones (xfade)
const FPS = 30, T = 0.5;
const durs = reel.map((_, i) => (i === 0 ? 4 : i === reel.length - 1 ? 4.5 : 7.5));
const args = ["-y"];
reel.forEach((f) => args.push("-i", f));
const parts = reel.map((_, i) => {
  const frames = Math.round(durs[i] * FPS);
  return `[${i}:v]scale=1188:2112,zoompan=z='min(1+0.06*on/${frames},1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS},format=yuv420p,setsar=1[v${i}]`;
});
let last = "v0", length = durs[0];
for (let i = 1; i < reel.length; i++) {
  const out = i === reel.length - 1 ? "vout" : `x${i}`;
  parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${T}:offset=${(length - T).toFixed(2)}[${out}]`);
  length += durs[i] - T; last = out;
}
// Audio: la voz si se pasó; si no, silencio (algunas plataformas rechazan videos sin pista de audio)
if (voice) args.push("-i", voice);
else args.push("-f", "lavfi", "-t", length.toFixed(2), "-i", "anullsrc=r=44100:cl=stereo");
const mp4 = join(outDir, "reel.mp4");
const finalArgs = [...args, "-filter_complex", parts.join(";"), "-map", "[vout]", "-map", `${reel.length}:a`,
  "-c:a", "aac", "-b:a", voice ? "160k" : "96k", "-t", length.toFixed(2),
  "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), mp4];
execFileSync("ffmpeg", finalArgs, { stdio: ["ignore", "ignore", "inherit"] });

const k = data.kit;
const caption = `${k.caption}\n\n⚡ Alertas al instante en Telegram (link en el perfil)\nInformación, no asesoría.\n\n${k.hashtags.map((t) => "#" + String(t).replace(/^#/, "").replace(/\s+/g, "")).join(" ")}`;
writeFileSync(join(outDir, "caption.txt"), caption);
console.log(JSON.stringify({ reel: mp4, seconds: Number(length.toFixed(1)), carousel, caption: join(outDir, "caption.txt") }));

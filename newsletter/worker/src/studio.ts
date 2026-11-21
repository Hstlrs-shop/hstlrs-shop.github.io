// Estudio: videos diarios con aprobación desde Telegram, guía de pago (Telegram Stars)
// y página de enlaces de la bio por red social (/ig, /tt, /yt) con conteo de clics.
//
// Flujo de los videos: una sesión programada produce el Reel, crea el borrador en vidIQ
// (Instagram + TikTok) e inserta una fila en `approvals` con status 'new'. El cron de cada
// minuto la manda al admin con botones ✅/❌; el bot registra la decisión (/bot/approve) y
// la siguiente sesión de revisión publica solo lo aprobado. Sin ✅ no se publica nada.

import { num, type Env } from "./env";
import { layout } from "./pages";
import { esc, tgCall } from "./telegram";

const CDMX = 6 * 3600_000;
const cdmxDay = (ms = Date.now()) => new Date(ms - CDMX).toISOString().slice(0, 10);
const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hhmm = (ms: number) => new Date(ms - CDMX).toISOString().slice(11, 16);

export const GUIDE = {
  id: "guia1",
  title: "Tu primera inversión en México",
  subtitle: "Guía paso a paso para empezar con poco, sin humo y con datos oficiales",
  freeKey: "file:guia1_cap1",
  fullKey: "file:guia1",
};
const BOT = "https://t.me/LanaconcafeBot";
const CANAL = "https://t.me/LanaconCafe";
export const guideStars = (env: Env) => num(env.GUIDE_STARS, 375);
export const guideMxn = (env: Env) => num(env.GUIDE_MXN, 149);

// ---------- Aprobaciones ----------
const KIND: Record<string, string> = { educativo: "📚 Educativo", curioso: "🤓 Dato curioso", noticia: "📰 Noticia", cierre: "📉 Cierre de semana" };

export async function sendApprovals(env: Env) {
  const admin = env.ADMIN_CHAT_ID;
  if (!admin) return;
  const now = Date.now();
  // Las que ya pasaron su hora sin respuesta caducan (no se publican)
  const late = await env.DB.prepare("SELECT id, title, slot FROM approvals WHERE status IN ('new','sent') AND publish_at < ?1").bind(now - 30 * 60_000).all<any>();
  for (const a of late.results) {
    await env.DB.prepare("UPDATE approvals SET status = 'expired' WHERE id = ?1").bind(a.id).run();
    await tgCall(env, "sendMessage", { chat_id: admin, parse_mode: "HTML", text: `⌛ No se publicó <b>${esc(a.title)}</b> (${a.slot}): no llegó tu ✅ a tiempo.` }).catch(() => {});
  }
  const q = await env.DB.prepare("SELECT * FROM approvals WHERE status = 'new' ORDER BY publish_at LIMIT 3").all<any>();
  for (const a of q.results) {
    const deadline = hhmm(Number(a.publish_at) - 20 * 60_000);
    const caption = `${KIND[a.kind] ?? "🎬"} · <b>${a.slot} h</b> (Instagram + TikTok)\n<b>${esc(a.title)}</b>\n\n` +
      `${esc(String(a.caption).slice(0, 600))}${String(a.caption).length > 600 ? "…" : ""}\n\n` +
      `Toca ✅ antes de las <b>${deadline}</b> para que salga a su hora. Si no respondes, no se publica.` +
      (a.drive_url ? `\n<a href="${h(a.drive_url)}">Ver en Drive</a>` : "");
    const markup = { inline_keyboard: [[{ text: "✅ Publicar", callback_data: `ap:${a.id}:ok` }, { text: "❌ Descartar", callback_data: `ap:${a.id}:no` }]] };
    const send = (m: string, body: Record<string, unknown>) => tgCall(env, m, body).then(() => ({ ok: true, description: "" }), (e) => ({ ok: false, description: String(e) }));
    let r = a.video_url
      ? await send("sendVideo", { chat_id: admin, video: a.video_url, caption: caption.slice(0, 1024), parse_mode: "HTML", supports_streaming: true, reply_markup: markup })
      : { ok: false, description: "sin video" };
    if (!r.ok) r = await send("sendMessage", { chat_id: admin, text: caption + (a.video_url ? `\n<a href="${h(a.video_url)}">▶️ Ver video</a>` : ""), parse_mode: "HTML", reply_markup: markup });
    if (r.ok) await env.DB.prepare("UPDATE approvals SET status = 'sent', sent_at = ?2 WHERE id = ?1").bind(a.id, now).run();
    else console.warn("aprobación", a.id, r?.description);
  }
}

async function decide(env: Env, tg: number, id: string, ok: boolean) {
  if (String(tg) !== String(env.ADMIN_CHAT_ID)) return { error: "Solo el administrador aprueba videos." };
  const a = await env.DB.prepare("SELECT * FROM approvals WHERE id = ?1").bind(id).first<any>();
  if (!a) return { error: "No encontré ese video." };
  if (!["new", "sent", "approved", "rejected"].includes(a.status)) return { error: `Ya no se puede cambiar (estado: ${a.status}).`, status: a.status };
  const status = ok ? "approved" : "rejected";
  await env.DB.prepare("UPDATE approvals SET status = ?2, decided_at = ?3 WHERE id = ?1").bind(id, status, Date.now()).run();
  const late = ok && Date.now() > Number(a.publish_at) - 20 * 60_000;
  return { ok: true, status, slot: a.slot, title: a.title, late };
}

// ---------- Guía ----------
async function newToken(env: Env, tg: number, product: string) {
  const b = crypto.getRandomValues(new Uint8Array(18));
  const token = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("INSERT INTO downloads (token, tg, product, expires) VALUES (?1, ?2, ?3, ?4)").bind(token, tg, product, Date.now() + 2 * 3600_000).run();
  return `${env.SITE_URL}/dl/${token}/${GUIDE.id}.pdf`;
}

export async function handleStudioApi(env: Env, path: string, b: Record<string, any>): Promise<Response | null> {
  const tg = Number(b.tg);
  const okTg = Number.isSafeInteger(tg) && tg > 0;
  switch (path) {
    case "/bot/approve":
      if (!okTg) return null;
      return Response.json(await decide(env, tg, String(b.id ?? ""), !!b.ok));
    case "/bot/guide":
      return Response.json({
        title: GUIDE.title, subtitle: GUIDE.subtitle, stars: guideStars(env), mxn: guideMxn(env),
        free_url: `${env.SITE_URL}/guia/capitulo-1.pdf`, page: `${env.SITE_URL}/guia`,
        bought: okTg ? !!(await env.DB.prepare("SELECT 1 FROM purchases WHERE tg = ?1 AND product = ?2 AND refunded = 0").bind(tg, GUIDE.id).first()) : false,
        ready: !!(await env.BOT_KV?.get("guide_ready")),
      });
    case "/bot/purchase": {
      if (!okTg || !b.charge_id) return null;
      await env.DB.prepare("INSERT OR IGNORE INTO purchases (charge_id, tg, product, stars, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
        .bind(String(b.charge_id), tg, String(b.product ?? GUIDE.id), num(b.stars, 0), Date.now()).run();
      if (env.ADMIN_CHAT_ID) await tgCall(env, "sendMessage", { chat_id: env.ADMIN_CHAT_ID, text: `💰 Venta de la guía: ${num(b.stars, 0)} ⭐ (usuario ${tg})` }).catch(() => {});
      return Response.json({ url: await newToken(env, tg, GUIDE.id) });
    }
    case "/bot/download": {
      if (!okTg) return null;
      const p = await env.DB.prepare("SELECT 1 FROM purchases WHERE tg = ?1 AND product = ?2 AND refunded = 0").bind(tg, GUIDE.id).first();
      if (!p) return Response.json({ error: "No encuentro tu compra. Si pagaste, escríbenos con /ayuda." });
      return Response.json({ url: await newToken(env, tg, GUIDE.id) });
    }
    case "/bot/refunded": {
      if (String(b.admin) !== String(env.ADMIN_CHAT_ID)) return null;
      const r = await env.DB.prepare("UPDATE purchases SET refunded = 1 WHERE charge_id = ?1").bind(String(b.charge_id ?? "")).run();
      return Response.json({ ok: !!r.meta.changes });
    }
    case "/bot/purchase-of": {
      if (!okTg) return null;
      const p = await env.DB.prepare("SELECT charge_id, stars, created_at, refunded FROM purchases WHERE tg = ?1 ORDER BY created_at DESC LIMIT 1").bind(tg).first();
      return Response.json(p ?? { error: "Ese usuario no tiene compras." });
    }
    case "/bot/studio-stats": {
      const since = cdmxDay(Date.now() - 6 * 86400_000);
      const [c, a, p] = await env.DB.batch([
        env.DB.prepare("SELECT src, dest, SUM(n) n FROM clicks WHERE day >= ?1 GROUP BY src, dest ORDER BY src, dest").bind(since),
        env.DB.prepare("SELECT status, COUNT(*) n FROM approvals WHERE created_at > ?1 GROUP BY status").bind(Date.now() - 7 * 86400_000),
        env.DB.prepare("SELECT COUNT(*) n, COALESCE(SUM(stars),0) stars FROM purchases WHERE refunded = 0"),
      ]);
      return Response.json({ clicks: c.results, approvals: a.results, purchases: p.results[0] });
    }
  }
  return null;
}

/** /dl/<token>/guia1.pdf: descarga de la guía comprada (enlace temporal de 2 h). */
export async function download(env: Env, token: string): Promise<Response> {
  const d = await env.DB.prepare("SELECT product, expires FROM downloads WHERE token = ?1").bind(token).first<{ product: string; expires: number }>();
  if (!d || d.expires < Date.now()) return new Response("Este enlace ya caducó. Pide uno nuevo en el bot con /miguia", { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } });
  const f = await env.BOT_KV?.get(GUIDE.fullKey, "arrayBuffer");
  if (!f) return new Response("La guía se está actualizando; inténtalo en unos minutos.", { status: 503 });
  return new Response(f, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="Lana-con-Cafe-${GUIDE.id}.pdf"`, "cache-control": "private, no-store" } });
}

export async function freeChapter(env: Env): Promise<Response> {
  const f = await env.BOT_KV?.get(GUIDE.freeKey, "arrayBuffer");
  if (!f) return new Response("Próximamente", { status: 404 });
  return new Response(f, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="Lana-con-Cafe-capitulo-1.pdf"`, "cache-control": "public, max-age=3600" } });
}

// ---------- Enlaces de la bio ----------
async function count(env: Env, src: string, dest: string) {
  await env.DB.prepare("INSERT INTO clicks (day, src, dest, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, src, dest) DO UPDATE SET n = n + 1")
    .bind(cdmxDay(), src, dest).run().catch(() => {});
}
const SRC = new Set(["ig", "tt", "yt", "web"]);
const DEST: Record<string, string> = { canal: CANAL, guia: `${BOT}?start=guia`, pro: `${BOT}?start=pro`, bot: `${BOT}?start=ayuda`, prueba: `${BOT}?start=prueba` };

export async function go(env: Env, dest: string, src: string, ctx: ExecutionContext): Promise<Response> {
  const s = SRC.has(src) ? src : "web";
  const to = DEST[dest];
  if (!to) return new Response("No encontrado", { status: 404 });
  ctx.waitUntil(count(env, s, dest));
  return Response.redirect(to, 302);
}

export async function bioPage(env: Env, src: string, ctx: ExecutionContext): Promise<Response> {
  ctx.waitUntil(count(env, src, "view"));
  const g = (d: string) => `/go/${d}?s=${src}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lana con Café · enlaces</title><meta name="description" content="Las noticias que mueven tu dinero, con el primer café. Canal gratis de Telegram, guía para empezar a invertir y alertas Pro.">
<meta property="og:title" content="Lana con Café"><meta property="og:image" content="${env.SITE_URL}/assets/og.jpg"><meta name="theme-color" content="#2B1A12">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#2B1A12;--card:#3A251B;--cream:#F6EBDD;--muted:#C9B29B;--gold:#E2B33C;--line:#ffffff1a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--cream);font:16px/1.45 Inter,system-ui,sans-serif;min-height:100vh}
main{max-width:460px;margin:0 auto;padding:36px 16px 40px;text-align:center}
img.logo{width:72px;height:72px}h1{font:800 30px/1.1 Fraunces,serif;margin:12px 0 6px}h1 em{color:var(--gold);font-style:italic}
p.tag{color:var(--muted);margin:0 0 26px}
a.b{display:block;text-decoration:none;color:var(--cream);background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:0 0 12px;text-align:left}
a.b strong{display:block;font-size:17px}a.b span{color:var(--muted);font-size:14px}
a.b.main{background:var(--gold);color:#2B1A12;border:0}a.b.main span{color:#4a3222}
small{display:block;color:var(--muted);margin-top:22px;font-size:12px}
</style></head><body><main>
<img class="logo" src="/assets/logo-mark-light.svg" alt="">
<h1>Lana <em>con</em> Café</h1>
<p class="tag">Las noticias que mueven tu dinero, explicadas claro y con fuentes.</p>
<a class="b main" href="${g("canal")}"><strong>☕ Únete gratis al canal de Telegram</strong><span>Alertas del dólar, la bolsa y la economía de México, cada día</span></a>
<a class="b" href="${g("guia")}"><strong>📖 Guía: Tu primera inversión en México</strong><span>Lee gratis el capítulo 1 · completa $${guideMxn(env)} MXN, con garantía de reembolso</span></a>
<a class="b" href="${g("prueba")}"><strong>⭐ Prueba Pro gratis 7 días</strong><span>Alertas al instante, radar personal y pregúntale a la IA</span></a>
<a class="b" href="/dolar-hoy"><strong>💵 Dólar hoy en México</strong><span>Tipo de cambio actualizado y gráfica</span></a>
<a class="b" href="/"><strong>📰 Todas las noticias</strong><span>lanaconcafe · sitio web</span></a>
<small>Información, no asesoría financiera.</small>
</main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

// ---------- Página de la guía ----------
export function guidePage(env: Env): Response {
  const body = `<main class="wrap" style="max-width:780px;padding:40px 16px 60px">
<p class="eyebrow">Guía Lana con Café</p>
<h1 style="font-family:Fraunces,serif;font-size:clamp(32px,6vw,52px);line-height:1.05;margin:.2em 0">${h(GUIDE.title)}</h1>
<p style="font-size:20px;opacity:.85">${h(GUIDE.subtitle)}.</p>
<p><a class="btn" href="/go/guia?s=web">Leer el capítulo 1 gratis en Telegram</a> &nbsp; <a href="/guia/capitulo-1.pdf">o descárgalo aquí (PDF)</a></p>
<h2>Qué incluye</h2>
<ol>
<li><b>Antes de invertir:</b> tu fondo de emergencia, deudas caras y cuánto apartar (capítulo gratis).</li>
<li><b>Conceptos sin rodeos:</b> rendimiento nominal y real, inflación, GAT, riesgo, liquidez y plazo.</li>
<li><b>CETES paso a paso:</b> qué son, cuánto rinden, cómo se compran desde $100 en Cetesdirecto y cómo se gravan.</li>
<li><b>Bancos, Sofipos y apps:</b> cómo leer la GAT, qué protege el IPAB y qué protege el Prosofipo (y cuánto).</li>
<li><b>Fondos de inversión, Bolsa y ETFs:</b> qué son, comisiones y cómo comparar sin caer en promesas.</li>
<li><b>Afore y aportaciones voluntarias:</b> el beneficio fiscal y cómo hacerlas.</li>
<li><b>Fraudes y señales de alerta:</b> cómo revisar si una entidad está autorizada (CNBV, CONDUSEF).</li>
<li><b>Tu plan en una hoja:</b> ejercicio para decidir con tus propios números.</li>
</ol>
<h2>Nuestro compromiso de transparencia</h2>
<ul>
<li>Cada dato lleva su <b>fuente oficial</b> (Banxico, CONDUSEF, CNBV, IPAB, SAT, Cetesdirecto) y su <b>fecha de corte</b>.</li>
<li><b>No promete rendimientos</b> ni recomienda comprar o vender nada: explica cómo funcionan las opciones para que decidas tú.</li>
<li><b>No tiene enlaces de afiliado</b> ni menciones pagadas.</li>
<li>Se actualiza cuando cambian las tasas o las reglas, y quien la compró recibe la versión nueva gratis con /miguia.</li>
<li><b>Garantía de 7 días:</b> si no te sirvió, escribe /reembolso en el bot y te devolvemos tus Stars, sin preguntas.</li>
</ul>
<h2>Precio</h2>
<p><b>${guideStars(env)} ⭐ Telegram Stars</b> (aprox. $${guideMxn(env)} MXN), pago dentro de Telegram. Recibes el PDF al instante en el chat.</p>
<p><a class="btn" href="/go/guia?s=web">Comprar en Telegram</a></p>
<p class="legal" style="opacity:.7;font-size:14px">Material educativo. No es asesoría de inversión personalizada ni una recomendación de productos financieros. Antes de invertir, revisa tu situación y, si lo necesitas, consulta a un asesor autorizado.</p>
</main>`;
  return new Response(layout(env, { title: `${GUIDE.title} · Guía Lana con Café`, description: `${GUIDE.subtitle}. Capítulo 1 gratis.`, image: `${env.SITE_URL}/assets/og.jpg`, url: `${env.SITE_URL}/guia`, body }), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}

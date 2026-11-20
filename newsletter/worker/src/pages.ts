// Páginas generadas en el servidor: una por noticia (/n/<id>-<titulo>) con
// etiquetas Open Graph para que al compartirla se vea con foto y resumen, más
// sitemap.xml y robots.txt para que Google indexe el sitio.

import type { Env } from "./env";
import { askLink } from "./telegram";

const CAT_SLUG: [RegExp, string][] = [
  [/banco|central|monetari/i, "bancos-centrales"],
  [/inflaci/i, "inflacion"],
  [/empleo|crecim|pib/i, "empleo"],
  [/geopol|comercio|polít|politi/i, "geopolitica"],
  [/energ|petr/i, "energia"],
  [/empres|bolsa|regulac/i, "empresas"],
  [/divis|cambio|renta fija|bono/i, "divisas"],
  [/cripto|bitcoin/i, "cripto"],
];
export const catSlug = (c: string | null | undefined) => CAT_SLUG.find(([re]) => re.test(c ?? ""))?.[1] ?? "general";
export const catImage = (env: Env, c: string | null | undefined) => `${env.SITE_URL}/assets/cat-${catSlug(c)}.jpg`;

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}
export const newsPath = (n: { id: string; headline_es?: string | null; title: string }) => `/n/${n.id}-${slugify(n.headline_es ?? n.title)}`;

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BIAS: Record<string, string> = { alcista: "▲ alcista", bajista: "▼ bajista", mixto: "↔ mixto", neutral: "– neutral" };
const IMPACT = ["", "Bajo", "Bajo", "Medio", "Alto", "Muy alto"];

function fecha(ms: number): string {
  const d = new Date(ms - 6 * 3600_000);
  const m = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} (CDMX)`;
}

/** Cabecera y pie comunes (mismos que las páginas estáticas de site/). */
export function layout(env: Env, o: { title: string; description: string; image: string; url: string; body: string; type?: string; extraHead?: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(o.title)}</title>
<meta name="description" content="${h(o.description)}">
<link rel="canonical" href="${h(o.url)}">
<meta property="og:site_name" content="${h(env.BRAND)}">
<meta property="og:type" content="${o.type ?? "website"}">
<meta property="og:title" content="${h(o.title)}">
<meta property="og:description" content="${h(o.description)}">
<meta property="og:image" content="${h(o.image)}">
<meta property="og:url" content="${h(o.url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2B1A12">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${h(env.BRAND)}" href="/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script src="/config.js"></script>
${o.extraHead ?? ""}
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/"><img src="/assets/logo-mark.svg" alt="" width="34" height="34"><span>Lana <em>con</em> Café</span></a>
  <nav><a href="/#noticias" class="hide-sm">Noticias</a><a href="/mercados.html">Mercados</a><a href="/#ediciones" class="hide-sm">Newsletter</a><a class="btn sm" href="/precios.html">Pro</a></nav>
</div></header>
<div class="ticker" id="ticker"></div>
${o.body}
<footer><div class="wrap foot">
  <div><a class="logo" href="/"><img src="/assets/logo-mark-light.svg" alt="" width="30" height="30"><span>Lana <em>con</em> Café</span></a>
  <p>Las noticias que mueven tu dinero, con el primer café.</p></div>
  <div class="links"><a data-link="TELEGRAM_FREE">Telegram</a><a href="/precios.html">Pro</a><a href="/mercados.html">Mercados</a><a href="/marca.html">Marca</a><a href="/rss.xml">RSS</a></div>
  <p class="legal">Información, no asesoría de inversión. Titulares y fotos enlazan a sus fuentes originales; resúmenes de redacción propia. Datos de mercado: TradingView.</p>
</div></footer>
<script src="/app.js"></script>
</body>
</html>`;
}

export async function articlePage(env: Env, id: string, req: Request, ctx: ExecutionContext): Promise<Response> {
  const n = await env.DB.prepare("SELECT * FROM news WHERE id = ?1").bind(id).first<any>();
  if (!n) return new Response(layout(env, {
    title: `No encontrada · ${env.BRAND}`, description: "", image: `${env.SITE_URL}/assets/og-home.jpg`, url: env.SITE_URL,
    body: `<main class="wrap article"><h1>Esta noticia ya no está disponible</h1><p><a class="btn" href="/">Ver lo último</a></p></main>`,
  }), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });

  // Vistas (no cuenta bots ni las vistas previas de redes sociales)
  if (!/bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord/i.test(req.headers.get("user-agent") ?? "")) {
    ctx.waitUntil(env.DB.prepare("UPDATE news SET views = views + 1 WHERE id = ?1").bind(id).run());
  }

  const title = n.headline_es ?? n.title;
  const brief = n.brief_es ?? n.summary ?? "";
  const url = `${env.SITE_URL}${newsPath(n)}`;
  const img = n.image ?? catImage(env, n.category);
  const assets: string[] = JSON.parse(n.assets ?? "[]");
  const related = await env.DB.prepare(
    `SELECT id, title, headline_es, image, category, source_name, detected_at FROM news
     WHERE id != ?1 AND detected_at > ?2 AND impact >= 3 ORDER BY (category = ?3) DESC, impact DESC, detected_at DESC LIMIT 4`,
  ).bind(id, Date.now() - 3 * 86400_000, n.category).all<any>();
  const ask = await askLink(env, id);
  const share = encodeURIComponent(`${title} ☕`);
  const shareUrl = encodeURIComponent(url);

  const body = `<main class="wrap article">
  <nav class="crumbs"><a href="/">Inicio</a> › <span class="chip cat-${catSlug(n.category)}">${h(n.category ?? "mercados")}</span></nav>
  <article>
    <h1>${h(title)}</h1>
    <div class="meta"><span class="impact i${n.impact}">Impacto ${IMPACT[n.impact] ?? ""}</span><span>${h(n.source_name)}</span><span>${fecha(n.detected_at)}</span>${n.views > 5 ? `<span>👁 ${n.views}</span>` : ""}</div>
    <figure class="hero-img"><img src="${h(img)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${h(catImage(env, n.category))}'"><figcaption>${n.image ? `Foto: ${h(n.source_name)}` : "Lana con Café"}</figcaption></figure>
    <p class="lede">${h(brief)}</p>
    ${assets.length ? `<section class="assets"><h2>Qué puede moverse</h2><div>${assets.map((a) => `<span class="asset ${h(n.bias ?? "")}">${h(a)} <b>${h(BIAS[n.bias] ?? "")}</b></span>`).join("")}</div><p class="note">Sesgo probable según el análisis de la noticia. No es una recomendación.</p></section>` : ""}
    ${n.title !== title ? `<p class="orig">Titular original: <i>${h(n.title)}</i></p>` : ""}
    <p><a class="btn" href="${h(n.link)}" target="_blank" rel="noopener">Leer la nota completa en ${h(n.source_name)} ↗</a></p>
    ${ask ? `<a class="ask-lana" href="${h(ask)}"><img src="/assets/logo-mark-light.svg" alt="" width="36" height="36"><span><b>🤖 ¿Qué significa para mí?</b><small>Pregúntale a Lana en Telegram: te lo explica en 30 segundos, con tu radar.</small></span></a>` : ""}
    <section class="react" data-id="${h(n.id)}"><span>¿Te sirvió?</span><button data-v="1">👍 <b>${n.likes}</b></button><button data-v="-1">👎 <b>${n.dislikes}</b></button></section>
    <section class="share"><span>Compártela</span>
      <a href="https://wa.me/?text=${share}%20${shareUrl}" target="_blank" rel="noopener">WhatsApp</a>
      <a href="https://t.me/share/url?url=${shareUrl}&text=${share}" target="_blank" rel="noopener">Telegram</a>
      <a href="https://x.com/intent/post?text=${share}&url=${shareUrl}" target="_blank" rel="noopener">X</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener">Facebook</a>
      <button class="copy" data-url="${h(url)}">Copiar enlace</button>
    </section>
  </article>
  <aside class="cta-box">
    <img src="/assets/logo-mark.svg" alt="" width="48" height="48">
    <h3>Recibe esto antes que nadie</h3>
    <p>Alertas en Telegram en cuanto sale la noticia y un resumen diario con el primer café.</p>
    <a class="btn" data-link="TELEGRAM_FREE">Unirme gratis en Telegram</a>
    <form class="sub"><input type="email" required placeholder="tu@email.com" aria-label="Email"><button class="btn ghost">Newsletter</button></form>
  </aside>
  ${related.results.length ? `<section class="related"><h2>Más noticias</h2><div class="cards">${related.results.map((r) => `
    <a class="card" href="${newsPath(r)}"><img src="${h(r.image ?? catImage(env, r.category))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${h(catImage(env, r.category))}'"><div><span class="chip cat-${catSlug(r.category)}">${h(r.category)}</span><h3>${h(r.headline_es ?? r.title)}</h3><small>${h(r.source_name)}</small></div></a>`).join("")}</div></section>` : ""}
</main>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "NewsArticle", headline: title, description: brief, image: [img],
    datePublished: new Date(n.detected_at).toISOString(), mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: env.BRAND, logo: { "@type": "ImageObject", url: `${env.SITE_URL}/assets/og-home.jpg` } },
  }).replace(/</g, "\\u003c")}</script>`;

  return new Response(layout(env, { title: `${title} · ${env.BRAND}`, description: brief.slice(0, 200), image: img, url, body, type: "article" }), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120" },
  });
}

export async function sitemap(env: Env): Promise<Response> {
  const q = await env.DB.prepare(
    "SELECT id, title, headline_es, detected_at FROM news WHERE impact >= 3 AND detected_at > ?1 ORDER BY detected_at DESC LIMIT 1000",
  ).bind(Date.now() - 30 * 86400_000).all<any>();
  const urls = [
    `<url><loc>${env.SITE_URL}/</loc><changefreq>always</changefreq></url>`,
    `<url><loc>${env.SITE_URL}/mercados.html</loc></url>`,
    `<url><loc>${env.SITE_URL}/precios.html</loc></url>`,
    ...q.results.map((n) => `<url><loc>${env.SITE_URL}${newsPath(n)}</loc><lastmod>${new Date(n.detected_at).toISOString()}</lastmod></url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" },
  });
}

export const robots = (env: Env) => new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /bot/\nSitemap: ${env.SITE_URL}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });

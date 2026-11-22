import { buildDigest } from "./digest";
import { num, type Env } from "./env";
import { backfillImages, enrichRecent, flushFreeQueue, ingest, syncBotNoticias } from "./ingest";
import { handleAccess, handleChatMember, handleMercadoPago } from "./payments";
import { flushOutbox, handleBotApi, morningBriefing, proTick } from "./pro";
import { articlePage, catSlug, newsPath, robots, sitemap } from "./pages";
import { affiliateRedirect } from "./growth";
import { marketPage } from "./seo";
import { SITE } from "./site-files";
import { esc } from "./telegram";
import { scalpTick, trendTick } from "./scalp";
import { cetesPage, inflationPage } from "./tools";
import { latestVideos, syncYouTube } from "./youtube";
import { bioPage, download, freeChapter, go, guidePage, studioApi } from "./studio";

const DIGEST_CRON = "17 11 * * 1-5"; // debe coincidir con wrangler.toml
const SCALP_CRON = "* 12-23 * * 1-5";
const TREND_CRON = "2 */4 * * *"; // tendencia BTC 4h, 2 min después de cada cierre

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...CORS, ...extra } });

/** Devuelve el plan si el Bearer token es una API key activa. */
async function memberFromAuth(req: Request, env: Env): Promise<string | null> {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key?.startsWith("pk_")) return null;
  const m = await env.DB.prepare("SELECT plan FROM members WHERE api_key = ?1 AND status = 'authorized'").bind(key).first<{ plan: string }>();
  return m?.plan ?? null;
}

function mapNews(n: any) {
  return {
    id: n.id,
    title: n.headline_es ?? n.title,
    original_title: n.title,
    brief: n.brief_es,
    link: n.link,
    source: n.source_name,
    scope: n.scope,
    impact: n.impact,
    category: n.category,
    assets: JSON.parse(n.assets ?? "[]"),
    bias: n.bias,
    published_at: n.published_at,
    detected_at: n.detected_at,
    image: n.image ?? null,
    cat_img: `/assets/cat-${catSlug(n.category)}.jpg`,
    url: newsPath(n),
    views: n.views ?? 0,
    likes: n.likes ?? 0,
  };
}

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function listNews(env: Env, opts: { realtime: boolean; limit: number; scope?: string; minImpact: number }) {
  const cutoff = opts.realtime ? Date.now() : Date.now() - num(env.FREE_DELAY_MIN, 15) * 60_000;
  const scopeSql = opts.scope === "global" || opts.scope === "nacional" ? "AND scope = ?3" : "AND ?3 IS NULL";
  const q = await env.DB.prepare(
    `SELECT * FROM news WHERE detected_at <= ?1 AND impact >= ?2 ${scopeSql} ORDER BY detected_at DESC LIMIT ?4`,
  ).bind(cutoff, opts.minImpact, opts.scope ?? null, opts.limit).all<any>();
  return q.results.map(mapNews);
}

function rss(env: Env, items: ReturnType<typeof mapNews>[]): string {
  const it = items.map((n) => `<item><title>${esc(n.title)}</title><link>${esc(n.link)}</link><guid isPermaLink="false">${n.id}</guid><pubDate>${new Date(n.detected_at).toUTCString()}</pubDate><description>${esc(n.brief ?? "")}</description><category>${esc(n.category ?? "")}</category></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(env.BRAND)}</title><link>${esc(env.SITE_URL)}</link><description>Noticias que mueven los mercados (con ${num(env.FREE_DELAY_MIN, 15)} min de retraso)</description>${it}</channel></rss>`;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const canon = new URL(env.SITE_URL).hostname;
    if (req.method === "GET" && url.hostname !== canon && (url.hostname.endsWith("workers.dev") || url.hostname === `www.${canon}`) &&
        !/^\/(api|bot|studio|telegram|mp|admin|dl|internal)\b/.test(p)) {
      return Response.redirect(`https://${canon}${p}${url.search}`, 301);
    }

    const page = req.method === "GET" ? SITE[p] : undefined;
    if (page) {
      const body = page.b64 ? Uint8Array.from(atob(page.b64), (c) => c.charCodeAt(0)) : page.body;
      return new Response(body, { headers: { "content-type": page.type, "cache-control": page.b64 ? "public, max-age=86400" : "public, max-age=300" } });
    }

    // Página propia de cada noticia (se comparte con foto y resumen)
    const art = p.match(/^\/n\/([0-9a-f]{32})(?:-[a-z0-9-]*)?$/);
    if (art && req.method === "GET") return articlePage(env, art[1], req, ctx);
    if (p === "/sitemap.xml") return sitemap(env);
    const aff = p.match(/^\/r\/([a-z0-9_]{3,20})$/);
    if (aff) return affiliateRedirect(env, aff[1]);
    if (p === "/dolar-hoy" || p === "/precio-dolar-hoy") return marketPage(env, "dolar");
    if (p === "/bitcoin-hoy" || p === "/precio-bitcoin-hoy") return marketPage(env, "bitcoin");
    if (p === "/robots.txt") return robots(env);
    // Bio de redes (/ig, /tt, /yt), clics por red y guía
    const bio = p.match(/^\/(ig|tt|yt|x|links)$/);
    if (bio && req.method === "GET") return bioPage(env, bio[1] === "links" ? "web" : bio[1], ctx);
    const goTo = p.match(/^\/go\/([a-z]+)$/);
    if (goTo) return go(env, goTo[1], url.searchParams.get("s") ?? "web", ctx);
    // Videos propios (comerciales) guardados en KV, con soporte de Range para reproducir en iPhone/Safari y Telegram
    const media = p.match(/^\/media\/([a-z0-9_-]{6,80})\.mp4$/);
    if (media && (req.method === "GET" || req.method === "HEAD")) {
      const buf = await env.BOT_KV?.get(`media:${media[1]}`, "arrayBuffer");
      if (!buf) return new Response("No encontrado", { status: 404 });
      const size = buf.byteLength, rg = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
      const base = { "content-type": "video/mp4", "accept-ranges": "bytes", "cache-control": "public, max-age=86400", "x-robots-tag": "noindex" };
      if (rg) {
        const start = rg[1] ? +rg[1] : size - +rg[2], end = rg[1] && rg[2] ? Math.min(+rg[2], size - 1) : size - 1;
        if (start >= size || start < 0) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
        return new Response(req.method === "HEAD" ? null : buf.slice(start, end + 1), { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
      }
      return new Response(req.method === "HEAD" ? null : buf, { headers: { ...base, "content-length": String(size) } });
    }
    if (p === "/guia") return guidePage(env);
    if (p === "/cetes-hoy" || p === "/calculadora-cetes") return cetesPage(env, ctx);
    if (p === "/calculadora-inflacion") return inflationPage(env, ctx);
    if (p === "/guia/capitulo-1.pdf" || p === "/guia/guia-basica.pdf") return freeChapter(env);
    const dl = p.match(/^\/dl\/([0-9a-f]{36})\/[a-z0-9_-]+\.(pdf|xlsx)$/);
    if (dl) return download(env, dl[1]);

    // Precio y enlace de Pro (lo usan la web y el bot): fundadores = primeros FOUNDERS_TOTAL suscriptores
    // Kit de contenido del día (noticias verificadas + guion), para la skill de Reels de Instagram/TikTok
    if (p === "/api/kit") {
      const r = await env.DB.prepare("SELECT v FROM flags WHERE k = 'kit:last'").first<{ v: string }>();
      return r
        ? new Response(r.v, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", ...CORS } })
        : json({ error: "todavía no hay kit hoy" }, 404);
    }

    if (p === "/api/videos") {
      const v = await latestVideos(env);
      return json({ channel: env.YT_CHANNEL_ID ? `https://www.youtube.com/channel/${env.YT_CHANNEL_ID}?sub_confirmation=1` : null, videos: v.slice(0, 6) }, 200, { "cache-control": "public, max-age=600" });
    }

    if (p === "/api/pro") {
      const [link, stars, taken] = await Promise.all([
        env.BOT_KV?.get("pro_link"), env.BOT_KV?.get("pro_stars"),
        env.DB.prepare("SELECT COUNT(*) n FROM members WHERE plan IN ('pro', 'api') AND status IN ('authorized', 'cancelled')").first<{ n: number }>(),
      ]);
      const total = num(env.FOUNDERS_TOTAL, 100), used = taken?.n ?? 0;
      const founder = used < total;
      return json({
        link: link ?? null, stars: stars ? Number(stars) : null, founder,
        price_mxn: founder ? num(env.PRICE_FOUNDER_MXN, 99) : num(env.PRICE_MXN, 149),
        regular_mxn: num(env.PRICE_MXN, 149), founders_total: total, founders_left: Math.max(0, total - used),
      }, 200, { "cache-control": "public, max-age=60" });
    }

    // Lo más leído (vistas en las páginas /n/)
    if (p === "/api/top") {
      const q = await env.DB.prepare(
        `SELECT * FROM news WHERE detected_at <= ?1 AND detected_at > ?2 AND impact >= 3
         ORDER BY views DESC, impact DESC, detected_at DESC LIMIT 6`,
      ).bind(Date.now() - num(env.FREE_DELAY_MIN, 15) * 60_000, Date.now() - 3 * 86400_000).all<any>();
      return json({ items: q.results.map(mapNews) }, 200, { "cache-control": "public, max-age=60" });
    }

    // Datos para las gráficas de la portada
    if (p === "/api/chart") {
      const since = Date.now() - 24 * 3600_000;
      const [hours, cats, bias] = await env.DB.batch([
        env.DB.prepare(`SELECT CAST((detected_at - ?1) / 3600000 AS INTEGER) h, COUNT(*) n, SUM(impact >= 4) hot FROM news
                        WHERE detected_at > ?1 AND impact >= 2 GROUP BY h ORDER BY h`).bind(since),
        env.DB.prepare(`SELECT category c, COUNT(*) n FROM news WHERE detected_at > ?1 AND impact >= 3 GROUP BY c ORDER BY n DESC LIMIT 6`).bind(since),
        env.DB.prepare(`SELECT bias b, COUNT(*) n FROM news WHERE detected_at > ?1 AND impact >= 3 AND bias IS NOT NULL GROUP BY b`).bind(since),
      ]);
      return json({ since, hours: hours.results, categories: cats.results, bias: bias.results }, 200, { "cache-control": "public, max-age=120" });
    }

    // Reacciones 👍 / 👎 (una por persona y noticia; no se guarda la IP)
    if (p === "/api/react" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as { id?: string; v?: number };
      if (!b.id || !/^[0-9a-f]{32}$/.test(b.id) || (b.v !== 1 && b.v !== -1)) return json({ error: "inválido" }, 400);
      const who = await sha(`${req.headers.get("cf-connecting-ip") ?? ""}|${req.headers.get("user-agent") ?? ""}|${b.id}`);
      const r = await env.DB.prepare("INSERT OR IGNORE INTO reactions (news_id, who, value) VALUES (?1, ?2, ?3)").bind(b.id, who, b.v).run();
      if (r.meta.changes) await env.DB.prepare(`UPDATE news SET ${b.v === 1 ? "likes = likes + 1" : "dislikes = dislikes + 1"} WHERE id = ?1`).bind(b.id).run();
      const c = await env.DB.prepare("SELECT likes, dislikes FROM news WHERE id = ?1").bind(b.id).first();
      return json({ ...c, counted: !!r.meta.changes });
    }

    if (p.startsWith("/bot/")) return handleBotApi(req, env, p);
    if (p === "/studio/approvals") return studioApi(req, env);

    if (p === "/health") return json({ ok: true, brand: env.BRAND });

    if (p === "/api/news" && req.method === "GET") {
      const plan = await memberFromAuth(req, env);
      const items = await listNews(env, {
        realtime: plan !== null,
        limit: Math.min(num(url.searchParams.get("limit") ?? undefined, 30), 100),
        scope: url.searchParams.get("scope") ?? undefined,
        minImpact: num(url.searchParams.get("min_impact") ?? undefined, 2),
      });
      return json({ realtime: plan !== null, delay_min: plan ? 0 : num(env.FREE_DELAY_MIN, 15), items }, 200,
        { "cache-control": plan ? "no-store" : "public, max-age=30" });
    }

    if (p === "/rss.xml") {
      const items = await listNews(env, { realtime: false, limit: 50, minImpact: 3 });
      return new Response(rss(env, items), { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=60", ...CORS } });
    }

    if (p === "/api/digests") {
      const q = await env.DB.prepare("SELECT id, subject, created_at FROM digests ORDER BY id DESC LIMIT 60").all();
      return json(q.results, 200, { "cache-control": "public, max-age=300" });
    }
    const dm = p.match(/^\/api\/digest\/(\d{4}-\d{2}-\d{2}|latest)$/);
    if (dm) {
      const d = dm[1] === "latest"
        ? await env.DB.prepare("SELECT * FROM digests ORDER BY id DESC LIMIT 1").first()
        : await env.DB.prepare("SELECT * FROM digests WHERE id = ?1").bind(dm[1]).first();
      return d ? json(d, 200, { "cache-control": "public, max-age=300" }) : json({ error: "no encontrada" }, 404);
    }

    if (p === "/api/subscribe" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { email?: string; source?: string };
      const email = body.email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json({ error: "email inválido" }, 400);
      await env.DB.prepare("INSERT OR IGNORE INTO leads (email, created_at, source) VALUES (?1, ?2, ?3)")
        .bind(email, Date.now(), (body.source ?? "web").slice(0, 80)).run();
      return json({ ok: true });
    }

    // Al volver de Mercado Pago: back_url = SITE_URL/gracias.html (llega con ?preapproval_id=…)
    if (p === "/api/acceso") {
      const r = await handleAccess(url, env).catch((e: Error) => {
        console.error("acceso", e.message);
        return Response.json({ error: "no se pudo verificar el pago, intenta en un minuto" }, { status: 503 });
      });
      const h = new Headers(r.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v); h.set("cache-control", "no-store");
      return new Response(r.body, { status: r.status, headers: h });
    }

    if (p === "/mp/webhook" && req.method === "POST") return handleMercadoPago(req, env);
    if (p === "/telegram/chat-member" && req.method === "POST") return handleChatMember(req, env);

    if (p === "/admin/run" && req.method === "POST") {
      if (!env.ADMIN_TOKEN || req.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: "no autorizado" }, 401);
      const task = url.searchParams.get("task");
      if (task === "ingest") return json(await ingest(env));
      if (task === "free") return json({ sent: await flushFreeQueue(env) });
      if (task === "digest") return json(await buildDigest(env));
      if (task === "bot") return json({ updated: await syncBotNoticias(env) });
      if (task === "images") return json(await backfillImages(env));
      if (task === "enrich") return json(await enrichRecent(env, Math.min(num(url.searchParams.get("n") ?? undefined, 10), 30)));
      if (task === "brief") { const n = await morningBriefing(env, true); return json({ queued: n, sent: await flushOutbox(env) }); }
      if (task === "stats") {
        const s = await env.DB.batch([
          env.DB.prepare("SELECT COUNT(*) n FROM news WHERE detected_at > ?1").bind(Date.now() - 86400_000),
          env.DB.prepare("SELECT COUNT(*) n FROM leads"),
          env.DB.prepare("SELECT plan, status, COUNT(*) n FROM members GROUP BY plan, status"),
        ]);
        return json({ news_24h: s[0].results[0], leads: s[1].results[0], members: s[2].results });
      }
      return json({ error: "task = ingest | free | digest | bot | brief | enrich | images | stats" }, 400);
    }

    return json({ error: "no encontrado" }, 404);
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === TREND_CRON) {
      await trendTick(env).catch((e) => console.warn("trend", e));
      return;
    }
    if (event.cron === SCALP_CRON) {
      await scalpTick(env).catch((e) => console.warn("scalp", e));
      return;
    }
    if (event.cron === DIGEST_CRON) {
      ctx.waitUntil(buildDigest(env));
      return;
    }
    const r = await ingest(env);
    if (r.errors.length) console.warn("ingest errors", r.errors);
    await flushFreeQueue(env).catch((e) => console.warn("free queue", e));
    await proTick(env);
    if (new Date(event.scheduledTime).getUTCMinutes() === 0) await syncBotNoticias(env).catch((e) => console.warn("bot noticias", e));
    if (new Date(event.scheduledTime).getUTCMinutes() % 15 === 7) await syncYouTube(env).catch((e) => console.warn("youtube", e));
  },
} satisfies ExportedHandler<Env>;

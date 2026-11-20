import { buildDigest } from "./digest";
import { num, type Env } from "./env";
import { backfillImages, enrichRecent, flushFreeQueue, ingest, syncBotNoticias } from "./ingest";
import { handleAccess, handleChatMember, handleMercadoPago } from "./payments";
import { flushOutbox, handleBotApi, morningBriefing, proTick } from "./pro";
import { articlePage, catSlug, newsPath, robots, sitemap } from "./pages";
import { marketPage } from "./seo";
import { SITE } from "./site-files";
import { esc } from "./telegram";

const DIGEST_CRON = "17 11 * * 1-5"; // debe coincidir con wrangler.toml

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

    const page = req.method === "GET" ? SITE[p] : undefined;
    if (page) {
      const body = page.b64 ? Uint8Array.from(atob(page.b64), (c) => c.charCodeAt(0)) : page.body;
      return new Response(body, { headers: { "content-type": page.type, "cache-control": page.b64 ? "public, max-age=86400" : "public, max-age=300" } });
    }

    // Página propia de cada noticia (se comparte con foto y resumen)
    const art = p.match(/^\/n\/([0-9a-f]{32})(?:-[a-z0-9-]*)?$/);
    if (art && req.method === "GET") return articlePage(env, art[1], req, ctx);
    if (p === "/sitemap.xml") return sitemap(env);
    if (p === "/dolar-hoy" || p === "/precio-dolar-hoy") return marketPage(env, "dolar");
    if (p === "/bitcoin-hoy" || p === "/precio-bitcoin-hoy") return marketPage(env, "bitcoin");
    if (p === "/robots.txt") return robots(env);

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
    if (event.cron === DIGEST_CRON) {
      ctx.waitUntil(buildDigest(env));
      return;
    }
    const r = await ingest(env);
    if (r.errors.length) console.warn("ingest errors", r.errors);
    await flushFreeQueue(env).catch((e) => console.warn("free queue", e));
    await proTick(env);
    if (new Date(event.scheduledTime).getUTCMinutes() === 0) await syncBotNoticias(env).catch((e) => console.warn("bot noticias", e));
  },
} satisfies ExportedHandler<Env>;

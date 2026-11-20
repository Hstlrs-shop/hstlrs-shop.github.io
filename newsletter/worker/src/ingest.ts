// Pipeline cada minuto: leer fuentes → deduplicar → puntuar → IA → guardar → alertar.

import { analyze, type Analysis, type Candidate } from "./ai";
import { num, type Env } from "./env";
import { parseFeed, type FeedItem } from "./rss";
import { fingerprint, scoreItem } from "./scoring";
import { sourcesFor, type Source } from "./sources";
import { formatAlert, sendMessage } from "./telegram";

const UA = "Mozilla/5.0 (compatible; PulsoNewsBot/1.0)";
const MAX_AGE_MS = 36 * 3600 * 1000;   // ignoramos noticias viejas
const MAX_AI_PER_RUN = 20;
const MAX_PRO_ALERTS_PER_RUN = 8;       // Telegram limita ~20 msg/min por canal

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const normLink = (l: string) => l.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();

/** Descarga un feed usando ETag/Last-Modified: si no cambió, cuesta casi nada. */
async function fetchSource(env: Env, s: Source): Promise<{ items: FeedItem[]; firstRun: boolean }> {
  const metaKey = `feedmeta:${s.id}`;
  const meta = (await env.CACHE.get<{ etag?: string; lm?: string }>(metaKey, "json")) ?? null;
  const headers: Record<string, string> = { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" };
  if (meta?.etag) headers["if-none-match"] = meta.etag;
  if (meta?.lm) headers["if-modified-since"] = meta.lm;

  const res = await fetch(s.url, { headers, signal: AbortSignal.timeout(8000), cf: { cacheTtl: 0 } });
  if (res.status === 304) return { items: [], firstRun: false };
  if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status}`);
  const xml = await res.text();
  await env.CACHE.put(metaKey, JSON.stringify({ etag: res.headers.get("etag") ?? undefined, lm: res.headers.get("last-modified") ?? undefined }));
  return { items: parseFeed(xml), firstRun: meta === null };
}

interface Row {
  id: string; fp: string; s: Source; item: FeedItem; score: number; category: string; impact: number;
  ai?: Analysis; silent: boolean;
}

export async function ingest(env: Env): Promise<{ fetched: number; inserted: number; alerted: number; errors: string[] }> {
  const now = Date.now();
  const sources = sourcesFor(env.COUNTRY);
  const results = await Promise.allSettled(sources.map((s) => fetchSource(env, s)));
  const errors: string[] = [];
  const raw: { s: Source; item: FeedItem; firstRun: boolean }[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") errors.push(String(r.reason));
    else for (const item of r.value.items) if (now - item.publishedAt < MAX_AGE_MS) raw.push({ s: sources[i], item, firstRun: r.value.firstRun });
  });

  // 1) Deduplicar por enlace (ya vistos en BD) y por titular (misma noticia, otra fuente)
  const withIds = await Promise.all(raw.map(async (r) => ({ ...r, id: await sha256(normLink(r.item.link)), fp: fingerprint(r.item.title) })));
  const known = new Set<string>();
  for (let i = 0; i < withIds.length; i += 45) { // D1: máx. 100 parámetros por consulta (45 ids + 45 huellas)
    const chunk = withIds.slice(i, i + 45);
    const q = await env.DB.prepare(`SELECT id, fingerprint FROM news WHERE id IN (${chunk.map(() => "?").join(",")}) OR fingerprint IN (${chunk.map(() => "?").join(",")})`)
      .bind(...chunk.map((c) => c.id), ...chunk.map((c) => c.fp)).all<{ id: string; fingerprint: string }>();
    for (const row of q.results) { known.add(row.id); known.add("fp:" + row.fingerprint); }
  }
  const rows: Row[] = [];
  for (const r of withIds) {
    if (known.has(r.id) || known.has("fp:" + r.fp)) continue;
    known.add(r.id); known.add("fp:" + r.fp);
    const sc = scoreItem(r.item.title, r.item.summary, r.s);
    // Primera lectura de una fuente: se guarda sin alertar para no inundar el canal
    rows.push({ id: r.id, fp: r.fp, s: r.s, item: r.item, ...sc, silent: r.firstRun });
  }

  // 2) IA solo para lo que pinta relevante (las oficiales y urgentes primero)
  const minScore = num(env.AI_MIN_SCORE, 45);
  const forAi = rows.filter((r) => !r.silent && r.score >= minScore).sort((a, b) => b.score - a.score).slice(0, MAX_AI_PER_RUN);
  for (let i = 0; i < forAi.length; i += 10) {
    const batch: Candidate[] = forAi.slice(i, i + 10).map((r) => ({ id: r.id, title: r.item.title, summary: r.item.summary.slice(0, 300), source: r.s.name, scope: r.s.scope }));
    try {
      const out = await analyze(env, batch);
      for (const a of out) { const row = rows.find((r) => r.id === a.id); if (row) row.ai = a; }
    } catch (e) {
      errors.push(`IA: ${(e as Error).message}`);
    }
  }

  // 3) Guardar
  const stmts = rows.map((r) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO news (id, fingerprint, source_id, source_name, tier, scope, title, link, summary, published_at, detected_at, score, impact, category, assets, bias, headline_es, brief_es, ai, alerted_pro, alerted_free)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      r.id, r.fp, r.s.id, r.s.name, r.s.tier, r.s.scope, r.item.title, r.item.link, r.item.summary,
      r.item.publishedAt, now, r.score, r.ai?.impact ?? r.impact, r.ai?.category ?? r.category,
      JSON.stringify(r.ai?.assets ?? []), r.ai?.bias ?? null, r.ai?.headline_es ?? null, r.ai?.brief_es ?? null,
      r.ai ? 1 : 0, r.silent ? 1 : 0, r.silent ? 1 : 0,
    ),
  );
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  // 4) Alerta instantánea al canal Pro
  const proMin = num(env.PRO_MIN_IMPACT, 4);
  const toAlert = rows
    .filter((r) => !r.silent && (r.ai?.impact ?? r.impact) >= proMin)
    .sort((a, b) => (b.ai?.impact ?? b.impact) - (a.ai?.impact ?? a.impact) || b.score - a.score)
    .slice(0, MAX_PRO_ALERTS_PER_RUN);
  let alerted = 0;
  for (const r of toAlert) {
    try {
      await sendMessage(env, env.TELEGRAM_PRO_CHAT, formatAlert({
        headline: r.ai?.headline_es ?? r.item.title, brief: r.ai?.brief_es, link: r.item.link, source: r.s.name,
        impact: r.ai?.impact ?? r.impact, bias: r.ai?.bias, assets: r.ai?.assets, scope: r.s.scope,
      }, { pro: true, brand: env.BRAND, siteUrl: env.SITE_URL }));
      await env.DB.prepare("UPDATE news SET alerted_pro = 1 WHERE id = ?").bind(r.id).run();
      alerted++;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return { fetched: raw.length, inserted: rows.length, alerted, errors };
}

/** Canal gratuito: las noticias más fuertes, con retraso. Es el gancho para vender Pro. */
export async function flushFreeQueue(env: Env): Promise<number> {
  const now = Date.now();
  const delay = num(env.FREE_DELAY_MIN, 15) * 60_000;
  const q = await env.DB.prepare(
    `SELECT * FROM news WHERE alerted_free = 0 AND impact >= ?1 AND detected_at <= ?2 AND detected_at > ?3
     ORDER BY impact DESC, score DESC LIMIT 3`,
  ).bind(num(env.FREE_MIN_IMPACT, 4), now - delay, now - 3 * 3600_000).all<any>();
  let sent = 0;
  for (const n of q.results) {
    await sendMessage(env, env.TELEGRAM_FREE_CHAT, formatAlert({
      headline: n.headline_es ?? n.title, brief: n.brief_es, link: n.link, source: n.source_name,
      impact: n.impact, scope: n.scope,
    }, { pro: false, brand: env.BRAND, siteUrl: env.SITE_URL }), true);
    await env.DB.prepare("UPDATE news SET alerted_free = 1 WHERE id = ?").bind(n.id).run();
    sent++;
  }
  return sent;
}

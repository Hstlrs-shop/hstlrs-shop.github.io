// Pipeline cada minuto: leer fuentes → deduplicar → puntuar → IA → guardar → alertar.

import { analyze, type Analysis, type Candidate } from "./ai";
import { num, type Env } from "./env";
import { parseFeed, type FeedItem } from "./rss";
import { fingerprint, scoreItem } from "./scoring";
import { sourcesFor, type Source } from "./sources";
import { queueRadar } from "./pro";
import { newsPath } from "./pages";
import { sameStory } from "./textutil";
import { esc, proChatId, sendAlert } from "./telegram";

const UA = "Mozilla/5.0 (compatible; LanaConCafeBot/1.0)";
const MAX_AGE_MS = 36 * 3600 * 1000;   // ignoramos noticias viejas
const MAX_AI_PER_RUN = 30;
const MAX_PRO_ALERTS_PER_RUN = 8;       // Telegram limita ~20 msg/min por canal

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const normLink = (l: string) => l.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();

/** Descarga un feed usando ETag/Last-Modified: si no cambió, cuesta casi nada.
 *  El estado vive en D1 (el plan gratuito de KV solo permite 1.000 escrituras/día). */
async function fetchSource(env: Env, s: Source): Promise<{ items: FeedItem[]; firstRun: boolean }> {
  const meta = await env.DB.prepare("SELECT etag, last_modified FROM feeds WHERE id = ?1").bind(s.id)
    .first<{ etag: string | null; last_modified: string | null }>();
  const headers: Record<string, string> = { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" };
  if (meta?.etag) headers["if-none-match"] = meta.etag;
  if (meta?.last_modified) headers["if-modified-since"] = meta.last_modified;

  const res = await fetch(s.url, { headers, signal: AbortSignal.timeout(8000), cf: { cacheTtl: 0 } });
  if (res.status === 304) return { items: [], firstRun: false };
  if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status}`);
  const xml = await res.text();
  const etag = res.headers.get("etag"), lm = res.headers.get("last-modified");
  if (!meta || meta.etag !== etag || meta.last_modified !== lm) {
    await env.DB.prepare("INSERT OR REPLACE INTO feeds (id, etag, last_modified, updated_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(s.id, etag, lm, Date.now()).run();
  }
  return { items: parseFeed(xml), firstRun: meta === null };
}

/** Actualiza la clave "noticias" del KV de tu bot para que /noticias se llene solo. */
export async function syncBotNoticias(env: Env): Promise<boolean> {
  if (env.BOT_NOTICIAS !== "1" || !env.BOT_KV) return false;
  const q = await env.DB.prepare(
    `SELECT id, title, headline_es, brief_es, link, source_name FROM news
     WHERE detected_at > ?1 AND impact >= 3 ORDER BY impact DESC, score DESC LIMIT 5`,
  ).bind(Date.now() - 24 * 3600_000).all<any>();
  if (q.results.length === 0) return false;
  const lineas = q.results.map((n, i) =>
    `${i + 1}. <b>${esc(n.headline_es ?? n.title)}</b>${n.brief_es ? `\n${esc(n.brief_es)}` : ""}\n<a href="${esc(env.SITE_URL + newsPath(n))}">Leer en Lana con Café</a> · <a href="${esc(n.link)}">${esc(n.source_name)}</a>`);
  await env.BOT_KV.put("noticias", `<b>☕ Las 5 noticias que mueven el mercado</b>\n\n${lineas.join("\n\n")}\n\n<i>Información, no asesoría financiera.</i>`);
  return true;
}

interface Row {
  id: string; fp: string; s: Source; item: FeedItem; score: number; category: string; impact: number;
  ai?: Analysis; silent: boolean;
}

export async function ingest(env: Env): Promise<{ fetched: number; inserted: number; alerted: number; errors: string[] }> {
  const now = Date.now();
  // Plan gratuito = 10 ms de CPU por ejecución: las fuentes oficiales (pequeñas y las
  // más rápidas) cada minuto; el resto, repartido en turnos de ROTATE minutos.
  const rotate = Math.max(1, num(env.ROTATE, 3));
  const turn = Math.floor(now / 60_000) % rotate;
  const minute = Math.floor(now / 60_000);
  const sources = sourcesFor(env.COUNTRY).filter((s, i) =>
    s.every ? minute % s.every === i % s.every : s.tier === "oficial" || i % rotate === turn);
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
  const minScore = num(env.AI_MIN_SCORE, 25);
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
      `INSERT OR IGNORE INTO news (id, fingerprint, source_id, source_name, tier, scope, title, link, summary, published_at, detected_at, score, impact, category, assets, bias, headline_es, brief_es, ai, alerted_pro, alerted_free, image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      r.id, r.fp, r.s.id, r.s.name, r.s.tier, r.s.scope, r.item.title, r.item.link, r.item.summary,
      r.item.publishedAt, now, r.score, r.ai?.impact ?? r.impact, r.ai?.category ?? r.category,
      JSON.stringify(r.ai?.assets ?? []), r.ai?.bias ?? null, r.ai?.headline_es ?? null, r.ai?.brief_es ?? null,
      r.ai ? 1 : 0, r.silent ? 1 : 0, r.silent ? 1 : 0, r.item.image,
    ),
  );
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  // 4) Radar personal de cada usuario (DM por el bot; Pro al instante, gratis con retraso)
  try {
    await queueRadar(env, rows.filter((r) => !r.silent).map((r) => ({
      id: r.id, title: r.item.title, summary: r.item.summary, headline_es: r.ai?.headline_es, brief_es: r.ai?.brief_es,
      link: r.item.link, source: r.s.name, impact: r.ai?.impact ?? r.impact,
    })));
  } catch (e) {
    errors.push(`radar: ${(e as Error).message}`);
  }

  // 5) Alerta instantánea al canal Pro (solo noticias revisadas por la IA, salvo HEURISTIC_ALERTS = "1")
  const proMin = num(env.PRO_MIN_IMPACT, 3);
  const proChat = await proChatId(env);
  const proReady = !!proChat;
  const toAlert = rows
    .filter((r) => proReady && !r.silent && (r.ai || env.HEURISTIC_ALERTS === "1") && (r.ai?.impact ?? r.impact) >= proMin)
    .sort((a, b) => (b.ai?.impact ?? b.impact) - (a.ai?.impact ?? a.impact) || b.score - a.score)
    .slice(0, MAX_PRO_ALERTS_PER_RUN);
  let alerted = 0;
  const proRecent = toAlert.length ? await recentHeadlines(env, "alerted_pro", now) : [];
  for (const r of toAlert) {
    const head = r.ai?.headline_es ?? r.item.title;
    if (proRecent.some((t) => sameStory(t, head))) {
      await env.DB.prepare("UPDATE news SET alerted_pro = 1 WHERE id = ?").bind(r.id).run(); // misma historia ya publicada
      continue;
    }
    proRecent.push(head);
    try {
      await sendAlert(env, proChat!, {
        id: r.id, title: r.item.title, image: r.item.image, category: r.ai?.category ?? r.category,
        headline: r.ai?.headline_es ?? r.item.title, brief: r.ai?.brief_es, link: r.item.link, source: r.s.name,
        impact: r.ai?.impact ?? r.impact, bias: r.ai?.bias, assets: r.ai?.assets, scope: r.s.scope,
      }, { pro: true });
      await env.DB.prepare("UPDATE news SET alerted_pro = 1 WHERE id = ?").bind(r.id).run();
      alerted++;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return { fetched: raw.length, inserted: rows.length, alerted, errors };
}

/** Titulares ya publicados en un canal en las últimas 12 h (para no repetir historias). */
async function recentHeadlines(env: Env, col: "alerted_free" | "alerted_pro", now: number): Promise<string[]> {
  const q = await env.DB.prepare(
    `SELECT COALESCE(headline_es, title) t FROM news WHERE ${col} = 1 AND ai = 1 AND impact >= 3 AND detected_at > ?1 ORDER BY detected_at DESC LIMIT 40`,
  ).bind(now - 12 * 3600_000).all<{ t: string }>();
  return q.results.map((r) => r.t);
}

/** Canal gratuito: las noticias más fuertes, con retraso. Es el gancho para vender Pro. */
export async function flushFreeQueue(env: Env): Promise<number> {
  const now = Date.now();
  const delay = num(env.FREE_DELAY_MIN, 15) * 60_000;
  // Ritmo del canal gratis: máx. FREE_DAILY_MAX al día y una cada FREE_GAP_MIN (impacto 5 no espera)
  const day = new Date(now - 6 * 3600_000).toISOString().slice(0, 10);
  const [cnt, last] = await env.DB.batch([
    env.DB.prepare("SELECT v FROM flags WHERE k = ?1").bind(`free:${day}`),
    env.DB.prepare("SELECT v FROM flags WHERE k = 'free:last'"),
  ]);
  const sentToday = Number((cnt.results[0] as any)?.v ?? 0);
  if (sentToday >= num(env.FREE_DAILY_MAX, 8)) return 0;
  const gapOk = now - Number((last.results[0] as any)?.v ?? 0) >= num(env.FREE_GAP_MIN, 40) * 60_000;
  const q = await env.DB.prepare(
    `SELECT * FROM news WHERE alerted_free = 0 AND impact >= ?1 AND detected_at <= ?2 AND detected_at > ?3
       AND (ai = 1 OR ?4 = 1) AND (impact >= 5 OR ?5 = 1)
     ORDER BY impact DESC, score DESC LIMIT 10`,
  ).bind(num(env.FREE_MIN_IMPACT, 3), now - delay, now - 3 * 3600_000, env.HEURISTIC_ALERTS === "1" ? 1 : 0, gapOk ? 1 : 0).all<any>();
  // No repetir la misma historia contada por otro medio (últimas 12 h)
  const recent = await recentHeadlines(env, "alerted_free", now);
  const pick = q.results.find((n) => !recent.some((t) => sameStory(t, n.headline_es ?? n.title)));
  const dupes = q.results.filter((n) => n !== pick && recent.some((t) => sameStory(t, n.headline_es ?? n.title)));
  if (dupes.length) await env.DB.batch(dupes.map((d) => env.DB.prepare("UPDATE news SET alerted_free = 1 WHERE id = ?").bind(d.id)));
  let sent = 0;
  for (const n of pick ? [pick] : []) {
    await sendAlert(env, env.TELEGRAM_FREE_CHAT, {
      id: n.id, title: n.title, image: n.image, category: n.category,
      headline: n.headline_es ?? n.title, brief: n.brief_es, link: n.link, source: n.source_name,
      impact: n.impact, scope: n.scope,
    }, { pro: false }, true);
    await env.DB.batch([
      env.DB.prepare("UPDATE news SET alerted_free = 1 WHERE id = ?").bind(n.id),
      env.DB.prepare("INSERT INTO flags (k, v) VALUES (?1, '1') ON CONFLICT(k) DO UPDATE SET v = CAST(v AS INTEGER) + 1").bind(`free:${day}`),
      env.DB.prepare("INSERT INTO flags (k, v) VALUES ('free:last', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1").bind(String(now)),
    ]);
    sent++;
  }
  return sent;
}

/** Pasa por la IA noticias recientes que entraron sin revisar (p. ej. antes de configurar la clave). */
export async function enrichRecent(env: Env, limit = 10): Promise<{ analyzed: number }> {
  const q = await env.DB.prepare(
    `SELECT id, title, summary, source_name, scope FROM news WHERE ai = 0 AND score >= ?1 AND detected_at > ?2
     ORDER BY score DESC LIMIT ?3`,
  ).bind(num(env.AI_MIN_SCORE, 45), Date.now() - 24 * 3600_000, limit).all<any>();
  const out = await analyze(env, q.results.map((n) => ({ id: n.id, title: n.title, summary: (n.summary ?? "").slice(0, 300), source: n.source_name, scope: n.scope })));
  for (const a of out) {
    await env.DB.prepare(
      // alerted_free = 1: no publicar en el canal noticias que ya tienen horas
      "UPDATE news SET impact=?2, category=?3, assets=?4, bias=?5, headline_es=?6, brief_es=?7, ai=1, alerted_free=1, alerted_pro=1 WHERE id=?1",
    ).bind(a.id, a.impact, a.category, JSON.stringify(a.assets), a.bias, a.headline_es, a.brief_es).run();
  }
  return { analyzed: out.length };
}

/** Rellena la foto de noticias ya guardadas (una vez, tras añadir la columna image). */
export async function backfillImages(env: Env): Promise<{ updated: number }> {
  const sources = sourcesFor(env.COUNTRY).filter((s) => !s.every);
  let updated = 0;
  for (const s of sources) {
    try {
      const res = await fetch(s.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const items = parseFeed(await res.text()).filter((i) => i.image);
      const stmts = await Promise.all(items.map(async (i) =>
        env.DB.prepare("UPDATE news SET image = ?2 WHERE id = ?1 AND image IS NULL").bind(await sha256(normLink(i.link)), i.image)));
      for (let k = 0; k < stmts.length; k += 50) {
        const r = await env.DB.batch(stmts.slice(k, k + 50));
        updated += r.reduce((a, x) => a + (x.meta.changes ?? 0), 0);
      }
    } catch { /* fuente caída: se ignora */ }
  }
  return { updated };
}

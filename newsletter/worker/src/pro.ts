// Funciones Pro del bot: radar personal, IA "Pregúntale a Lana", briefing de las
// 7:00, recordatorios de agenda, termómetro del mercado, pruebas y referidos.
// El bot llama a estas rutas por service binding (/bot/*) con INTERNAL_SECRET.

import { answerQuestion } from "./ai";
import { num, type Env } from "./env";
import { newsPath } from "./pages";
import { askLink, esc, proChatId, tgCall } from "./telegram";
import { matchesTerm, normalize, parseCdmx, validTerm } from "./textutil";

const DAY = 86_400_000;
const CDMX_OFFSET = 6 * 3600_000; // Centro de México: UTC−6 todo el año

export type Plan = "pro" | "api" | "prueba" | "gratis";

// asks: preguntas rápidas al día (modelo rápido, muy barato). deep: /analiza al día (modelo profundo).
export const LIMITS: Record<Plan, { radar: number; asks: number; deep: number; radarDelayMin: number }> = {
  api: { radar: 25, asks: 200, deep: 10, radarDelayMin: 0 },
  pro: { radar: 10, asks: 100, deep: 5, radarDelayMin: 0 },
  prueba: { radar: 10, asks: 30, deep: 2, radarDelayMin: 0 },
  gratis: { radar: 1, asks: 5, deep: 0, radarDelayMin: 15 },
};
const MEMORY_MS = 2 * 3600_000; // la conversación se olvida tras 2 h sin preguntar

export const cdmxDay = (ms = Date.now()) => new Date(ms - CDMX_OFFSET).toISOString().slice(0, 10);

// ---------- Planes ----------
async function proSets(env: Env): Promise<{ paid: Map<number, Plan>; trial: Map<number, number> }> {
  const now = Date.now();
  const [m, t] = await env.DB.batch([
    env.DB.prepare("SELECT telegram_user_id tg, plan FROM members WHERE status = 'authorized' AND telegram_user_id IS NOT NULL"),
    env.DB.prepare("SELECT tg, until FROM trials WHERE until > ?1").bind(now),
  ]);
  const paid = new Map<number, Plan>((m.results as any[]).map((r) => [Number(r.tg), r.plan === "api" ? "api" : "pro"]));
  const trial = new Map<number, number>((t.results as any[]).map((r) => [Number(r.tg), Number(r.until)]));
  return { paid, trial };
}

export async function planOf(env: Env, tg: number): Promise<{ plan: Plan; until: number | null }> {
  const m = await env.DB.prepare("SELECT plan FROM members WHERE telegram_user_id = ?1 AND status = 'authorized' LIMIT 1").bind(tg).first<{ plan: string }>();
  if (m) return { plan: m.plan === "api" ? "api" : "pro", until: null };
  const t = await env.DB.prepare("SELECT until FROM trials WHERE tg = ?1 AND until > ?2").bind(tg, Date.now()).first<{ until: number }>();
  if (t) return { plan: "prueba", until: t.until };
  return { plan: "gratis", until: null };
}

async function extendTrial(env: Env, tg: number, ms: number, markUsed = false): Promise<number> {
  const now = Date.now();
  const cur = await env.DB.prepare("SELECT until FROM trials WHERE tg = ?1").bind(tg).first<{ until: number }>();
  const until = Math.max(now, cur?.until ?? 0) + ms;
  await env.DB.prepare(
    `INSERT INTO trials (tg, until, used_trial) VALUES (?1, ?2, ?3)
     ON CONFLICT(tg) DO UPDATE SET until = ?2, used_trial = MAX(used_trial, ?3)`,
  ).bind(tg, until, markUsed ? 1 : 0).run();
  return until;
}

// ---------- Cola de salida ----------
export async function enqueue(env: Env, chatIds: (string | number)[], text: string, delayMin = 0) {
  const now = Date.now();
  const stmts = chatIds.map((c) =>
    env.DB.prepare("INSERT INTO outbox (chat_id, text, send_after, created_at) VALUES (?1, ?2, ?3, ?4)").bind(String(c), text, now + delayMin * 60_000, now));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
}

/** Envía hasta `max` mensajes pendientes (el plan gratuito permite ~50 subpeticiones por ejecución). */
export async function flushOutbox(env: Env, max = 20): Promise<number> {
  const q = await env.DB.prepare("SELECT id, chat_id, text, created_at FROM outbox WHERE send_after <= ?1 ORDER BY id LIMIT ?2")
    .bind(Date.now(), max).all<{ id: number; chat_id: string; text: string; created_at: number }>();
  let sent = 0;
  const done: number[] = [];
  for (const m of q.results) {
    try {
      await tgCall(env, "sendMessage", { chat_id: m.chat_id, text: m.text, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
      sent++;
      done.push(m.id);
    } catch (e) {
      const msg = (e as Error).message;
      // Usuario bloqueó el bot / chat inexistente / mensaje viejo: se descarta
      if (/forbidden|blocked|not found|deactivated|parse entities/i.test(msg) || Date.now() - m.created_at > DAY) done.push(m.id);
      else console.warn("outbox", msg);
    }
  }
  if (done.length) await env.DB.prepare(`DELETE FROM outbox WHERE id IN (${done.map(() => "?").join(",")})`).bind(...done).run();
  return sent;
}

// ---------- Radar personal ----------
export interface RadarItem { id: string; title: string; summary: string; headline_es?: string | null; brief_es?: string | null; link: string; source: string; impact: number }

/** Llamado por la ingesta con las noticias nuevas: avisa a quien sigue esos temas. */
export async function queueRadar(env: Env, items: RadarItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const all = await env.DB.prepare("SELECT tg, term, label FROM watch ORDER BY created_at").all<{ tg: number; term: string; label: string }>();
  if (all.results.length === 0) return 0;
  const { paid, trial } = await proSets(env);
  // Si alguien deja de ser Pro, conserva sus temas pero solo funcionan los que permite su plan actual
  const used = new Map<number, number>();
  const w = { results: all.results.filter((r) => {
    const plan: Plan = paid.get(r.tg) ?? (trial.has(r.tg) ? "prueba" : "gratis");
    const n = (used.get(r.tg) ?? 0) + 1;
    used.set(r.tg, n);
    return n <= LIMITS[plan].radar;
  }) };
  let queued = 0;
  for (const it of items) {
    const text = normalize(`${it.title} ${it.summary} ${it.headline_es ?? ""}`);
    const hits = new Map<number, string[]>();
    for (const r of w.results) if (matchesTerm(text, r.term)) hits.set(r.tg, [...(hits.get(r.tg) ?? []), r.label]);
    for (const [tg, labels] of hits) {
      const plan: Plan = paid.get(tg) ?? (trial.has(tg) ? "prueba" : "gratis");
      const delay = LIMITS[plan].radarDelayMin;
      const askUrl = await askLink(env, it.id);
      const msg = `🎯 <b>Tu radar: ${esc(labels.join(", "))}</b>\n\n<b>${esc(it.headline_es ?? it.title)}</b>` +
        (it.brief_es ? `\n${esc(it.brief_es)}` : "") +
        `\n\n☕ <a href="${esc(env.SITE_URL + newsPath({ id: it.id, headline_es: it.headline_es, title: it.title }))}">Leer en Lana con Café</a> · <a href="${esc(it.link)}">${esc(it.source)}</a>` +
        (askUrl ? `\n🤖 <a href="${esc(askUrl)}">¿Qué significa para mí?</a>` : "") +
        (delay ? `\n\n⏱ Te llegó con ${delay} min de retraso. Con <b>Pro</b> llega al instante → /pro` : "");
      await enqueue(env, [tg], msg, delay);
      queued++;
    }
  }
  return queued;
}

async function radarOp(env: Env, tg: number, op: string, raw: string) {
  const { plan } = await planOf(env, tg);
  const limit = LIMITS[plan].radar;
  if (op === "add") {
    const term = validTerm(raw);
    if (!term) return { error: "Usa de 2 a 30 letras o números. Ejemplos: peso, banxico, nvidia, cetes, pemex" };
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM watch WHERE tg = ?1").bind(tg).first<{ n: number }>();
    if ((n?.n ?? 0) >= limit) return { error: `Tu plan (${plan}) permite ${limit} tema${limit === 1 ? "" : "s"} en el radar.`, upsell: plan === "gratis" };
    await env.DB.prepare("INSERT OR IGNORE INTO watch (tg, term, label, created_at) VALUES (?1, ?2, ?3, ?4)").bind(tg, term, raw.trim().slice(0, 30), Date.now()).run();
  } else if (op === "del") {
    const term = validTerm(raw);
    if (term) await env.DB.prepare("DELETE FROM watch WHERE tg = ?1 AND term = ?2").bind(tg, term).run();
  }
  const list = await env.DB.prepare("SELECT label FROM watch WHERE tg = ?1 ORDER BY created_at").bind(tg).all<{ label: string }>();
  return { plan, limit, terms: list.results.map((r) => r.label), delay: LIMITS[plan].radarDelayMin };
}

// ---------- IA ----------
async function ask(env: Env, tg: number, q: string, opts: { deep?: boolean; newsId?: string } = {}) {
  const deep = !!opts.deep;
  let question = q.trim().slice(0, 600);
  const focusRow = opts.newsId && /^[0-9a-f]{32}$/.test(opts.newsId)
    ? await env.DB.prepare("SELECT * FROM news WHERE id = ?1").bind(opts.newsId).first<any>()
    : null;
  if (opts.newsId && !focusRow) return { error: "Esa noticia ya no está disponible. Pregúntame lo que quieras sobre el mercado." };
  if (!question && focusRow) question = "¿Qué significa esta noticia para mí y para mi dinero?";
  if (question.length < 3) return { error: deep ? "Escribe qué quieres analizar. Ej.: /analiza ¿cómo afecta la decisión de Banxico a los Cetes?" : "Escríbeme tu pregunta. Ej.: ¿por qué sube el dólar hoy?" };

  const { plan } = await planOf(env, tg);
  const today = cdmxDay();
  const dayKey = deep ? `${today}:deep` : today;
  const used = (await env.DB.prepare("SELECT n FROM usage WHERE tg = ?1 AND day = ?2").bind(tg, dayKey).first<{ n: number }>())?.n ?? 0;
  const limit = deep ? LIMITS[plan].deep : LIMITS[plan].asks;
  if (used >= limit) {
    return deep && limit === 0
      ? { error: "/analiza (análisis profundo) es para Pro. Mientras, escríbeme tu pregunta normal y te respondo.", upsell: true }
      : { error: `Llegaste a tus ${limit} ${deep ? "análisis" : "preguntas"} de hoy (plan ${plan}). Mañana se reinicia.`, upsell: plan === "gratis" || plan === "prueba" };
  }
  if (!env.ANTHROPIC_API_KEY) return { error: "La IA se está configurando. Vuelve a intentarlo pronto ☕" };

  const now = Date.now();
  const [newsQ, radarQ, histQ] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, title, headline_es, brief_es, source_name, link FROM news WHERE detected_at > ?1 AND impact >= 2 AND id != ?2
       ORDER BY impact DESC, score DESC LIMIT ?3`,
    ).bind(now - (deep ? 72 : 36) * 3600_000, opts.newsId ?? "", deep ? 60 : 30),
    env.DB.prepare("SELECT label FROM watch WHERE tg = ?1 ORDER BY created_at LIMIT ?2").bind(tg, LIMITS[plan].radar),
    env.DB.prepare("SELECT role, text FROM convo WHERE tg = ?1 AND at > ?2 ORDER BY id DESC LIMIT 6").bind(tg, now - MEMORY_MS),
  ]);
  const news = newsQ.results as any[];
  const history = (histQ.results as { role: "user" | "assistant"; text: string }[]).reverse();
  // La conversación debe empezar con el usuario y alternar turnos
  while (history.length && history[0].role !== "user") history.shift();

  const answer = await answerQuestion(env, {
    question, deep, history,
    news: news.map((n) => ({ title: n.headline_es ?? n.title, brief: n.brief_es, source: n.source_name })),
    focus: focusRow ? { title: focusRow.headline_es ?? focusRow.title, brief: focusRow.brief_es ?? focusRow.summary, source: focusRow.source_name, assets: JSON.parse(focusRow.assets ?? "[]"), bias: focusRow.bias } : null,
    radar: (radarQ.results as any[]).map((r) => r.label),
  });
  if (!answer) return { error: "No pude responder ahora. Intenta en un minuto." };

  await env.DB.batch([
    env.DB.prepare("INSERT INTO usage (tg, day, n) VALUES (?1, ?2, 1) ON CONFLICT(tg, day) DO UPDATE SET n = n + 1").bind(tg, dayKey),
    env.DB.prepare("INSERT INTO convo (tg, role, text, at) VALUES (?1, 'user', ?2, ?3)").bind(tg, (focusRow ? `[Sobre: ${focusRow.headline_es ?? focusRow.title}] ` : "") + question, now),
    env.DB.prepare("INSERT INTO convo (tg, role, text, at) VALUES (?1, 'assistant', ?2, ?3)").bind(tg, answer.slice(0, 1500), now + 1),
    env.DB.prepare("DELETE FROM convo WHERE tg = ?1 AND id NOT IN (SELECT id FROM convo WHERE tg = ?1 ORDER BY id DESC LIMIT 6)").bind(tg),
  ]);

  const cited = [...new Set([...answer.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])))].filter((i) => news[i - 1]).slice(0, 4);
  const links = [
    ...(focusRow ? [`☕ <a href="${esc(env.SITE_URL + newsPath(focusRow))}">${esc(focusRow.headline_es ?? focusRow.title)}</a>`] : []),
    ...cited.map((i) => `[${i}] <a href="${esc(env.SITE_URL + newsPath(news[i - 1]))}">${esc(news[i - 1].headline_es ?? news[i - 1].title)}</a> · ${esc(news[i - 1].source_name)}`),
  ].join("\n");
  const left = limit - used - 1;
  const text = `${deep ? "🔬 <b>Análisis</b>\n\n" : "🤖 "}${esc(answer)}${links ? `\n\n<b>Fuentes</b>\n${links}` : ""}` +
    `\n\n<i>${left} ${deep ? "análisis" : "preguntas"} más hoy · Recuerdo esta charla 2 h (/nueva para empezar de cero) · Información, no asesoría.</i>`;
  return { text };
}

// ---------- Termómetro ----------
export async function thermometer(env: Env): Promise<string> {
  const since = Date.now() - DAY;
  const q = await env.DB.prepare(
    `SELECT impact, bias, category, COALESCE(headline_es, title) t FROM news WHERE detected_at > ?1 AND impact >= 3 ORDER BY impact DESC, score DESC`,
  ).bind(since).all<{ impact: number; bias: string | null; category: string; t: string }>();
  const rows = q.results;
  if (rows.length === 0) return "🌡️ Mercado tranquilo: no hay noticias de impacto en las últimas 24 h.";
  const hot = rows.filter((r) => r.impact >= 4).length;
  const level = hot >= 8 ? "🔴 Muy agitado" : hot >= 4 ? "🟠 Agitado" : hot >= 1 ? "🟡 Atento" : "🟢 Tranquilo";
  const bar = (n: number, total: number) => "▰".repeat(Math.round((n / total) * 10)).padEnd(10, "▱");
  const cats = new Map<string, number>();
  for (const r of rows) cats.set(r.category, (cats.get(r.category) ?? 0) + 1);
  const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n})`).join(" · ");
  let biasLine = "";
  const withBias = rows.filter((r) => r.bias);
  if (withBias.length >= 3) {
    const up = withBias.filter((r) => r.bias === "alcista").length, down = withBias.filter((r) => r.bias === "bajista").length;
    const t = withBias.length;
    biasLine = `\n📈 Alcista ${bar(up, t)} ${Math.round((up / t) * 100)}%\n📉 Bajista ${bar(down, t)} ${Math.round((down / t) * 100)}%`;
  }
  const top = rows.slice(0, 3).map((r) => `• ${esc(r.t)}`).join("\n");
  return `🌡️ <b>Termómetro del mercado · 24 h</b>\n\nNivel: <b>${level}</b> (${hot} noticias de impacto alto, ${rows.length} relevantes)${biasLine}\n🔥 Lo que más se mueve: ${esc(topCats)}\n\n<b>Lo más fuerte</b>\n${top}`;
}

// ---------- Agenda ----------
const fmtCdmx = (ms: number) => {
  const d = new Date(ms - CDMX_OFFSET);
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

async function upcomingEvents(env: Env, days = 7) {
  const now = Date.now();
  const q = await env.DB.prepare("SELECT id, at, title FROM events WHERE at > ?1 AND at < ?2 ORDER BY at LIMIT 20")
    .bind(now - 3600_000, now + days * DAY).all<{ id: number; at: number; title: string }>();
  return q.results.map((e) => ({ ...e, when: fmtCdmx(e.at) }));
}

async function eventReminders(env: Env) {
  const now = Date.now();
  const q = await env.DB.prepare("SELECT id, at, title FROM events WHERE notified = 0 AND at <= ?1 AND at > ?2")
    .bind(now + 15 * 60_000, now - 30 * 60_000).all<{ id: number; at: number; title: string }>();
  if (q.results.length === 0) return;
  const { paid, trial } = await proSets(env);
  const ids = [...new Set([...paid.keys(), ...trial.keys()])];
  for (const e of q.results) {
    const mins = Math.max(0, Math.round((e.at - now) / 60_000));
    const text = `⏰ <b>${mins > 0 ? `En ${mins} min` : "Ahora"}: ${esc(e.title)}</b>\n\nPrepárate: es un dato que puede mover el mercado. Te mando la noticia en cuanto salga.`;
    await enqueue(env, ids, text);
    const proChat = await proChatId(env);
    if (proChat) await enqueue(env, [proChat], text);
    await env.DB.prepare("UPDATE events SET notified = 1 WHERE id = ?1").bind(e.id).run();
  }
}

// ---------- Briefing personal (7:00 CDMX) ----------
export async function morningBriefing(env: Env, force = false): Promise<number> {
  const now = Date.now();
  const local = new Date(now - CDMX_OFFSET);
  if (!force) {
    if (local.getUTCHours() !== 7 || local.getUTCMinutes() > 5) return 0;
    const done = await env.DB.prepare("INSERT OR IGNORE INTO flags (k, v) VALUES (?1, '1')").bind(`brief:${cdmxDay(now)}`).run();
    if (!done.meta.changes) return 0; // ya se envió hoy
  }

  const { paid, trial } = await proSets(env);
  const ids = [...new Set([...paid.keys(), ...trial.keys()])];
  if (ids.length === 0) return 0;
  const top = await env.DB.prepare(
    `SELECT COALESCE(headline_es, title) t, link, source_name FROM news WHERE detected_at > ?1 AND impact >= 3 ORDER BY impact DESC, score DESC LIMIT 5`,
  ).bind(now - DAY).all<any>();
  const events = await upcomingEvents(env, 1);
  const thermo = (await thermometer(env)).split("\n").filter(Boolean).slice(0, 2).join("\n");
  const base = `☀️ <b>Tu briefing Pro · ${fmtCdmx(now).split(" ").slice(0, 2).join(" ")}</b>\n\n${thermo}\n\n<b>Lo que mueve el mercado</b>\n` +
    top.results.map((n, i) => `${i + 1}. <a href="${esc(n.link)}">${esc(n.t)}</a>`).join("\n") +
    (events.length ? `\n\n📅 <b>Hoy</b>\n${events.map((e) => `• ${e.when.split(" ")[2]} ${esc(e.title)}`).join("\n")}` : "");

  const watch = await env.DB.prepare(`SELECT tg, term, label FROM watch WHERE tg IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<any>();
  const recent = await env.DB.prepare(
    "SELECT COALESCE(headline_es, title) t, title, summary, link FROM news WHERE detected_at > ?1 ORDER BY impact DESC, score DESC LIMIT 200",
  ).bind(now - DAY).all<any>();
  for (const tg of ids) {
    const terms = watch.results.filter((w: any) => w.tg === tg);
    const hits = terms.length
      ? recent.results.filter((n: any) => terms.some((w: any) => matchesTerm(normalize(`${n.title} ${n.summary}`), w.term))).slice(0, 3)
      : [];
    const radar = terms.length
      ? `\n\n🎯 <b>Tu radar</b> (${esc(terms.map((w: any) => w.label).join(", "))})\n` +
        (hits.length ? hits.map((n: any) => `• <a href="${esc(n.link)}">${esc(n.t)}</a>`).join("\n") : "Sin novedades en tus temas.")
      : "\n\n🎯 Agrega temas a tu radar: /radar peso";
    await enqueue(env, [tg], base + radar + "\n\n🤖 ¿Dudas? Escríbeme tu pregunta.");
  }
  return ids.length;
}

/** Tareas Pro del cron (cada minuto). */
export async function proTick(env: Env) {
  await eventReminders(env).catch((e) => console.warn("eventos", e));
  await morningBriefing(env).catch((e) => console.warn("briefing", e));
  await flushOutbox(env).catch((e) => console.warn("outbox", e));
}

// ---------- API interna para el bot ----------
export async function handleBotApi(req: Request, env: Env, path: string): Promise<Response> {
  if (!env.INTERNAL_SECRET || req.headers.get("x-internal-secret") !== env.INTERNAL_SECRET) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }
  const b = (req.method === "POST" ? await req.json().catch(() => ({})) : {}) as Record<string, any>;
  const tg = Number(b.tg);
  const needTg = () => Number.isSafeInteger(tg) && tg > 0;

  switch (path) {
    case "/bot/account": {
      if (!needTg()) break;
      const { plan, until } = await planOf(env, tg);
      const [terms, used, deepUsed, refs, tr] = await env.DB.batch([
        env.DB.prepare("SELECT label FROM watch WHERE tg = ?1 ORDER BY created_at").bind(tg),
        env.DB.prepare("SELECT n FROM usage WHERE tg = ?1 AND day = ?2").bind(tg, cdmxDay()),
        env.DB.prepare("SELECT n FROM usage WHERE tg = ?1 AND day = ?2").bind(tg, `${cdmxDay()}:deep`),
        env.DB.prepare("SELECT COUNT(*) n FROM referrals WHERE referrer = ?1").bind(tg),
        env.DB.prepare("SELECT used_trial FROM trials WHERE tg = ?1").bind(tg),
      ]);
      return Response.json({
        plan, until, limits: LIMITS[plan],
        terms: (terms.results as any[]).map((r) => r.label),
        asks_today: (used.results[0] as any)?.n ?? 0,
        deep_today: (deepUsed.results[0] as any)?.n ?? 0,
        referrals: (refs.results[0] as any)?.n ?? 0,
        trial_used: !!(tr.results[0] as any)?.used_trial,
      });
    }
    case "/bot/radar":
      if (!needTg()) break;
      return Response.json(await radarOp(env, tg, String(b.op ?? "list"), String(b.term ?? "")));
    case "/bot/ask":
      if (!needTg()) break;
      return Response.json(await ask(env, tg, String(b.q ?? ""), { deep: !!b.deep, newsId: b.news_id ? String(b.news_id) : undefined }));
    case "/bot/forget":
      if (!needTg()) break;
      await env.DB.prepare("DELETE FROM convo WHERE tg = ?1").bind(tg).run();
      return Response.json({ ok: true });
    case "/bot/thermo":
      return Response.json({ text: await thermometer(env) });
    case "/bot/trial": {
      if (!needTg()) break;
      const { plan } = await planOf(env, tg);
      if (plan === "pro" || plan === "api") return Response.json({ error: "Ya eres Pro 😎" });
      const t = await env.DB.prepare("SELECT used_trial FROM trials WHERE tg = ?1").bind(tg).first<{ used_trial: number }>();
      if (t?.used_trial) return Response.json({ error: "Ya usaste tu prueba gratis. Invita amigos con /invita y gana días Pro." });
      return Response.json({ until: await extendTrial(env, tg, 3 * DAY, true) });
    }
    case "/bot/referral": {
      const ref = Number(b.referrer);
      if (!needTg() || !Number.isSafeInteger(ref) || ref <= 0 || ref === tg) break;
      const r = await env.DB.prepare("INSERT OR IGNORE INTO referrals (new_tg, referrer, created_at) VALUES (?1, ?2, ?3)").bind(tg, ref, Date.now()).run();
      if (!r.meta.changes) return Response.json({ ok: false });
      const n = (await env.DB.prepare("SELECT COUNT(*) n FROM referrals WHERE referrer = ?1").bind(ref).first<{ n: number }>())?.n ?? 0;
      if (n % 3 === 0) {
        const until = await extendTrial(env, ref, 7 * DAY);
        await enqueue(env, [ref], `🎁 <b>¡Ganaste 7 días Pro!</b> Ya van ${n} amigos que se unieron con tu enlace.\nTu Pro dura hasta el ${fmtCdmx(until)}. Revisa /micuenta`);
      } else {
        await enqueue(env, [ref], `👋 Alguien se unió con tu enlace (${n % 3}/3). Con 3 ganas 7 días Pro 🎁`);
      }
      return Response.json({ ok: true, count: n });
    }
    case "/bot/events":
      return Response.json({ events: await upcomingEvents(env, num(b.days, 7)) });
    case "/bot/event": {
      const at = parseCdmx(String(b.date ?? ""), String(b.time ?? ""));
      const title = String(b.title ?? "").trim().slice(0, 140);
      if (!at || !title) return Response.json({ error: "Formato: /evento 2026-11-24 08:30 Inflación quincenal (hora CDMX)" });
      await env.DB.prepare("INSERT INTO events (at, title) VALUES (?1, ?2)").bind(at, title).run();
      return Response.json({ ok: true, when: fmtCdmx(at) });
    }
    case "/bot/event-del":
      await env.DB.prepare("DELETE FROM events WHERE id = ?1").bind(Number(b.id)).run();
      return Response.json({ ok: true });
    case "/bot/gift": {
      if (!needTg()) break;
      const until = await extendTrial(env, tg, Math.max(1, Math.min(365, num(b.days, 7))) * DAY);
      await enqueue(env, [tg], `🎁 <b>Te regalaron Pro</b> hasta el ${fmtCdmx(until)}. Disfrútalo: /micuenta`);
      return Response.json({ ok: true, until });
    }
    case "/bot/stats": {
      const [m, t, w, o, u] = await env.DB.batch([
        env.DB.prepare("SELECT plan, status, COUNT(*) n FROM members GROUP BY plan, status"),
        env.DB.prepare("SELECT COUNT(*) n FROM trials WHERE until > ?1").bind(Date.now()),
        env.DB.prepare("SELECT COUNT(DISTINCT tg) n, COUNT(*) terms FROM watch"),
        env.DB.prepare("SELECT COUNT(*) n FROM outbox"),
        env.DB.prepare("SELECT COALESCE(SUM(n),0) n FROM usage WHERE day = ?1").bind(cdmxDay()),
      ]);
      return Response.json({ members: m.results, trials: t.results[0], radar: w.results[0], outbox: o.results[0], asks_today: u.results[0] });
    }
  }
  return Response.json({ error: "petición inválida" }, { status: 400 });
}

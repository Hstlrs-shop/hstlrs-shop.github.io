// Crecimiento: kit de contenido diario para redes (6:30 CDMX, solo al admin) y
// sistema de afiliados para creadores de finanzas (enlace /r/<código>).

import { writeContentKit } from "./ai";
import { num, type Env } from "./env";
import { catImage, newsPath } from "./pages";
import { esc, tgCall } from "./telegram";
import { sameStory } from "./textutil";

const CDMX = 6 * 3600_000;
const cdmxDate = (ms = Date.now()) => new Date(ms - CDMX).toISOString().slice(0, 10);

// ---------- Kit de contenido diario ----------
export async function contentKit(env: Env, force = false): Promise<{ sent: boolean; reason?: string }> {
  const admin = env.ADMIN_CHAT_ID;
  if (!admin) return { sent: false, reason: "falta ADMIN_CHAT_ID" };
  const now = Date.now();
  if (!force) {
    const local = new Date(now - CDMX);
    if (local.getUTCHours() !== 6 || local.getUTCMinutes() < 30 || local.getUTCMinutes() > 36) return { sent: false, reason: "fuera de horario" };
    const first = await env.DB.prepare("INSERT OR IGNORE INTO flags (k, v) VALUES (?1, '1')").bind(`kit:${cdmxDate(now)}`).run();
    if (!first.meta.changes) return { sent: false, reason: "ya enviado hoy" };
  }

  // 3 noticias fuertes y distintas de las últimas 24 h (mejor si tienen foto)
  const q = await env.DB.prepare(
    `SELECT * FROM news WHERE detected_at > ?1 AND ai = 1 AND impact >= 3
     ORDER BY impact DESC, (image IS NOT NULL) DESC, views DESC, score DESC LIMIT 30`,
  ).bind(now - 24 * 3600_000).all<any>();
  const picked: any[] = [];
  for (const n of q.results) {
    const t = n.headline_es ?? n.title;
    if (!picked.some((p) => sameStory(p.headline_es ?? p.title, t))) picked.push(n);
    if (picked.length === 3) break;
  }
  if (picked.length === 0) return { sent: false, reason: "sin noticias" };

  const kit = await writeContentKit(env, picked.map((n) => ({ title: n.headline_es ?? n.title, brief: n.brief_es, source: n.source_name })));
  if (!kit) return { sent: false, reason: "la IA no respondió" };

  const bot = await env.BOT_KV?.get("botuser");
  const links = picked.map((n) => `${env.SITE_URL}${newsPath(n)}`);
  let wa = kit.whatsapp.replace(/\{BOT\}/g, bot ? `https://t.me/${bot}` : env.SITE_URL);
  links.forEach((l, i) => (wa = wa.replace(new RegExp(`\\{LINK${i + 1}\\}`, "g"), l)));
  wa = wa.replace(/\{LINK\d\}/g, "");
  const send = (text: string) => tgCall(env, "sendMessage", { chat_id: admin, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } });

  await send(`🎬 <b>Kit de contenido · ${cdmxDate(now)}</b>\n\nGraba un video vertical de ~45 s (TikTok, Reels y Shorts con el mismo archivo).\n\n<b>Primera frase (0-3 s):</b>\n${esc(kit.hook)}\n\n<b>Guion</b> (las “/” son pausas):\n${esc(kit.script)}`);
  await send(`📝 <b>Descripción para TikTok / Instagram</b> (mantén presionado para copiar)\n\n<code>${esc(kit.caption)}\n\n${esc(kit.hashtags.map((t) => "#" + t.replace(/^#/, "").replace(/\s+/g, "")).join(" "))}</code>`);
  await send(`💬 <b>Para tu Canal de WhatsApp</b> (copia y pega)\n\n<code>${esc(wa)}</code>`);
  for (const [i, n] of picked.entries()) {
    await tgCall(env, "sendPhoto", {
      chat_id: admin, photo: n.image ?? catImage(env, n.category), parse_mode: "HTML",
      caption: `${i + 1}. <b>${esc(n.headline_es ?? n.title)}</b>\n${esc(n.source_name)} · <a href="${esc(links[i])}">Lana con Café</a>\n\n<i>Foto de la fuente: úsala en el video solo como referencia con crédito, o usa la imagen de marca.</i>`,
    }).catch(() => send(`${i + 1}. <b>${esc(n.headline_es ?? n.title)}</b>\n${esc(links[i])}`));
  }
  return { sent: true };
}

// ---------- Afiliados ----------
export const validCode = (c: string) => /^[a-z0-9_]{3,20}$/.test(c);

async function affStats(env: Env, code: string) {
  const r = await env.DB.prepare(
    `SELECT a.code, a.name, a.pct, a.clicks, a.tg,
       (SELECT COUNT(*) FROM attribution t WHERE t.code = a.code) users,
       (SELECT COUNT(*) FROM attribution t JOIN members m ON m.telegram_user_id = t.tg
          WHERE t.code = a.code AND m.status = 'authorized') pro
     FROM affiliates a WHERE a.code = ?1`,
  ).bind(code).first<any>();
  if (!r) return null;
  const net = num(env.AFF_NET_MXN, 55);
  return { ...r, commission_mxn: Math.round(r.pro * net * (r.pct / 100)) };
}

export async function affiliateRedirect(env: Env, code: string): Promise<Response> {
  const bot = await env.BOT_KV?.get("botuser");
  const ok = validCode(code) && (await env.DB.prepare("UPDATE affiliates SET clicks = clicks + 1 WHERE code = ?1").bind(code).run()).meta.changes;
  const target = bot ? `https://t.me/${bot}${ok ? `?start=a_${code}` : ""}` : `${env.SITE_URL}/`;
  return Response.redirect(target, 302);
}

export async function handleAffiliateApi(env: Env, path: string, b: Record<string, any>): Promise<Response | null> {
  switch (path) {
    case "/bot/aff-create": {
      const code = String(b.code ?? "").toLowerCase();
      const pct = Math.max(1, Math.min(90, Math.round(Number(b.pct ?? 40))));
      if (!validCode(code)) return Response.json({ error: "El código debe tener 3-20 letras minúsculas, números o _" });
      const tg = Number(b.tg) > 0 ? Number(b.tg) : null;
      await env.DB.prepare(
        `INSERT INTO affiliates (code, name, tg, pct, clicks, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)
         ON CONFLICT(code) DO UPDATE SET name = ?2, tg = COALESCE(?3, tg), pct = ?4`,
      ).bind(code, String(b.name ?? code).slice(0, 60), tg, pct, Date.now()).run();
      const bot = await env.BOT_KV?.get("botuser");
      return Response.json({ ok: true, code, pct, web: `${env.SITE_URL}/r/${code}`, bot: bot ? `https://t.me/${bot}?start=a_${code}` : null });
    }
    case "/bot/attribute": {
      const tg = Number(b.tg), code = String(b.code ?? "").toLowerCase();
      if (!(tg > 0) || !validCode(code)) return Response.json({ ok: false });
      const exists = await env.DB.prepare("SELECT 1 FROM affiliates WHERE code = ?1").bind(code).first();
      if (!exists) return Response.json({ ok: false });
      const r = await env.DB.prepare("INSERT OR IGNORE INTO attribution (tg, code, at) VALUES (?1, ?2, ?3)").bind(tg, code, Date.now()).run();
      return Response.json({ ok: !!r.meta.changes });
    }
    case "/bot/aff-report": {
      const codes = await env.DB.prepare("SELECT code FROM affiliates ORDER BY created_at").all<{ code: string }>();
      const rows = [];
      for (const c of codes.results) rows.push(await affStats(env, c.code));
      return Response.json({ affiliates: rows, net_mxn: num(env.AFF_NET_MXN, 55) });
    }
    case "/bot/aff-mine": {
      const a = await env.DB.prepare("SELECT code FROM affiliates WHERE tg = ?1").bind(Number(b.tg)).first<{ code: string }>();
      if (!a) return Response.json({ error: "No tienes un código de afiliado. Escríbenos si quieres ser creador aliado." });
      const bot = await env.BOT_KV?.get("botuser");
      return Response.json({ ...(await affStats(env, a.code)), web: `${env.SITE_URL}/r/${a.code}`, bot: bot ? `https://t.me/${bot}?start=a_${a.code}` : null });
    }
    case "/bot/kit":
      return Response.json(await contentKit(env, true));
  }
  return null;
}

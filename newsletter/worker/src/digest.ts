// Edición diaria del newsletter: top noticias de 24 h → Claude redacta → se
// publica en la web, se anuncia en Telegram y se envía a tu plataforma de email.

import { writeDigest } from "./ai";
import type { Env } from "./env";
import { esc, proChatId, sendMessage } from "./telegram";

/** Markdown → HTML mínimo y seguro (escapa todo antes de transformar). */
export function mdToHtml(md: string): string {
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  const out: string[] = [];
  let list = false;
  for (const line of md.split("\n")) {
    const l = line.trimEnd();
    const li = l.match(/^\s*[-*]\s+(.*)/);
    if (li) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push("</ul>"); list = false; }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push("</ul>");
  return out.join("\n");
}

function fallbackMarkdown(env: Env, items: any[], date: string): string {
  const sec = (scope: string) => items.filter((n) => n.scope === scope).slice(0, 6)
    .map((n) => `- **${n.headline_es ?? n.title}** — ${n.brief_es ?? ""} [${n.source_name}](${n.link})`).join("\n");
  return `# ${env.BRAND}: lo que mueve el mercado (${date})\n\n## Global\n${sec("global")}\n\n## En casa\n${sec("nacional")}\n\n_Esto es información, no asesoría de inversión._`;
}

export async function buildDigest(env: Env): Promise<{ id: string; subject: string } | null> {
  const now = Date.now();
  const id = new Date(now).toISOString().slice(0, 10);
  const q = await env.DB.prepare(
    `SELECT title, headline_es, brief_es, link, source_name, scope, impact, category, assets, bias
     FROM news WHERE detected_at > ?1 ORDER BY impact DESC, score DESC LIMIT 30`,
  ).bind(now - 24 * 3600_000).all<any>();
  if (q.results.length === 0) return null;

  const md = (await writeDigest(env, q.results).catch(() => null)) ?? fallbackMarkdown(env, q.results, id);
  const subject = (md.match(/^#\s+(.+)$/m)?.[1] ?? `${env.BRAND} · ${id}`).slice(0, 120);
  const html = mdToHtml(md);

  await env.DB.prepare("INSERT OR REPLACE INTO digests (id, created_at, subject, markdown, html) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(id, now, subject, md, html).run();

  const url = `${env.SITE_URL}/edicion.html?id=${id}`;
  const teaser = `🗞 <b>${esc(subject)}</b>\n\nYa está la edición de hoy: lo que mueve el mercado en 5 minutos.\n\n👉 <a href="${esc(url)}">Leer gratis</a>`;
  await sendMessage(env, env.TELEGRAM_FREE_CHAT, teaser).catch(() => {});
  const proChat = await proChatId(env);
  if (proChat) await sendMessage(env, proChat, teaser).catch(() => {});

  if (env.DIGEST_WEBHOOK_URL) {
    // Conecta aquí Beehiiv / Buttondown / Make / Zapier para el envío por email
    await fetch(env.DIGEST_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, subject, markdown: md, html, url }),
    }).catch(() => {});
  }
  return { id, subject };
}

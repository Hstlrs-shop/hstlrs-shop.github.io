// Ciclo YouTube → Telegram → sitio: cada video nuevo del canal de YouTube se anuncia en el canal gratis de
// Telegram y aparece en el sitio (/api/videos). Usa el feed RSS público de YouTube (sin llaves).
// Se activa al poner YT_CHANNEL_ID (UC…) en wrangler.toml.

import type { Env } from "./env";
import { esc, tgCall } from "./telegram";

import { parseFeed, type Video } from "./youtube-feed";
export { parseFeed, type Video };

export async function syncYouTube(env: Env): Promise<number> {
  const ch = env.YT_CHANNEL_ID;
  if (!ch) return 0;
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(ch)}`, { headers: { "user-agent": "lanaconcafe" } });
  if (!r.ok) throw new Error(`YouTube feed ${r.status}`);
  const vids = parseFeed(await r.text());
  await env.DB.prepare("INSERT INTO flags (k, v) VALUES ('yt:latest', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1").bind(JSON.stringify(vids.slice(0, 8))).run();
  // Primera vez: se marcan como vistos sin anunciarlos (no inundar el canal con videos viejos)
  const init = await env.DB.prepare("INSERT OR IGNORE INTO flags (k, v) VALUES ('yt:init', '1')").run();
  let sent = 0;
  for (const v of vids.slice(0, 5).reverse()) {
    const first = await env.DB.prepare("INSERT OR IGNORE INTO flags (k, v) VALUES (?1, '1')").bind(`yt:seen:${v.id}`).run();
    if (!first.meta.changes || init.meta.changes || Date.now() - v.published > 2 * 86400_000) continue;
    const chat = env.TELEGRAM_FREE_CHAT;
    if (!chat) continue;
    await tgCall(env, "sendMessage", {
      chat_id: chat, parse_mode: "HTML", disable_web_page_preview: false,
      text: `🎬 <b>${v.short ? "Nuevo video corto" : "Nuevo video"} en YouTube</b>\n\n${esc(v.title)}\n\n▶️ ${v.url}\n\nSi te sirve, suscríbete y compártelo: así llegamos a más gente ☕`,
    }).catch((e) => console.warn("yt telegram", e));
    sent++;
  }
  return sent;
}

export async function latestVideos(env: Env): Promise<Video[]> {
  const r = await env.DB.prepare("SELECT v FROM flags WHERE k = 'yt:latest'").first<{ v: string }>();
  return r ? (JSON.parse(r.v) as Video[]) : [];
}

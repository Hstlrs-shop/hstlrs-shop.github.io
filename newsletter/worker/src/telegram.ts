// Envío a Telegram con la Bot API. Usa el MISMO token de tu bot actual:
// sendMessage no interfiere con el webhook que ya tienes en Cloudflare.

import type { Env } from "./env";

const IMPACT_ICON = ["", "⚪", "🔵", "🟡", "🟠", "🔴"];
const BIAS_ICON: Record<string, string> = { alcista: "📈", bajista: "📉", mixto: "↔️", neutral: "➖" };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function call<T = unknown>(env: Env, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result: T; description?: string; parameters?: { retry_after?: number } };
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
  return data.result;
}

export interface AlertNews {
  headline: string;
  brief?: string | null;
  link: string;
  source: string;
  impact: number;
  bias?: string | null;
  assets?: string[];
  scope: string;
}

export function formatAlert(n: AlertNews, opts: { pro: boolean; brand: string; siteUrl: string }): string {
  const lines = [
    `${IMPACT_ICON[n.impact] ?? ""} <b>${esc(n.headline)}</b>`,
  ];
  if (n.brief) lines.push("", esc(n.brief));
  if (opts.pro && n.assets?.length) {
    lines.push("", `${BIAS_ICON[n.bias ?? "neutral"] ?? ""} <i>${esc(n.assets.join(" · "))}</i>`);
  }
  lines.push("", `${n.scope === "nacional" ? "🏠" : "🌎"} ${esc(n.source)} · <a href="${esc(n.link)}">Fuente</a>`);
  if (!opts.pro) {
    lines.push("", `⚡ Los miembros Pro recibieron esto al instante → <a href="${esc(opts.siteUrl)}/precios.html">${esc(opts.brand)} Pro</a>`);
  }
  return lines.join("\n");
}

export function sendMessage(env: Env, chatId: string, html: string, silent = false) {
  return call(env, "sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    disable_notification: silent,
  });
}

/** Enlace de invitación de un solo uso para el canal privado. */
export async function createInvite(env: Env, name: string): Promise<string> {
  const r = await call<{ invite_link: string }>(env, "createChatInviteLink", {
    chat_id: env.TELEGRAM_PRO_CHAT,
    name: name.slice(0, 32),
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  });
  return r.invite_link;
}

export function revokeInvite(env: Env, link: string) {
  return call(env, "revokeChatInviteLink", { chat_id: env.TELEGRAM_PRO_CHAT, invite_link: link });
}

/** Expulsa sin banear de por vida (ban + unban) cuando se cancela la suscripción. */
export async function removeMember(env: Env, userId: number) {
  await call(env, "banChatMember", { chat_id: env.TELEGRAM_PRO_CHAT, user_id: userId });
  await call(env, "unbanChatMember", { chat_id: env.TELEGRAM_PRO_CHAT, user_id: userId, only_if_banned: true });
}

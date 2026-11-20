// Envío a Telegram. Por defecto pasa por tu bot "lanaconcafe" (service binding),
// así el token nunca se copia a este Worker.

import type { Env } from "./env";

const IMPACT_ICON = ["", "⚪", "🔵", "🟡", "🟠", "🔴"];
const BIAS_ICON: Record<string, string> = { alcista: "📈", bajista: "📉", mixto: "↔️", neutral: "➖" };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Llama a la Bot API. Con el binding BOT, la llamada la hace el propio bot con su token. */
export async function tgCall<T = unknown>(env: Env, method: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  if (env.BOT && env.INTERNAL_SECRET) {
    res = await env.BOT.fetch("https://bot/internal/tg", {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": env.INTERNAL_SECRET },
      body: JSON.stringify({ method, body }),
    });
  } else if (env.TELEGRAM_BOT_TOKEN) {
    res = await fetch(`${env.TG_API ?? "https://api.telegram.org"}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } else {
    throw new Error("Telegram sin configurar (falta el binding BOT o TELEGRAM_BOT_TOKEN)");
  }
  const data = (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
  return data.result;
}
const call = tgCall;

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

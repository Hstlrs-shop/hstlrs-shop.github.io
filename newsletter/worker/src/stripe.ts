// Webhook de Stripe: pago → enlace único al canal Pro (+ API key).
// Cancelación → se revoca el enlace y se expulsa al usuario del canal.

import type { Env } from "./env";
import { createInvite, removeMember, revokeInvite } from "./telegram";

const enc = new TextEncoder();

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyStripe(body: string, header: string | null, secret: string, toleranceSec = 300): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0 || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${body}`);
  return sigs.some((s) => safeEqual(s, expected));
}

function newApiKey(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return "pk_" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

interface StripeEvent {
  type: string;
  data: { object: Record<string, any> };
}

export async function handleStripe(req: Request, env: Env): Promise<Response> {
  const body = await req.text();
  if (!env.STRIPE_WEBHOOK_SECRET || !(await verifyStripe(body, req.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("firma inválida", { status: 400 });
  }
  const evt = JSON.parse(body) as StripeEvent;
  const obj = evt.data.object;
  const now = Date.now();

  if (evt.type === "checkout.session.completed") {
    const customer: string = obj.customer ?? obj.id;
    // Configura en el Payment Link metadata.plan = "pro" | "api"
    const plan: string = obj.metadata?.plan === "api" ? "api" : "pro";
    const email: string | null = obj.customer_details?.email ?? null;
    const invite = await createInvite(env, `stripe ${customer}`);
    await env.DB.prepare(
      `INSERT INTO members (stripe_customer, checkout_session, email, plan, status, invite_link, api_key, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6, ?7, ?7)
       ON CONFLICT(stripe_customer) DO UPDATE SET checkout_session=?2, email=?3, plan=?4, status='active', invite_link=?5, updated_at=?7`,
    ).bind(customer, obj.id, email, plan, invite, newApiKey(), now).run();
  }

  if (evt.type === "customer.subscription.deleted" || (evt.type === "customer.subscription.updated" && obj.status === "unpaid")) {
    const m = await env.DB.prepare("SELECT invite_link, telegram_user_id FROM members WHERE stripe_customer = ?1")
      .bind(obj.customer).first<{ invite_link: string | null; telegram_user_id: number | null }>();
    if (m) {
      if (m.invite_link) await revokeInvite(env, m.invite_link).catch(() => {});
      if (m.telegram_user_id) await removeMember(env, m.telegram_user_id).catch(() => {});
      await env.DB.prepare("UPDATE members SET status='canceled', updated_at=?2 WHERE stripe_customer=?1").bind(obj.customer, now).run();
    }
  }
  return new Response("ok");
}

/**
 * Tu bot actual recibe los updates de Telegram. Reenvía aquí los `chat_member`
 * del canal Pro para saber qué usuario usó cada enlace (necesario para poder
 * expulsarlo al cancelar). Ver docs/DESPLIEGUE.md.
 */
export async function handleChatMember(req: Request, env: Env): Promise<Response> {
  if (!env.TELEGRAM_FORWARD_SECRET || req.headers.get("x-forward-secret") !== env.TELEGRAM_FORWARD_SECRET) {
    return new Response("no autorizado", { status: 401 });
  }
  const update = (await req.json()) as any;
  const cm = update.chat_member;
  const link: string | undefined = cm?.invite_link?.invite_link;
  const userId: number | undefined = cm?.new_chat_member?.user?.id;
  if (link && userId && cm.new_chat_member.status === "member") {
    // Telegram puede devolver el enlace recortado ("https://t.me/+abc..."), así que comparamos por prefijo
    const prefix = link.replace(/\.\.\.$/, "");
    await env.DB.prepare("UPDATE members SET telegram_user_id=?1, updated_at=?2 WHERE invite_link LIKE ?3 AND status='active'")
      .bind(userId, Date.now(), prefix + "%").run();
  }
  return new Response("ok");
}

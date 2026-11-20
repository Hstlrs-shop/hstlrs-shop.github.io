// Cobros con Mercado Pago Suscripciones (preapproval).
//
// Alta:  el cliente paga en el enlace del plan → Mercado Pago lo regresa a
//        SITE/gracias.html?preapproval_id=… → /api/acceso consulta la API de
//        Mercado Pago y, si la suscripción está "authorized", entrega un enlace
//        de un solo uso al canal Pro (+ API key si es el plan API).
// Bajas: el webhook (tipo subscription_preapproval) avisa de cada cambio; si la
//        suscripción ya no está autorizada se revoca el enlace y se expulsa al
//        usuario del canal. Siempre se consulta el estado real en la API: nunca
//        se confía en el cuerpo de la notificación.

import type { Env } from "./env";
import { verifyMercadoPago } from "./signature";
import { createInvite, removeMember, revokeInvite } from "./telegram";

const MP_API = "https://api.mercadopago.com";

interface Preapproval {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled" | string;
  preapproval_plan_id?: string;
  payer_email?: string;
  payer_id?: number;
}

async function getPreapproval(env: Env, id: string): Promise<Preapproval | null> {
  if (!env.MP_ACCESS_TOKEN) throw new Error("Falta el secreto MP_ACCESS_TOKEN");
  const res = await fetch(`${MP_API}/preapproval/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}`);
  return (await res.json()) as Preapproval;
}

function planOf(env: Env, p: Preapproval): "pro" | "api" {
  return p.preapproval_plan_id && p.preapproval_plan_id === env.MP_PLAN_API ? "api" : "pro";
}

function newApiKey(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return "pk_" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function revokeAccess(env: Env, id: string, status: string) {
  const m = await env.DB.prepare("SELECT invite_link, telegram_user_id, status FROM members WHERE id = ?1")
    .bind(id).first<{ invite_link: string | null; telegram_user_id: number | null; status: string }>();
  if (!m || m.status !== "authorized") return;
  if (m.invite_link) await revokeInvite(env, m.invite_link).catch(() => {});
  if (m.telegram_user_id) await removeMember(env, m.telegram_user_id).catch(() => {});
  await env.DB.prepare("UPDATE members SET status = ?2, updated_at = ?3 WHERE id = ?1").bind(id, status, Date.now()).run();
}

/** POST /mp/webhook */
export async function handleMercadoPago(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string } };
  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? "";
  const type = url.searchParams.get("type") ?? body.type ?? "";
  if (!env.MP_WEBHOOK_SECRET || !dataId ||
      !(await verifyMercadoPago(dataId, req.headers.get("x-signature"), req.headers.get("x-request-id"), env.MP_WEBHOOK_SECRET))) {
    return new Response("firma inválida", { status: 400 });
  }
  if (type !== "subscription_preapproval") return new Response("ok"); // otros avisos (pagos) no cambian el acceso

  const p = await getPreapproval(env, dataId).catch(() => undefined);
  if (p === undefined) return new Response("reintentar", { status: 500 }); // Mercado Pago reintenta
  if (!p) return new Response("ok");
  if (p.status === "authorized") {
    await env.DB.prepare(`UPDATE members SET status = 'authorized', updated_at = ?2 WHERE id = ?1`).bind(p.id, Date.now()).run();
  } else if (p.status === "cancelled" || p.status === "paused") {
    await revokeAccess(env, p.id, p.status);
  }
  return new Response("ok");
}

/** GET /api/acceso?preapproval_id=… (página gracias.html, al volver de Mercado Pago) */
export async function handleAccess(url: URL, env: Env): Promise<Response> {
  const id = url.searchParams.get("preapproval_id") ?? "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return Response.json({ error: "suscripción inválida" }, { status: 400 });

  const existing = await env.DB.prepare("SELECT plan, status, invite_link, api_key FROM members WHERE id = ?1").bind(id).first<any>();
  if (existing?.status === "authorized" && existing.invite_link) {
    return Response.json({ plan: existing.plan, invite_link: existing.invite_link, api_key: existing.plan === "api" ? existing.api_key : null });
  }

  const p = await getPreapproval(env, id);
  if (!p) return Response.json({ error: "no encontrada" }, { status: 404 });
  if (p.status === "pending") return Response.json({ pending: true }, { status: 202 }); // el cobro aún se procesa
  if (p.status !== "authorized") return Response.json({ error: `suscripción ${p.status}` }, { status: 403 });

  const plan = planOf(env, p);
  const invite = await createInvite(env, `mp ${p.id}`);
  const apiKey = existing?.api_key ?? newApiKey();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO members (id, email, plan, status, invite_link, api_key, created_at, updated_at)
     VALUES (?1, ?2, ?3, 'authorized', ?4, ?5, ?6, ?6)
     ON CONFLICT(id) DO UPDATE SET status = 'authorized', plan = ?3, invite_link = ?4, updated_at = ?6`,
  ).bind(p.id, p.payer_email ?? null, plan, invite, apiKey, now).run();
  return Response.json({ plan, invite_link: invite, api_key: plan === "api" ? apiKey : null });
}

/**
 * Tu bot recibe los updates de Telegram. Reenvía aquí los `chat_member` del
 * canal Pro para saber qué usuario usó cada enlace (necesario para expulsarlo
 * al cancelar). Ver docs/DESPLIEGUE.md.
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
    const prefix = link.replace(/\.\.\.$/, ""); // Telegram puede recortar el enlace
    await env.DB.prepare("UPDATE members SET telegram_user_id = ?1, updated_at = ?2 WHERE invite_link LIKE ?3 AND status = 'authorized'")
      .bind(userId, Date.now(), prefix + "%").run();
  }
  return new Response("ok");
}

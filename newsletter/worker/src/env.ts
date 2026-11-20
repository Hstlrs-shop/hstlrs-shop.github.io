export interface Env {
  DB: D1Database;
  BOT_KV?: KVNamespace;        // KV de tu bot "lanaconcafe" (para llenar /noticias)
  BOT?: Fetcher;               // service binding al bot: envía a Telegram con SU token (no hace falta copiarlo)

  // Variables (wrangler.toml [vars])
  BRAND: string;
  SITE_URL: string;
  COUNTRY: string;
  CLAUDE_MODEL: string;
  AI_MIN_SCORE: string;        // puntuación heurística mínima para pasar por IA
  PRO_MIN_IMPACT: string;      // impacto mínimo para alerta instantánea al canal Pro
  FREE_MIN_IMPACT: string;     // impacto mínimo para el canal gratuito
  FREE_DELAY_MIN: string;      // minutos de retraso para gratis (web, RSS y canal)
  TELEGRAM_FREE_CHAT: string;  // @canal_publico o -100...
  TELEGRAM_PRO_CHAT: string;   // -100... (canal privado de pago)
  MP_PLAN_PRO?: string;        // id del plan de suscripción Pro en Mercado Pago
  MP_PLAN_API?: string;        // id del plan de suscripción API
  ROTATE?: string;             // "3" en plan gratuito, "1" en Workers Paid
  BOT_NOTICIAS?: string;       // "1" = actualizar /noticias del bot cada hora
  HEURISTIC_ALERTS?: string;   // "1" = publicar en canales aunque la IA no haya revisado la noticia
  TG_API?: string;             // solo pruebas locales: API de Telegram simulada

  // Secretos (wrangler secret put ...)
  TELEGRAM_BOT_TOKEN?: string;  // opcional si existe el binding BOT
  INTERNAL_SECRET?: string;     // secreto compartido bot <-> Worker de noticias
  ANTHROPIC_API_KEY?: string;
  MP_ACCESS_TOKEN?: string;     // Mercado Pago: credencial de producción (APP_USR-…)
  MP_WEBHOOK_SECRET?: string;   // Mercado Pago: clave secreta de Webhooks
  ADMIN_TOKEN?: string;
  DIGEST_WEBHOOK_URL?: string;  // opcional: tu ESP (Beehiiv/Buttondown/Make/Zapier)
  TELEGRAM_FORWARD_SECRET?: string;
}

export const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

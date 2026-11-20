export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;

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
  STRIPE_PRO_LINK: string;     // Payment Link Pro
  STRIPE_API_LINK: string;     // Payment Link API

  // Secretos (wrangler secret put ...)
  TELEGRAM_BOT_TOKEN: string;
  ANTHROPIC_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  ADMIN_TOKEN?: string;
  DIGEST_WEBHOOK_URL?: string;  // opcional: tu ESP (Beehiiv/Buttondown/Make/Zapier)
  TELEGRAM_FORWARD_SECRET?: string;
}

export const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

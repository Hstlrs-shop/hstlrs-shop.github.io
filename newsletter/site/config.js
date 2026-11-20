// Cambia estos valores al desplegar.
window.LCC = {
  // Misma URL que el Worker (la web se sirve desde él). Si mueves la web a otro dominio, pon aquí la URL del Worker.
  API: location.hostname.endsWith("workers.dev") || location.hostname === "localhost" ? location.origin : "https://lanaconcafe-news.gt2hf24n6t.workers.dev",
  BRAND: "Lana con Café",
  TELEGRAM_FREE: "https://t.me/LanaconCafe",
  // Suscripción Pro: enlace de Telegram Stars (lo crea /crearsuscripcion en el bot)
  PRO_LINK: "https://t.me/+fDriiciB1IpiYjUx"  /* se actualiza solo desde /api/pro */,
  BOT: "https://t.me/LanaconcafeBot",
  // Mercado Pago (para más adelante): enlaces de checkout de los planes
  MP_PRO: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=REEMPLAZAR",
  MP_API: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=REEMPLAZAR",
};

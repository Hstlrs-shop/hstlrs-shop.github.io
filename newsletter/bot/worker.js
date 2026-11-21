// Lana con Café · Bot de Telegram (Cloudflare Worker)
// Variables necesarias (Settings → Variables): BOT_TOKEN (secreta), WEBHOOK_SECRET (secreta), ADMIN_ID
// Variable opcional: CANAL_ID (texto, p. ej. @lanaconcafe) para publicar en el canal. El bot debe ser administrador del canal.
// v5: las publicaciones del canal llevan botones que abren el bot; /menucanal publica un menú para fijar.
// v6: resumen automático 7:30 am y encuesta diaria en el canal (resultado 8 pm, hora de Querétaro); /stats y /probarcanal para el administrador.
// v16: la guía básica es GRATIS al unirse al canal (/guia verifica la membresía); producto premium /plan
//      "Tu plan de inversión en 30 días" con Telegram Stars (lista de espera mientras no está listo).
// v15: scalping BTC profesional en el Worker de noticias (solo admin): /scalp (lectura ahora) y /bitacora (resultados).
//      La señal automática vieja de 15 min queda apagada: la reemplaza el motor nuevo (plan 8:15, señales y resumen 10:35).
// v14: aprobación de los videos diarios con ✅/❌ (callback ap:), guía de pago con Telegram Stars (/guia, /miguia,
//      /reembolso con garantía de 7 días), prueba Pro de 7 días y /start pro|guia|prueba desde la bio.
// v13: afiliados para creadores (/start a_<código>, /afiliado, /afiliados, /comisiones) y /kit (contenido diario).
// v12: bienvenida con botones de radar de un toque (callback_query) y secuencia día 1 / día 3 / fin de prueba.
// v11: IA de Lana v2: modelo rápido con 100 preguntas/día en Pro, /analiza (análisis profundo), memoria de 3
//      intercambios (/nueva para olvidar), usa tu radar, y botón "¿Qué significa para mí?" (/start q_<id>).
// v10: suscripción de pago con Telegram Stars al canal Pro (/crearsuscripcion), el ID del canal Pro se obtiene
//      reenviando al bot un mensaje del canal (lo guarda en KV "pro_canal"); entrar/salir del canal activa/desactiva Pro.
// v9: Pro de verdad. Pregúntale a Lana (IA con las noticias del día; también escribiendo sin comando),
//     radar personal (/radar peso), termómetro del mercado, /dolar, briefing Pro 7:00, recordatorios de agenda,
//     prueba Pro de 7 días (/prueba), referidos (/invita: 3 amigos = 7 días Pro), /micuenta.
//     La lógica Pro vive en el Worker "lanaconcafe-news" (binding NEWS). Este bot le presta su token (/internal/tg).
//     Secretos nuevos: INTERNAL_SECRET (el mismo en ambos Workers).
// v8: /difundir por tandas desde el cron (el plan gratuito permite ~50 envíos por ejecución); /pro; conexión con el canal Pro de pago.
//     Variables nuevas opcionales: PRO_CANAL_ID (-100…), NEWS_URL (URL del Worker lanaconcafe-news) y FORWARD_SECRET (secreta).
// v7: señales con el tamaño de la regla (0,01 BTC) y solo en el horario de la sesión (lunes a viernes, 8:30–10:30 hora de Querétaro); cada señal recuerda confirmar en 5 min antes de entrar.
// KV necesario (Settings → Bindings): nombre de la variable = DB
// Cron necesario (Settings → Triggers): */5 * * * *

const UPDATES = ["message", "chat_member", "callback_query", "pre_checkout_query"];
const AVISO = "\n\n<i>Información, no asesoría financiera.</i>";
const MAX_ALERTAS = 5;
// Reglas de la sesión de scalping (v7)
const TAMANO_BTC = 0.01;            // unidades por operación en demo
const SESION = { desde: 510, hasta: 630 }; // 8:30 a 10:30 hora de Querétaro, en minutos del día

// Nombre que escribe el usuario → id en CoinGecko
const MONEDAS = {
  btc: "bitcoin", bitcoin: "bitcoin", eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana", xrp: "ripple", bnb: "binancecoin",
  ada: "cardano", doge: "dogecoin", ton: "the-open-network", avax: "avalanche-2",
  link: "chainlink", dot: "polkadot", ltc: "litecoin", usdt: "tether",
};
const NOMBRE = { bitcoin: "Bitcoin", ethereum: "Ethereum", solana: "Solana", ripple: "XRP",
  binancecoin: "BNB", cardano: "Cardano", dogecoin: "Dogecoin", "the-open-network": "Toncoin",
  "avalanche-2": "Avalanche", chainlink: "Chainlink", polkadot: "Polkadot", litecoin: "Litecoin", tether: "Tether" };

const AYUDA =
`<b>Lana con Café ☕ · Mercados e IA</b>

<b>Precios</b>
/precio btc · precio de una cripto (btc, eth, sol, xrp, bnb, ada, doge, ton…)
/mercado · resumen de las principales

<b>Alertas</b>
/alerta btc 73000 · te aviso cuando toque ese precio
/misalertas · ver tus alertas
/borrar 1 · borrar una alerta (o /borrar todas)

<b>Señales de scalping (Bitcoin, velas de 15 min)</b>
/analisis · lectura actual: precio, VWAP, medias y plan
/senales on · recibir señales automáticas de lunes a viernes, 8:30–10:30 (/senales off para apagar)

<b>🤖 Pregúntale a Lana</b>
Escríbeme cualquier duda y te respondo con las noticias de hoy (y recuerdo la charla). Ej.: <i>¿por qué sube el dólar?</i>
/analiza · análisis profundo (Pro) · /nueva · empezar de cero

<b>Noticias</b>
/noticias · las 5 noticias que mueven el mercado
/termometro · qué tan agitado está el mercado hoy
/radar peso · te aviso cuando salga algo de lo que sigues
/dolar · dólar, euro y bitcoin en pesos
/agenda · eventos importantes con recordatorio

<b>⭐ Pro</b>
/pro · qué incluye · /prueba · 7 días gratis
/invita · 3 amigos = 7 días Pro · /micuenta · tu plan

Precios: CoinGecko y Coinbase. Alertas y señales se revisan cada 5 minutos. Las señales son para practicar en demo.` + AVISO;

// Botones de abajo del chat: texto del botón → comando
const BOTONES = {
  "📊 Mercado": "/mercado", "📰 Noticias": "/noticias",
  "🧭 Análisis BTC": "/analisis", "📅 Agenda": "/agenda",
  "🔔 Mis alertas": "/misalertas", "📡 Señales": "/senales",
  "🌡️ Termómetro": "/termometro", "🎯 Mi radar": "/radar",
  "💵 Dólar": "/dolar", "⭐ Pro": "/pro",
  "❓ Ayuda": "/ayuda",
};
const TECLADO = {
  keyboard: [["📰 Noticias", "🌡️ Termómetro"], ["🎯 Mi radar", "💵 Dólar"], ["📊 Mercado", "🧭 Análisis BTC"], ["📅 Agenda", "🔔 Mis alertas"], ["⭐ Pro", "❓ Ayuda"]],
  resize_keyboard: true, is_persistent: true,
};
// Botones bajo cada publicación del canal: abren el bot con un comando (t.me/<bot>?start=<clave>)
const START = { pro: "/pro", guia: "/guia", plan: "/plan", prueba: "/prueba", mercado: "/mercado", noticias: "/noticias", analisis: "/analisis", agenda: "/agenda", alertas: "/misalertas", ayuda: "/ayuda" };
const FILAS_CANAL = [[["📊 Mercado", "mercado"], ["📰 Noticias", "noticias"]], [["🧭 Análisis BTC", "analisis"], ["📅 Agenda", "agenda"]], [["🔔 Crear alertas", "alertas"], ["☕ Abrir el bot", "ayuda"]]];
async function usuarioBot(env) {
  let u = await env.DB.get("botuser");
  if (!u) { const r = await tg(env, "getMe", {}); u = r && r.ok && r.result && r.result.username; if (u) await env.DB.put("botuser", u); }
  return u || null;
}
async function botonesCanal(env) {
  const u = await usuarioBot(env);
  if (!u) return undefined;
  return { inline_keyboard: FILAS_CANAL.map((f) => f.map(([t, k]) => ({ text: t, url: `https://t.me/${u}?start=${k}` }))) };
}
// Lista del botón azul "Menú"
const MENU = [
  { command: "mercado", description: "Resumen de las principales cripto" },
  { command: "precio", description: "Precio de una cripto: /precio btc" },
  { command: "analisis", description: "Lectura de Bitcoin (VWAP y medias)" },
  { command: "senales", description: "Señales automáticas: on / off" },
  { command: "alerta", description: "Crear alerta: /alerta btc 74000" },
  { command: "misalertas", description: "Ver tus alertas" },
  { command: "noticias", description: "Las 5 noticias del día" },
  { command: "agenda", description: "Eventos importantes de la semana" },
  { command: "termometro", description: "Qué tan agitado está el mercado" },
  { command: "radar", description: "Tu radar: /radar peso" },
  { command: "dolar", description: "Dólar, euro y bitcoin en pesos" },
  { command: "pregunta", description: "Pregúntale a Lana (IA)" },
  { command: "analiza", description: "Análisis profundo con IA (Pro)" },
  { command: "nueva", description: "Empezar una charla nueva con Lana" },
  { command: "pro", description: "Qué incluye Lana con Café Pro" },
  { command: "guia", description: "Guía gratis: tu primera inversión en México" },
  { command: "plan", description: "Tu plan de inversión en 30 días (premium)" },
  { command: "prueba", description: "7 días de Pro gratis" },
  { command: "invita", description: "3 amigos = 7 días Pro" },
  { command: "micuenta", description: "Tu plan y tus límites" },
  { command: "ayuda", description: "Ver todos los comandos" },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET") return new Response("Lana con Café: bot activo ✅");
    // v9: el Worker de noticias envía a Telegram a través de este bot (así su token no se copia a otro sitio)
    if (url.pathname === "/internal/tg") {
      if (!env.INTERNAL_SECRET || request.headers.get("x-internal-secret") !== env.INTERNAL_SECRET) return new Response("No autorizado", { status: 401 });
      const { method, body } = await request.json();
      if (!/^(sendMessage|sendPhoto|sendVideo|sendDocument|createChatInviteLink|revokeChatInviteLink|banChatMember|unbanChatMember|sendPoll|stopPoll|getChatMemberCount|getWebhookInfo)$/.test(method || ""))
        return Response.json({ ok: false, description: "método no permitido" }, { status: 400 });
      return Response.json(await tg(env, method, body || {}));
    }
    if (url.pathname !== "/telegram") return new Response("No encontrado", { status: 404 });
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET)
      return new Response("No autorizado", { status: 401 });
    let update;
    try { update = await request.json(); } catch { return new Response("ok"); }
    // v8: altas en el canal Pro → se avisan al Worker de noticias (para poder sacar a quien cancele)
    if (update.chat_member) {
      const pro = await canalPro(env);
      if (pro && env.NEWS_URL && env.FORWARD_SECRET && String(update.chat_member.chat.id) === String(pro)) {
        try {
          await fetch(`${env.NEWS_URL}/telegram/chat-member`, {
            method: "POST", headers: { "content-type": "application/json", "x-forward-secret": env.FORWARD_SECRET }, body: JSON.stringify(update),
          });
        } catch (e) { console.log("reenvío chat_member:", String(e)); }
      }
      return new Response("ok");
    }
    // v14: pagos con Telegram Stars (guía)
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const ok = q.currency === "XTR" && (q.invoice_payload === "plan30" || q.invoice_payload === "guia1");
      await tg(env, "answerPreCheckoutQuery", ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: "Este producto ya no está disponible." });
      return new Response("ok");
    }
    if (update.message && update.message.successful_payment) {
      try { await pagoRecibido(update.message, env); } catch (e) { console.log("pago:", e && e.stack || e); }
      return new Response("ok");
    }
    if (update.callback_query) {
      try { await manejarBoton(update.callback_query, env); } catch (e) { console.log("botón:", e && e.stack || e); }
      return new Response("ok");
    }
    try { await manejar(update, env); } catch (e) {
      console.log("Error:", e && e.stack || e);
      const c = update && update.message && update.message.chat && update.message.chat.id;
      if (c) { try { await enviar(env, c, "Algo falló al procesar ese comando. Intenta de nuevo en un minuto."); } catch {} }
    }
    return new Response("ok");
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.allSettled([revisarAlertas(env), revisarSenales(env), revisarCanal(env), revisarDifusion(env), webhookAlDia(env)]));
  },
};

// ---------- Telegram ----------
async function tg(env, metodo, datos) {
  const r = await fetch(`${env.TG_API || "https://api.telegram.org"}/bot${env.BOT_TOKEN}/${metodo}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(datos),
  });
  return r.json().catch(() => ({}));
}
// Envía texto escrito por el administrador: si trae símbolos que rompen el formato (<, &), lo reenvía como texto plano
async function enviarSeguro(env, chat, texto, extra = {}) {
  const r = await tg(env, "sendMessage", { chat_id: chat, text: texto, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
  if (r && r.ok === false && /parse entities|unsupported start tag|can't find end/i.test(r.description || ""))
    return tg(env, "sendMessage", { chat_id: chat, text: texto.replace(/<[^>]+>/g, ""), disable_web_page_preview: true, ...extra });
  return r;
}

// Publica en el canal de Telegram. Devuelve un texto listo para mostrarle al administrador.
async function publicarCanal(env, texto) {
  if (!env.CANAL_ID) return "⚠️ Falta la variable CANAL_ID en Cloudflare (por ejemplo @lanaconcafe).";
  const kb = await botonesCanal(env);
  const r = await enviarSeguro(env, env.CANAL_ID, texto, kb ? { reply_markup: kb } : {});
  if (r && r.ok) return `✅ Publicado en ${env.CANAL_ID}.`;
  const d = (r && r.description) || "";
  if (/chat not found/i.test(d)) return `⚠️ No encuentro el canal ${env.CANAL_ID}. Revisa que CANAL_ID sea el usuario correcto, con @.`;
  if (/not enough rights|not a member|administrator|kicked|forbidden/i.test(d))
    return `⚠️ El bot no tiene permiso en ${env.CANAL_ID}. Agrégalo como administrador con permiso de publicar mensajes.`;
  return `⚠️ No se pudo publicar en el canal. ${d}`.trim();
}

const enviar = (env, chat, texto) =>
  tg(env, "sendMessage", { chat_id: chat, text: texto, parse_mode: "HTML", disable_web_page_preview: true });

// ---------- Worker de noticias (Pro) ----------
async function news(env, ruta, datos) {
  if (!env.NEWS || !env.INTERNAL_SECRET) return { error: "Esta función se está configurando. Vuelve pronto ☕" };
  try {
    const r = await env.NEWS.fetch(`https://news${ruta}`, {
      method: datos ? "POST" : "GET",
      headers: { "content-type": "application/json", "x-internal-secret": env.INTERNAL_SECRET },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    return await r.json();
  } catch (e) {
    console.log("news", ruta, String(e));
    return { error: "No pude conectar con el servicio de noticias. Intenta en un minuto." };
  }
}
const PLAN_TXT = { pro: "⭐ Pro", api: "⭐ API", prueba: "🎁 Prueba Pro", gratis: "Gratis" };
const fechaCorta = (ms) => { const d = new Date(ms - 6 * 3600 * 1000); return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const SUBE_A_PRO = "\n\n⭐ Con <b>Pro</b> tienes más: /pro · o pruébalo gratis 7 días: /prueba";

async function preguntar(env, chat, from, q, extra = {}) {
  await tg(env, "sendChatAction", { chat_id: chat, action: "typing" });
  const r = await news(env, "/bot/ask", { tg: from, q, ...extra });
  if (r.text) return enviar(env, chat, r.text);
  return enviar(env, chat, `🤖 ${esc(r.error || "No pude responder.")}${r.upsell ? SUBE_A_PRO : ""}`);
}

// ---------- Precios ----------
// Coinbase primero (estable desde Cloudflare); CoinGecko solo para las que Coinbase no tiene
const CB = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", ripple: "XRP", cardano: "ADA", dogecoin: "DOGE",
  "avalanche-2": "AVAX", chainlink: "LINK", polkadot: "DOT", litecoin: "LTC", tether: "USDT" };
const CABECERAS = { accept: "application/json", "user-agent": "lanaconcafe-bot" };

async function precioCoinbase(id) {
  const r = await fetch(`https://api.exchange.coinbase.com/products/${CB[id]}-USD/stats`, { headers: CABECERAS });
  if (!r.ok) throw new Error("Coinbase " + r.status);
  const d = await r.json();
  const usd = parseFloat(d.last), abre = parseFloat(d.open);
  if (!(usd > 0)) throw new Error("Coinbase sin precio");
  return { usd, usd_24h_change: abre > 0 ? ((usd - abre) / abre) * 100 : null };
}

async function preciosCoingecko(ids) {
  const u = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const r = await fetch(u, { headers: CABECERAS });
  if (!r.ok) throw new Error("CoinGecko " + r.status);
  return r.json();
}

// Devuelve { id: { usd, usd_24h_change } } solo con las monedas que sí se pudieron leer
async function precios(ids) {
  const out = {};
  await Promise.all(ids.filter((i) => CB[i]).map(async (i) => { try { out[i] = await precioCoinbase(i); } catch (e) { console.log(i, String(e)); } }));
  const faltan = ids.filter((i) => !out[i]);
  if (faltan.length) {
    try { const g = await preciosCoingecko(faltan); for (const i of faltan) if (g[i] && g[i].usd != null) out[i] = g[i]; }
    catch (e) { console.log("CoinGecko:", String(e)); }
  }
  return out;
}
const fmt = (n) => n >= 1 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : n.toPrecision(4);
const cambio = (c) => c == null ? "" : ` (${c >= 0 ? "▲ +" : "▼ "}${c.toFixed(2)}% 24h)`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- Comandos ----------
export function parsear(texto) {
  const partes = texto.trim().split(/\s+/);
  const cmd = partes[0].toLowerCase().replace(/@\w+$/, "");
  return { cmd, args: partes.slice(1) };
}

// ---------- Bienvenida (v12) ----------
const TEMAS_INICIO = [["💵 Dólar / peso", "peso"], ["🏦 Banxico", "banxico"], ["₿ Bitcoin", "bitcoin"], ["📈 Nvidia", "nvidia"], ["🛢️ Petróleo", "petroleo"], ["🏛️ Fed", "fed"]];
const BIENVENIDA =
`☕ <b>¡Bienvenido a Lana con Café!</b>

Te aviso de las noticias que mueven tu dinero y te las explico en español claro.

<b>1️⃣ Elige qué quieres seguir</b> (toca uno) y te aviso cuando salga algo:

<b>2️⃣ Pregúntame lo que quieras</b>, como a un amigo que sabe de dinero:
<i>“¿Me conviene ahorrar en dólares?”</i> · <i>“¿Qué pasa si Banxico baja la tasa?”</i>`;
const tecladoTemas = () => ({ inline_keyboard: [0, 2, 4].map((i) => TEMAS_INICIO.slice(i, i + 2).map(([t, k]) => ({ text: t, callback_data: `radar:${k}` }))) });

async function manejarBoton(q, env) {
  const from = q.from && q.from.id, chat = q.message && q.message.chat && q.message.chat.id;
  const [tipo, valor] = String(q.data || "").split(":");
  if (tipo === "radar" && from && chat) {
    const r = await news(env, "/bot/radar", { tg: from, op: "add", term: valor });
    const etiqueta = (TEMAS_INICIO.find(([, k]) => k === valor) || [valor])[0];
    if (r.error && !r.terms) return tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: r.error, show_alert: true });
    if (r.error) {
      await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
      return enviar(env, chat, `🎯 ${esc(r.error)}\nTu radar: ${esc((r.terms || []).join(", "))}${SUBE_A_PRO}`);
    }
    return tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: `✅ ${etiqueta} agregado a tu radar (${(r.terms || []).length}/${r.limit})` });
  }
  // v14: aprobar / descartar un video del día (solo admin)
  if (tipo === "ap" && from) {
    const [, id, voto] = String(q.data).split(":");
    const r = await news(env, "/bot/approve", { tg: from, id, ok: voto === "ok" });
    if (r.error) return tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: r.error, show_alert: true });
    const etiqueta = r.status === "approved" ? (r.late ? "✅ Aprobado (tarde: sale en la siguiente revisión)" : `✅ Aprobado: sale a las ${r.slot}`) : "❌ Descartado: no se publicará";
    if (chat && q.message) await tg(env, "editMessageReplyMarkup", { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [
      [{ text: etiqueta, callback_data: "noop" }],
      [{ text: r.status === "approved" ? "Cambiar a ❌" : "Cambiar a ✅", callback_data: `ap:${id}:${r.status === "approved" ? "no" : "ok"}` }],
    ] } });
    return tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: etiqueta });
  }
  if (tipo === "guia" && chat) {
    await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
    return guiaGratis(env, chat, from);
  }
  if (tipo === "plan" && chat) {
    await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
    if (valor === "espera") { await news(env, "/bot/plan-wait", { tg: from }); return enviar(env, chat, "✅ Listo: te aviso aquí en cuanto salga <b>Tu plan de inversión en 30 días</b>."); }
    if (valor === "comprar") return facturaPlan(env, chat);
  }
  return tg(env, "answerCallbackQuery", { callback_query_id: q.id });
}

// ---------- v14: guía de pago ----------
async function enCanal(env, user) {
  const r = await tg(env, "getChatMember", { chat_id: env.CANAL_ID || "@LanaconCafe", user_id: user });
  return !!(r && r.ok && ["member", "administrator", "creator", "restricted"].includes(r.result.status));
}
async function guiaGratis(env, chat, from) {
  const g = await news(env, "/bot/guide", { tg: from });
  if (!(await enCanal(env, from))) {
    return tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML",
      text: `📖 <b>${esc(g.title || "Tu primera inversión en México")}</b> es gratis para los miembros del canal.\n\n1️⃣ Únete al canal de Lana con Café (noticias que mueven tu dinero, cada día).\n2️⃣ Regresa y toca <b>"Ya me uní"</b>.`,
      reply_markup: { inline_keyboard: [[{ text: "☕ Unirme al canal", url: "https://t.me/LanaconCafe" }], [{ text: "✅ Ya me uní", callback_data: "guia:check" }]] } });
  }
  const r = await tg(env, "sendDocument", { chat_id: chat, document: g.free_url, parse_mode: "HTML",
    caption: `📖 <b>${esc(g.title || "")}</b> · guía básica gratuita (20 páginas)\n\n¿Quieres pasar de entender a decidir? Mira <b>/plan</b>: tu plan de inversión en 30 días.` });
  if (!r || !r.ok) return enviar(env, chat, `📖 Descarga tu guía aquí: ${g.free_url}`);
}
async function facturaPlan(env, chat) {
  const g = await news(env, "/bot/guide", {});
  const p = g.plan || {};
  if (!p.ready) return enviar(env, chat, "📘 El plan todavía se está terminando. Toca /plan y elige \"Avísame\" para que te llegue en cuanto salga.");
  return tg(env, "sendInvoice", { chat_id: chat, title: (p.title || "Plan de 30 días").slice(0, 32), description: "Guía premium + hoja de cálculo. Comparativas actualizadas cada mes, portafolios por perfil, plan día por día e impuestos. Garantía de 7 días con /reembolso.", payload: "plan30", currency: "XTR", prices: [{ label: "Plan de inversión 30 días", amount: p.stars || 875 }] });
}
async function entregar(env, chat, r, titulo) {
  const ok = r.url ? await tg(env, "sendDocument", { chat_id: chat, document: r.url, caption: titulo, parse_mode: "HTML" }) : null;
  if (r.sheet) await tg(env, "sendDocument", { chat_id: chat, document: r.sheet, caption: "📊 Tu hoja de cálculo del plan (ábrela en Excel o súbela a Google Sheets)." });
  if (!ok || !ok.ok) return enviar(env, chat, `Descarga aquí (válido 2 horas): ${r.url || "escribe /miguia"}${r.sheet ? "\nHoja de cálculo: " + r.sheet : ""}`);
}
async function pagoRecibido(msg, env) {
  const p = msg.successful_payment, chat = msg.chat.id;
  const r = await news(env, "/bot/purchase", { tg: msg.from.id, charge_id: p.telegram_payment_charge_id, product: p.invoice_payload, stars: p.total_amount });
  return entregar(env, chat, r, "📘 <b>¡Gracias por tu compra!</b> Aquí está tu plan.\n\nCada mes actualizamos las comparativas: descarga la versión nueva con /miguia. Si no te sirvió, tienes 7 días para pedir tu reembolso con /reembolso.");
}

// ID del canal Pro: variable PRO_CANAL_ID o el que el admin registró reenviando un mensaje del canal
async function canalPro(env) {
  return env.PRO_CANAL_ID || (await env.DB.get("pro_canal")) || null;
}

async function manejar(update, env) {
  const msg = update.message;
  if (!msg) return;
  // v10: el admin reenvía un mensaje de un canal → el bot le dice su ID y lo guarda como canal Pro
  const origen = msg.forward_origin && msg.forward_origin.type === "channel" ? msg.forward_origin.chat : (msg.forward_from_chat && msg.forward_from_chat.type === "channel" ? msg.forward_from_chat : null);
  if (origen && msg.chat.type === "private") {
    if (String(msg.from && msg.from.id) !== String(env.ADMIN_ID)) return;
    if (env.CANAL_ID && origen.username && ("@" + origen.username).toLowerCase() === String(env.CANAL_ID).toLowerCase())
      return enviar(env, msg.chat.id, `Ese es tu canal <b>público</b> (${esc(env.CANAL_ID)}). Reenvíame un mensaje del canal <b>Pro privado</b>.`);
    await env.DB.put("pro_canal", String(origen.id));
    await env.DB.put("pro_canal_titulo", origen.title || "");
    return enviar(env, msg.chat.id, `✅ Canal Pro registrado: <b>${esc(origen.title || "")}</b>\nID: <code>${origen.id}</code>\n\nAhora crea la suscripción con Stars, por ejemplo:\n<code>/crearsuscripcion 500</code>\n\nY escribe /configurar para activar los avisos de altas y bajas del canal.`);
  }
  if (!msg.text) return;
  const chat = msg.chat.id;
  const boton = BOTONES[msg.text.trim()];
  let { cmd, args } = parsear(boton || msg.text);
  // Llegó desde un botón del canal (/start mercado): muestra el teclado y responde ese comando
  if (cmd === "/start" && args[0] && START[args[0].toLowerCase()]) {
    cmd = START[args[0].toLowerCase()]; args = [];
    await tg(env, "sendMessage", { chat_id: chat, text: "☕ ¡Bienvenido a Lana con Café! Usa los botones de abajo cuando quieras.", reply_markup: TECLADO });
  }
  const esAdmin = String(msg.from && msg.from.id) === String(env.ADMIN_ID);

  // registrar usuario (para difusiones y /stats): guarda la fecha en que llegó, solo la primera vez
  const nuevo = !(await env.DB.get(`u:${chat}`));
  if (nuevo) await env.DB.put(`u:${chat}`, horaLocal().fecha);
  if (nuevo && msg.chat.type === "private") await news(env, "/bot/welcome", { tg: msg.from && msg.from.id }); // secuencia día 1 / día 3
  const from = msg.from && msg.from.id;
  const privado = msg.chat.type === "private";

  // v11: tocó "¿Qué significa para mí?" en una alerta (/start q_<id de la noticia>)
  if (cmd === "/start" && args[0] && /^q_[0-9a-f]{32}$/.test(args[0])) {
    if (nuevo) await tg(env, "sendMessage", { chat_id: chat, text: "☕ ¡Bienvenido a Lana con Café! Te explico esa noticia…", reply_markup: TECLADO });
    return preguntar(env, chat, from, "", { news_id: args[0].slice(2) });
  }

  // v13: llegó con el enlace de un creador aliado (/start a_codigo): se le atribuye (solo usuarios nuevos)
  if (cmd === "/start" && args[0] && /^a_[a-z0-9_]{3,20}$/.test(args[0])) {
    if (nuevo) await news(env, "/bot/attribute", { tg: from, code: args[0].slice(2) });
    args = [];
  }

  // v9: llegó con el enlace de un amigo (/start ref_123)
  if (cmd === "/start" && args[0] && /^ref_\d+$/.test(args[0])) {
    if (nuevo) await news(env, "/bot/referral", { referrer: Number(args[0].slice(4)), tg: from });
    args = [];
  }

  switch (cmd) {
    case "/start":
      if (nuevo && privado) {
        await tg(env, "sendMessage", { chat_id: chat, text: "☕", reply_markup: TECLADO }); // deja el teclado de abajo
        return tg(env, "sendMessage", { chat_id: chat, text: BIENVENIDA, parse_mode: "HTML", reply_markup: tecladoTemas() });
      }
      return tg(env, "sendMessage", { chat_id: chat, text: AYUDA, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: TECLADO });
    case "/ayuda": case "/help":
      return tg(env, "sendMessage", { chat_id: chat, text: AYUDA, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: TECLADO });
    case "/temas":
      return tg(env, "sendMessage", { chat_id: chat, text: "🎯 Toca lo que quieras seguir:", reply_markup: tecladoTemas() });

    case "/configurar": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const r = await tg(env, "setMyCommands", { commands: MENU });
      // v8: pedir a Telegram también los avisos de altas en canales (chat_member), conservando la URL y el secreto actuales
      const info = await tg(env, "getWebhookInfo", {});
      const w = info && info.ok && info.result && info.result.url
        ? await tg(env, "setWebhook", { url: info.result.url, secret_token: env.WEBHOOK_SECRET, allowed_updates: UPDATES })
        : { ok: false };
      return enviar(env, chat, (r.ok ? "✅ Menú azul configurado. Cierra y vuelve a abrir el chat para verlo." : "No se pudo configurar el menú.") +
        (w.ok ? "\n✅ Webhook: altas del canal Pro activadas." : "\n⚠️ No pude actualizar el webhook (avisos del canal Pro)."));
    }

    // ---- v9: Pro ----
    case "/analiza": case "/analizar":
      if (!args.length) return enviar(env, chat, "🔬 <b>Análisis profundo</b> (Pro): escribe qué quieres analizar.\nEj.: <i>/analiza ¿cómo afecta la decisión de Banxico a los Cetes y al dólar?</i>");
      return preguntar(env, chat, from, args.join(" "), { deep: true });

    case "/nueva": case "/olvidar": {
      await news(env, "/bot/forget", { tg: from });
      return enviar(env, chat, "🧹 Listo, empezamos de cero. ¿Qué quieres saber?");
    }

    case "/pregunta": case "/lana":
      if (!args.length) return enviar(env, chat, "🤖 Escríbeme tu pregunta. Ej.: <i>/pregunta ¿qué pasa si Banxico baja la tasa?</i>\nTambién puedes escribirme sin comando.");
      return preguntar(env, chat, from, args.join(" "));

    case "/termometro": case "/termómetro": {
      const r = await news(env, "/bot/thermo");
      return enviar(env, chat, (r.text || esc(r.error || "Sin datos")) + AVISO);
    }

    case "/radar": case "/sigo": case "/dejar": {
      const quitar = cmd === "/dejar" || (args[0] || "").toLowerCase() === "quitar";
      const termino = (quitar && cmd === "/radar" ? args.slice(1) : args).join(" ");
      const r = await news(env, "/bot/radar", { tg: from, op: termino ? (quitar ? "del" : "add") : "list", term: termino });
      if (r.error && !r.terms) return enviar(env, chat, `🎯 ${esc(r.error)}${r.upsell ? SUBE_A_PRO : ""}`);
      const lista = (r.terms || []).length ? r.terms.map((t) => `• ${esc(t)}`).join("\n") : "Todavía no sigues nada.";
      return enviar(env, chat, `🎯 <b>Tu radar</b> (${(r.terms || []).length}/${r.limit})\n${lista}\n\n` +
        (r.error ? `⚠️ ${esc(r.error)}\n\n` : "") +
        `Agregar: <code>/radar nvidia</code> · Quitar: <code>/dejar nvidia</code>\n` +
        `Te aviso por aquí cuando salga una noticia con esas palabras${r.delay ? ` (con ${r.delay} min de retraso en el plan gratis)` : " al instante ⚡"}.` +
        (r.error && r.upsell ? SUBE_A_PRO : ""));
    }

    case "/dolar": case "/dólar": {
      const r = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD", { headers: CABECERAS });
      const d = r.ok ? (await r.json()).data : null;
      const mxn = d && parseFloat(d.rates.MXN), eur = d && parseFloat(d.rates.EUR);
      if (!(mxn > 0)) return enviar(env, chat, "No pude leer el tipo de cambio ahora. Intenta en un minuto.");
      const btc = (await precios(["bitcoin"])).bitcoin;
      return enviar(env, chat, `💵 <b>Tipo de cambio</b>\n• Dólar: <b>$${mxn.toFixed(2)} MXN</b>\n• Euro: <b>$${(mxn / eur).toFixed(2)} MXN</b>` +
        (btc ? `\n• Bitcoin: <b>$${Math.round(btc.usd * mxn).toLocaleString("en-US")} MXN</b>` : "") +
        `\n\n<i>Referencia de mercado (Coinbase). Tu banco o casa de cambio cobra un margen.</i>` + AVISO);
    }

    case "/pro": {
      const c = await news(env, "/bot/account", { tg: from });
      const yaPro = c.plan === "pro" || c.plan === "api";
      const proLink = await env.DB.get("pro_link"), proStars = await env.DB.get("pro_stars");
      const precio = await news(env, "/api/pro");
      return tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", disable_web_page_preview: true,
        text: `<b>⭐ Lana con Café Pro · $${precio.price_mxn || 99} MXN/mes</b>${proLink ? ` (${proStars} ⭐)` : ""}\n` +
          (precio.founder ? `🔥 <b>Precio de fundador de por vida</b>: quedan ${precio.founders_left} de ${precio.founders_total} lugares (después $${precio.regular_mxn}).\n` : "") + `\n` +
          `⚡ <b>Alertas al instante</b> en el canal Pro privado (el gratis las ve 15 min después)\n` +
          `🎯 <b>Radar personal</b> de hasta 10 temas: peso, Banxico, Nvidia, Cetes… te aviso al momento\n` +
          `🤖 <b>Pregúntale a Lana</b>: 100 preguntas al día a la IA, con las noticias de hoy y tu radar\n` +
          `🔬 <b>/analiza</b>: 5 análisis profundos al día (qué pasó, por qué importa, escenarios)\n` +
          `💬 Botón <b>"¿Qué significa para mí?"</b> en cada alerta\n` +
          `☀️ <b>Briefing personal</b> a las 7:00 con tu radar y la agenda del día\n` +
          `⏰ <b>Recordatorios</b> 15 min antes de cada dato importante (inflación, Banxico, Fed)\n` +
          `🌡️ Activos afectados y sesgo probable en cada alerta\n\n` +
          (yaPro ? "✅ Ya eres Pro. ¡Gracias por apoyar Lana con Café!" : c.plan === "prueba" ? `🎁 Tienes prueba Pro hasta el ${fechaCorta(c.until)}.` : "Pruébalo gratis 7 días con /prueba") + AVISO,
        reply_markup: yaPro ? undefined : { inline_keyboard: [[proLink
          ? { text: `⭐ Suscribirme · ${proStars} Stars al mes`, url: proLink }
          : { text: "⭐ Hazte Pro", url: `${env.NEWS_URL || "https://lanaconcafe-news.gt2hf24n6t.workers.dev"}/precios.html` }]] },
      });
    }

    case "/prueba": {
      const r = await news(env, "/bot/trial", { tg: from });
      if (r.error) return enviar(env, chat, `🎁 ${esc(r.error)}`);
      return enviar(env, chat, `🎁 <b>¡Tienes Pro gratis hasta el ${fechaCorta(r.until)}!</b>\n\nPrueba:\n• <code>/radar peso</code> y <code>/radar banxico</code>\n• Escríbeme cualquier pregunta sobre el mercado\n• Mañana a las 7:00 te llega tu briefing personal ☀️`);
    }

    case "/invita": {
      const u = await usuarioBot(env);
      const c = await news(env, "/bot/account", { tg: from });
      const n = c.referrals || 0;
      const enlace = `https://t.me/${u}?start=ref_${from}`;
      return tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", disable_web_page_preview: true,
        text: `🎁 <b>Invita y gana Pro</b>\nPor cada 3 amigos que entren con tu enlace ganas <b>7 días Pro</b>.\n\nTu enlace:\n${enlace}\n\nLlevas <b>${n}</b> (${n % 3}/3 para el siguiente premio).`,
        reply_markup: { inline_keyboard: [[{ text: "📤 Compartir", url: `https://t.me/share/url?url=${encodeURIComponent(enlace)}&text=${encodeURIComponent("☕ Las noticias que mueven tu dinero, en Telegram:")}` }]] },
      });
    }

    case "/micuenta": {
      const c = await news(env, "/bot/account", { tg: from });
      if (c.error) return enviar(env, chat, esc(c.error));
      return enviar(env, chat, `👤 <b>Tu cuenta</b>\nPlan: <b>${PLAN_TXT[c.plan] || c.plan}</b>${c.until ? ` (hasta el ${fechaCorta(c.until)})` : ""}\n` +
        `🤖 Preguntas hoy: ${c.asks_today}/${c.limits.asks}\n🔬 Análisis hoy: ${c.deep_today || 0}/${c.limits.deep}\n🎯 Radar: ${c.terms.length}/${c.limits.radar}${c.terms.length ? ` (${esc(c.terms.join(", "))})` : ""}\n` +
        `🎁 Amigos invitados: ${c.referrals}` + (c.plan === "gratis" ? (c.trial_used ? "\n\nGana días Pro con /invita" : "\n\nPrueba Pro gratis: /prueba") : ""));
    }

    // ---- v9: agenda con recordatorios (admin) ----
    case "/evento": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const r = await news(env, "/bot/event", { date: args[0], time: args[1], title: args.slice(2).join(" ") });
      return enviar(env, chat, r.ok ? `✅ Evento guardado: ${r.when}. Los Pro reciben recordatorio 15 min antes.` : esc(r.error || "Error"));
    }
    case "/borraevento": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      await news(env, "/bot/event-del", { id: Number(args[0]) });
      return enviar(env, chat, "🗑️ Listo.");
    }
    case "/regalar": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const r = await news(env, "/bot/gift", { tg: Number(args[0]), days: Number(args[1] || 7) });
      return enviar(env, chat, r.ok ? `🎁 Pro regalado hasta ${fechaCorta(r.until)}.` : "Uso: /regalar ID_DE_TELEGRAM DIAS");
    }
    case "/prostats": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      return enviar(env, chat, `<pre>${esc(JSON.stringify(await news(env, "/bot/stats"), null, 1))}</pre>`);
    }

    case "/crearsuscripcion": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const pro = await canalPro(env);
      if (!pro) return enviar(env, chat, "Primero reenvíame cualquier mensaje del canal Pro privado para registrar su ID.");
      const estrellas = parseInt(args[0], 10);
      if (!(estrellas >= 1 && estrellas <= 10000)) return enviar(env, chat, "Uso: /crearsuscripcion 500  (precio mensual en Stars ⭐)");
      const r = await tg(env, "createChatSubscriptionInviteLink", { chat_id: pro, name: "Lana con Café Pro", subscription_period: 2592000, subscription_price: estrellas });
      if (!r || !r.ok) return enviar(env, chat, `⚠️ Telegram no creó la suscripción: ${esc((r && r.description) || "error")}\nRevisa que el bot sea administrador del canal Pro con permiso de <b>invitar usuarios</b>.`);
      await env.DB.put("pro_link", r.result.invite_link);
      await env.DB.put("pro_stars", String(estrellas));
      return enviar(env, chat, `✅ <b>Suscripción creada</b>: ${estrellas} ⭐ al mes\n${r.result.invite_link}\n\nYa aparece en /pro. Quien pague entra al canal y se le activa Pro en el bot; si deja de pagar, Telegram lo saca y se le desactiva.`);
    }

    // ---- v15: scalping (solo admin, en prueba) ----
    case "/scalp": case "/scalping": {
      await tg(env, "sendChatAction", { chat_id: chat, action: "typing" });
      const r = await news(env, "/bot/scalp", { tg: from });
      return enviarSeguro(env, chat, r.text || r.error || "No pude leer el mercado ahora.", { disable_web_page_preview: true });
    }
    case "/bitacora": case "/bitácora": {
      const r = await news(env, "/bot/scalp-stats", { tg: from });
      return enviarSeguro(env, chat, r.text || r.error || "Sin datos.");
    }

    // ---- v14: guía ----
    case "/guia": case "/guía":
      return guiaGratis(env, chat, from);
    case "/plan": {
      const g = await news(env, "/bot/guide", { tg: from });
      const p = g.plan || {};
      if (p.bought) return enviar(env, chat, "📘 Ya tienes el plan. Descarga la versión más reciente con /miguia");
      return tg(env, "sendMessage", { chat_id: chat, parse_mode: "HTML", disable_web_page_preview: true,
        text: `📘 <b>${esc(p.title || "Tu plan de inversión en 30 días")}</b>\n${esc(p.subtitle || "")}.\n\n` +
          `• <b>Dónde poner tu dinero hoy</b>: comparativa de CETES, Sofipos, cuentas digitales, pagarés y fondos (tasa, GAT real, seguro, liquidez), actualizada cada mes\n` +
          `• <b>Portafolios modelo</b> según tu perfil y cuánto puedes ahorrar\n• <b>Plan de 30 días</b>, día por día\n• <b>Impuestos</b>: constancias, declaración y deducciones (Afore, PPR)\n` +
          `• <b>Bolsa y ETFs desde México</b>: casas de bolsa, SIC, comisiones e impuestos\n• <b>Casos resueltos</b> con números reales\n• <b>Hoja de cálculo</b>: presupuesto, fondo de emergencia, simuladores y seguimiento\n\n` +
          `✅ Fuentes oficiales · sin afiliados · sin promesas de rendimiento · garantía de 7 días\n<b>${p.stars || 875} ⭐</b> (aprox. $${p.mxn || 349} MXN)` + AVISO,
        reply_markup: { inline_keyboard: [[p.ready ? { text: `⭐ Comprar · ${p.stars || 875} Stars`, callback_data: "plan:comprar" } : { text: "🔔 Avísame cuando salga", callback_data: "plan:espera" }], [{ text: "📖 Guía básica gratis", callback_data: "guia:gratis" }]] } });
    }
    case "/miguia": case "/miguía": case "/miplan": {
      const r = await news(env, "/bot/download", { tg: from });
      if (r.error) return enviar(env, chat, `📘 ${esc(r.error)}`);
      return entregar(env, chat, r, "📘 Tu plan, versión más reciente.");
    }
    case "/reembolso": {
      const c = await news(env, "/bot/purchase-of", { tg: from });
      if (c.error) return enviar(env, chat, "No encuentro compras con tu cuenta.");
      if (c.refunded) return enviar(env, chat, "Esa compra ya fue reembolsada.");
      if (Date.now() - c.created_at > 7 * 86400000) return enviar(env, chat, "La garantía es de 7 días y ya pasaron. Si hubo un problema con tu compra, escríbenos y lo revisamos.");
      const r = await tg(env, "refundStarPayment", { user_id: from, telegram_payment_charge_id: c.charge_id });
      if (!r || !r.ok) return enviar(env, chat, `No pude procesar el reembolso automático (${esc((r && r.description) || "error")}). Ya avisé al equipo para resolverlo.`);
      await news(env, "/bot/refunded", { admin: env.ADMIN_ID, charge_id: c.charge_id });
      if (env.ADMIN_ID) await enviar(env, env.ADMIN_ID, `↩️ Reembolso de la guía: ${c.stars} ⭐ (usuario ${from})`);
      return enviar(env, chat, `↩️ Listo, te devolvimos tus ${c.stars} ⭐. Gracias por darnos la oportunidad; si quieres, cuéntanos qué le faltó a la guía.`);
    }
    case "/estudio": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const r = await news(env, "/bot/studio-stats", {});
      const clics = (r.clicks || []).map((c) => `${c.src} → ${c.dest}: ${c.n}`).join("\n") || "sin clics todavía";
      const ap = (r.approvals || []).map((a) => `${a.status}: ${a.n}`).join(" · ") || "ninguno";
      return enviar(env, chat, `🎬 <b>Últimos 7 días</b>\n\n<b>Bio por red</b> (view = visitas):\n${esc(clics)}\n\n<b>Videos</b>: ${esc(ap)}\n<b>Guías vendidas</b>: ${(r.purchases || {}).n || 0} (${(r.purchases || {}).stars || 0} ⭐)`);
    }

    // ---- v13: crecimiento ----
    case "/kit": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      await enviar(env, chat, "🎬 Generando el kit de contenido…");
      const r = await news(env, "/bot/kit", {});
      return r.sent ? undefined : enviar(env, chat, `No se pudo generar: ${esc(r.reason || r.error || "error")}`);
    }

    case "/afiliado": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      // /afiliado codigo [pct] [id_telegram] [Nombre del creador]
      const [codigo, ...resto] = args;
      if (!codigo) return enviar(env, chat, "Uso: <code>/afiliado juanfinanzas 40 123456789 Juan Finanzas</code>\n(código, % de comisión, ID de Telegram del creador si lo tienes, nombre)");
      const pct = /^\d{1,2}$/.test(resto[0] || "") ? Number(resto.shift()) : 40;
      const tgId = /^\d{5,}$/.test(resto[0] || "") ? Number(resto.shift()) : undefined;
      const r = await news(env, "/bot/aff-create", { code: codigo.toLowerCase(), pct, tg: tgId, name: resto.join(" ") || codigo });
      if (r.error) return enviar(env, chat, esc(r.error));
      return enviar(env, chat, `✅ <b>Afiliado ${esc(r.code)}</b> · ${r.pct}% de comisión\n\nEnlaces para que comparta:\n🌐 ${esc(r.web)}\n🤖 ${esc(r.bot || "")}\n\nQuien entre por ahí y se suscriba a Pro le cuenta a este creador. ${tgId ? "Puede ver sus números con /comisiones." : "Si me das su ID de Telegram, podrá ver sus números con /comisiones."}`);
    }

    case "/afiliados": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const r = await news(env, "/bot/aff-report", {});
      const filas = (r.affiliates || []).filter(Boolean);
      if (!filas.length) return enviar(env, chat, "Aún no hay afiliados. Crea uno con /afiliado");
      const total = filas.reduce((a, f) => a + f.commission_mxn, 0);
      return enviar(env, chat, `🤝 <b>Afiliados · este mes</b>\n<i>Comisión = suscriptores Pro activos × $${r.net_mxn} neto × %</i>\n\n` +
        filas.map((f) => `<b>${esc(f.name)}</b> (${esc(f.code)}, ${f.pct}%)\n👆 ${f.clicks} clics · 👤 ${f.users} usuarios · ⭐ ${f.pro} Pro → <b>$${f.commission_mxn} MXN</b>`).join("\n\n") +
        `\n\n<b>Total a pagar: $${total} MXN</b>`);
    }

    case "/comisiones": {
      const r = await news(env, "/bot/aff-mine", { tg: from });
      if (r.error) return enviar(env, chat, esc(r.error));
      return enviar(env, chat, `🤝 <b>Tus números, ${esc(r.name)}</b>\n👆 ${r.clicks} clics · 👤 ${r.users} personas llegaron con tu enlace · ⭐ ${r.pro} Pro activos\n💰 Comisión estimada este mes: <b>$${r.commission_mxn} MXN</b> (${r.pct}%)\n\nTus enlaces:\n🌐 ${esc(r.web)}\n🤖 ${esc(r.bot || "")}`);
    }

    case "/miid":
      return enviar(env, chat, `Tu ID es: <code>${msg.from.id}</code>`);

    case "/precio": {
      const id = MONEDAS[(args[0] || "").toLowerCase()];
      if (!id) return enviar(env, chat, "Escribe por ejemplo: /precio btc\nMonedas: btc, eth, sol, xrp, bnb, ada, doge, ton, avax, link, dot, ltc");
      const p = (await precios([id]))[id];
      if (!p) return enviar(env, chat, "No pude leer el precio en este momento. Intenta de nuevo en un minuto.");
      return enviar(env, chat, `<b>${NOMBRE[id]}</b>: $${fmt(p.usd)}${cambio(p.usd_24h_change)}` + AVISO);
    }

    case "/mercado": {
      const ids = ["bitcoin", "ethereum", "solana", "ripple", "binancecoin"];
      const p = await precios(ids);
      const lineas = ids.filter((i) => p[i]).map((i) => `• <b>${NOMBRE[i]}</b>: $${fmt(p[i].usd)}${cambio(p[i].usd_24h_change)}`);
      if (!lineas.length) return enviar(env, chat, "No pude leer el precio en este momento. Intenta de nuevo en un minuto.");
      return enviar(env, chat, `<b>Mercado cripto ahora</b>\n${lineas.join("\n")}` + AVISO);
    }

    case "/alerta": {
      const id = MONEDAS[(args[0] || "").toLowerCase()];
      const objetivo = parseFloat((args[1] || "").replace(/[$,]/g, ""));
      if (!id || !(objetivo > 0)) return enviar(env, chat, "Escribe por ejemplo: /alerta btc 73000");
      const lista = JSON.parse((await env.DB.get(`a:${chat}`)) || "[]");
      if (lista.length >= MAX_ALERTAS) return enviar(env, chat, `Tienes el máximo de ${MAX_ALERTAS} alertas. Borra una con /borrar.`);
      const pa = (await precios([id]))[id];
      if (!pa) return enviar(env, chat, "No pude leer el precio en este momento. Intenta de nuevo en un minuto.");
      const actual = pa.usd;
      const dir = objetivo >= actual ? "sube" : "baja";
      lista.push({ id, objetivo, dir });
      await env.DB.put(`a:${chat}`, JSON.stringify(lista));
      await indexar(env, chat, true);
      return enviar(env, chat, `✅ Te aviso cuando <b>${NOMBRE[id]}</b> ${dir === "sube" ? "suba a" : "baje a"} <b>$${fmt(objetivo)}</b>.\nAhora está en $${fmt(actual)}.`);
    }

    case "/misalertas": {
      const lista = JSON.parse((await env.DB.get(`a:${chat}`)) || "[]");
      if (!lista.length) return enviar(env, chat, "No tienes alertas. Crea una con /alerta btc 73000");
      return enviar(env, chat, "<b>Tus alertas</b>\n" + lista.map((a, i) =>
        `${i + 1}. ${NOMBRE[a.id]} ${a.dir === "sube" ? "≥" : "≤"} $${fmt(a.objetivo)}`).join("\n"));
    }

    case "/borrar": {
      let lista = JSON.parse((await env.DB.get(`a:${chat}`)) || "[]");
      if ((args[0] || "").toLowerCase() === "todas") lista = [];
      else {
        const n = parseInt(args[0], 10);
        if (!(n >= 1 && n <= lista.length)) return enviar(env, chat, "Escribe /borrar y el número (míralo en /misalertas), o /borrar todas");
        lista.splice(n - 1, 1);
      }
      await env.DB.put(`a:${chat}`, JSON.stringify(lista));
      if (!lista.length) await indexar(env, chat, false);
      return enviar(env, chat, "🗑️ Listo.");
    }

    case "/noticias":
      return enviarSeguro(env, chat, (await env.DB.get("noticias")) || "Aún no hay noticias de hoy. Vuelve más tarde.");

    case "/agenda": {
      const ev = await news(env, "/bot/events", { days: 7 });
      const lista = (ev.events || []).map((e) => `• <b>${e.when}</b> · ${esc(e.title)}`).join("\n");
      const texto = await env.DB.get("agenda");
      if (!lista && !texto) return enviar(env, chat, "La agenda de la semana todavía no está publicada.");
      return enviarSeguro(env, chat, (lista ? `📅 <b>Próximos eventos</b> (hora CDMX)\n${lista}\n\n⏰ Los Pro reciben recordatorio 15 min antes.` : "") + (texto ? `${lista ? "\n\n" : ""}${texto}` : ""));
    }

    // ---- Solo administrador ----
    case "/setnoticias": case "/setagenda": {
      if (!esAdmin) return;
      const contenido = msg.text.slice(msg.text.indexOf(" ") + 1).trim();
      if (!contenido || contenido.startsWith("/")) return enviar(env, chat, "Escribe el texto después del comando.");
      await env.DB.put(cmd === "/setnoticias" ? "noticias" : "agenda", contenido);
      if (cmd === "/setnoticias" && env.CANAL_ID) {
        const res = await publicarCanal(env, `<b>☕ Las 5 noticias de hoy</b>\n\n${contenido}` + AVISO);
        return enviar(env, chat, "✅ Guardado.\n" + res);
      }
      return enviar(env, chat, "✅ Guardado.");
    }

    case "/canal": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const contenido = msg.text.slice(msg.text.indexOf(" ") + 1).trim();
      if (!contenido || contenido.startsWith("/")) return enviar(env, chat, "Escribe el mensaje después del comando. Ejemplo: /canal Buenos días ☕");
      return enviar(env, chat, await publicarCanal(env, contenido));
    }

    case "/menucanal": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const res = await publicarCanal(env, "<b>☕ Lana con Café</b>\nPrecios, alertas y las 5 noticias del día.\n\nToca un botón para abrir el bot 👇");
      return enviar(env, chat, res + (res.startsWith("✅") ? "\nAhora fija esa publicación en el canal (mantén presionado → Fijar)." : ""));
    }

    case "/stats": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      return enviar(env, chat, await estadisticas(env));
    }

    case "/probarcanal": {
      if (!esAdmin) return enviar(env, chat, "Solo el administrador puede usar este comando.");
      const r1 = await publicarResumen(env);
      const r2 = await publicarEncuesta(env);
      return enviar(env, chat, `Resumen: ${r1}\nEncuesta: ${r2}\nEl resultado de la encuesta sale solo a las 8 pm (o 1 hora después si la publicaste más tarde).`);
    }

    case "/difundir": {
      if (!esAdmin) return;
      const contenido = msg.text.slice(msg.text.indexOf(" ") + 1).trim();
      if (!contenido || contenido.startsWith("/")) return enviar(env, chat, "Escribe el mensaje después de /difundir");
      // v8: se guarda y el cron lo envía por tandas (una sola ejecución no puede hacer cientos de envíos)
      if (await env.DB.get("dif")) return enviar(env, chat, "Ya hay una difusión en curso. Espera a que termine.");
      await env.DB.put("dif", JSON.stringify({ texto: contenido, cursor: null, total: 0, admin: chat }));
      return enviar(env, chat, `📣 Difusión programada: sale en tandas de ${TANDA} usuarios cada 5 minutos. Te aviso al terminar.`);
    }

    case "/analisis": case "/análisis": {
      const l = leer(await velas(), Date.now() / 1000);
      return enviar(env, chat, textoAnalisis(l) + AVISO);
    }

    case "/senales": case "/señales": {
      const s = new Set(JSON.parse((await env.DB.get("sen")) || "[]"));
      const op = (args[0] || "").toLowerCase();
      if (op === "on") s.add(String(chat));
      else if (op === "off") s.delete(String(chat));
      else return enviar(env, chat, `Señales: <b>${s.has(String(chat)) ? "activadas" : "apagadas"}</b>\nUsa /senales on o /senales off`);
      await env.DB.put("sen", JSON.stringify([...s]));
      return enviar(env, chat, op === "on"
        ? "✅ Señales activadas. Te aviso cuando Bitcoin dé una entrada según las reglas (VWAP + EMA 9/21 en 15 min), solo de lunes a viernes de 8:30 a 10:30 (hora de Querétaro)." + AVISO
        : "Señales apagadas.");
    }

    default:
      if (cmd.startsWith("/")) return enviar(env, chat, "No conozco ese comando. Escribe /ayuda");
      // v9: texto libre en privado = pregunta para Lana
      if (privado && msg.text.trim().length >= 3) return preguntar(env, chat, from, msg.text);
  }
}

// ---------- Difusión por tandas (v8) ----------
const TANDA = 30;
// v14: el webhook debe recibir pre_checkout_query (pagos); se corrige solo si falta
async function webhookAlDia(env) {
  if (await env.DB.get("webhook_v14")) return;
  const info = await tg(env, "getWebhookInfo", {});
  const url = info && info.result && info.result.url;
  if (!url) return;
  const r = await tg(env, "setWebhook", { url, secret_token: env.WEBHOOK_SECRET, allowed_updates: UPDATES });
  if (r && r.ok) await env.DB.put("webhook_v14", "1");
}

async function revisarDifusion(env) {
  const raw = await env.DB.get("dif");
  if (!raw) return;
  const d = JSON.parse(raw);
  const r = await env.DB.list({ prefix: "u:", cursor: d.cursor || undefined, limit: TANDA });
  for (const k of r.keys) { await enviarSeguro(env, k.name.slice(2), d.texto); d.total++; }
  if (r.list_complete) {
    await env.DB.delete("dif");
    await enviar(env, d.admin, `📣 Difusión terminada: enviada a ${d.total} usuarios.`);
  } else {
    d.cursor = r.cursor;
    await env.DB.put("dif", JSON.stringify(d));
  }
}

// Lista de chats con alertas activas (para que la revisión sea rápida)
async function indexar(env, chat, activo) {
  const s = new Set(JSON.parse((await env.DB.get("idx")) || "[]"));
  activo ? s.add(String(chat)) : s.delete(String(chat));
  await env.DB.put("idx", JSON.stringify([...s]));
}

// ---------- Revisión de alertas (cada 5 minutos) ----------
export function disparada(a, precio) {
  return a.dir === "sube" ? precio >= a.objetivo : precio <= a.objetivo;
}

async function revisarAlertas(env) {
  const chats = JSON.parse((await env.DB.get("idx")) || "[]");
  if (!chats.length) return;
  const todas = {};
  for (const c of chats) todas[c] = JSON.parse((await env.DB.get(`a:${c}`)) || "[]");
  const ids = [...new Set(Object.values(todas).flat().map((a) => a.id))];
  if (!ids.length) return;
  const p = await precios(ids);
  for (const c of chats) {
    const quedan = [];
    for (const a of todas[c]) {
      const precio = p[a.id] && p[a.id].usd;
      if (precio != null && disparada(a, precio)) {
        await enviar(env, c, `🔔 <b>${NOMBRE[a.id]}</b> ${a.dir === "sube" ? "subió a" : "bajó a"} $${fmt(precio)}\nTu alerta: $${fmt(a.objetivo)}${cambio(p[a.id].usd_24h_change)}` + AVISO);
      } else quedan.push(a);
    }
    if (quedan.length !== todas[c].length) {
      await env.DB.put(`a:${c}`, JSON.stringify(quedan));
      if (!quedan.length) await indexar(env, c, false);
    }
  }
}

// ---------- Señales de scalping (BTC, 15 min, VWAP + EMA 9/21) ----------
async function velas() {
  const r = await fetch("https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=900",
    { headers: { accept: "application/json", "user-agent": "lanaconcafe-bot" } });
  if (!r.ok) throw new Error("Coinbase " + r.status);
  return (await r.json()).map(([t, low, high, open, close, vol]) => ({ t, low, high, open, close, vol })).sort((a, b) => a.t - b.t);
}

function ema(v, n) {
  const k = 2 / (n + 1);
  return v.reduce((e, x, i) => (i ? x * k + e * (1 - k) : x), 0);
}

// Lee las velas y devuelve sesgo, niveles y (si la hay) una señal en la última vela CERRADA
export function leer(todas, ahora) {
  const c = todas.filter((x) => x.t + 900 <= ahora); // solo velas cerradas
  const u = c[c.length - 1];
  const cierres = c.map((x) => x.close);
  const e9 = ema(cierres, 9), e21 = ema(cierres, 21);
  const dia = Math.floor(u.t / 86400) * 86400; // el VWAP reinicia a las 00:00 UTC, como en TradingView
  const ses = c.filter((x) => x.t >= dia);
  const vwap = ses.reduce((s, x) => s + ((x.high + x.low + x.close) / 3) * x.vol, 0) / Math.max(ses.reduce((s, x) => s + x.vol, 0), 1e-9);
  const precio = todas[todas.length - 1].close;
  const sesgo = u.close > vwap && e9 > e21 ? "alcista" : u.close < vwap && e9 < e21 ? "bajista" : "neutral";
  let senal = null;
  if (ses.length >= 8 && sesgo !== "neutral") {
    const tol = vwap * 0.0003, margen = u.close * 0.0012;
    if (sesgo === "bajista" && u.high >= vwap - tol) {
      const stop = Math.max(u.high, vwap) + margen, riesgo = stop - u.close;
      senal = { tipo: "VENTA", entrada: u.close, stop, objetivo: u.close - 2 * riesgo, riesgo };
    }
    if (sesgo === "alcista" && u.low <= vwap + tol) {
      const stop = Math.min(u.low, vwap) - margen, riesgo = u.close - stop;
      senal = { tipo: "COMPRA", entrada: u.close, stop, objetivo: u.close + 2 * riesgo, riesgo };
    }
    // descartar si el stop queda demasiado lejos (más de 0.6% del precio)
    if (senal && senal.riesgo / u.close > 0.006) senal = null;
  }
  return { precio, vwap, e9, e21, sesgo, senal, t: u.t, velasSesion: ses.length };
}

const d0 = (n) => "$" + Math.round(n).toLocaleString("en-US");

export function textoSenal(s, enSesion = true) {
  const u = String(TAMANO_BTC).replace(".", ",");
  return `${s.tipo === "COMPRA" ? "🟢" : "🔴"} <b>Señal de ${s.tipo} · Bitcoin (15 min)</b>\n` +
    (enSesion ? "" : `⏰ <b>Fuera de horario</b> (la sesión es de lunes a viernes, 8:30–10:30): solo para estudiar, no para operar.\n`) +
    `Entrada: <b>${d0(s.entrada)}</b>\nStop: ${d0(s.stop)}\nObjetivo: ${d0(s.objetivo)}\n` +
    `Tamaño: <b>${u} BTC</b> → arriesgas ~$${(s.riesgo * TAMANO_BTC).toFixed(2)} para ganar ~$${(s.riesgo * TAMANO_BTC * 2).toFixed(2)} (1:2)\n` +
    `Motivo: el precio regresó al VWAP con las medias a favor.\n` +
    `Antes de entrar: confirma la dirección en tu gráfica de 5 min (Bitstamp) y revisa gatillo, unidades ${u} y R ≥ 1.5.`;
}

// ¿Estamos dentro de la sesión? Lunes a viernes, 8:30–10:30 hora de Querétaro
export function enSesion(ms = Date.now()) {
  const h = horaLocal(ms);
  return h.sem >= 1 && h.sem <= 5 && h.min >= SESION.desde && h.min < SESION.hasta;
}

function textoAnalisis(l) {
  const plan = l.senal ? "\n\n" + textoSenal(l.senal, enSesion())
    : l.sesgo === "alcista" ? `\n\nPlan: buscar <b>compra</b> si el precio retrocede al VWAP (${d0(l.vwap)}).`
    : l.sesgo === "bajista" ? `\n\nPlan: buscar <b>venta</b> si el precio sube al VWAP (${d0(l.vwap)}).`
    : "\n\nPlan: <b>no operar</b>. El precio y las medias no apuntan al mismo lado.";
  return `<b>Bitcoin · lectura de 15 min</b>\nPrecio: <b>${d0(l.precio)}</b>\nVWAP: ${d0(l.vwap)}\n` +
    `EMA 9: ${d0(l.e9)} · EMA 21: ${d0(l.e21)}\nSesgo: <b>${l.sesgo}</b>` + plan;
}

async function revisarSenales(env) {
  if (env.SENALES_VIEJAS !== "1") return; // v15: reemplazada por el motor de scalping del Worker de noticias
  const chats = JSON.parse((await env.DB.get("sen")) || "[]");
  if (!chats.length) return;
  if (!enSesion()) return; // v7: fuera de la sesión no se mandan señales automáticas
  const l = leer(await velas(), Date.now() / 1000);
  if (!l.senal) return;
  if ((await env.DB.get("sen:ult")) === String(l.t)) return; // esa vela ya se avisó
  await env.DB.put("sen:ult", String(l.t));
  for (const c of chats) await enviar(env, c, textoSenal(l.senal) + AVISO);
}

// ---------- Canal automático (v6) ----------
// Querétaro usa la hora del centro de México: UTC−6 todo el año (sin horario de verano desde 2022)
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function horaLocal(ms = Date.now()) {
  const d = new Date(ms - 6 * 3600 * 1000);
  return { fecha: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes(),
    texto: `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`, dia: Math.floor(d.getTime() / 86400000), sem: d.getUTCDay() };
}
const FRASES = [
  "Antes de entrar, decide dónde sales si te equivocas.",
  "Arriesgar poco por operación es lo que te mantiene en el juego.",
  "El mejor trade a veces es no operar.",
  "Primero fondo de emergencia, luego inversión, al final especulación.",
  "Invertir cada mes, aunque sea poco, le gana a adivinar el mejor momento.",
  "Un ETF del S&P 500 te da 500 empresas en una sola compra.",
  "El interés compuesto necesita dos cosas: tiempo y no interrumpirlo.",
  "Si no puedes explicar por qué compraste, no sabrás cuándo vender.",
  "Diversificar es no depender de una sola apuesta.",
  "Los productos apalancados multiplican las pérdidas igual que las ganancias.",
  "Anota cada operación: la bitácora enseña más que cualquier curso.",
  "El miedo y la avaricia mueven el mercado; las reglas te protegen de ambos.",
  "Comisiones bajas hoy son miles de pesos más en 20 años.",
  "Nunca inviertas dinero que vas a necesitar en los próximos meses.",
  "Una caída fuerte no es señal de compra por sí sola.",
  "Las noticias explican el pasado; tu plan decide el futuro.",
  "Practica en demo hasta que seguir tus reglas sea aburrido.",
  "La inflación es el impuesto silencioso al dinero quieto.",
  "Rendimientos pasados no garantizan rendimientos futuros.",
  "Si una inversión promete ganancias seguras y altas, desconfía.",
  "Paciencia: el mercado premia a quien se queda, no a quien corre.",
];

async function publicarResumen(env) {
  if (!env.CANAL_ID) return "falta CANAL_ID";
  const ids = ["bitcoin", "ethereum", "solana"];
  const p = await precios(ids);
  const lineas = ids.filter((i) => p[i]).map((i) => `• <b>${NOMBRE[i]}</b>: $${fmt(p[i].usd)}${cambio(p[i].usd_24h_change)}`);
  if (!lineas.length) return "no pude leer precios";
  const h = horaLocal();
  const texto = `☀️ <b>Buenos días · ${h.texto}</b>\n\n${lineas.join("\n")}\n\n💡 <i>${FRASES[h.dia % FRASES.length]}</i>` + AVISO;
  return publicarCanal(env, texto);
}

async function publicarEncuesta(env) {
  if (!env.CANAL_ID) return "falta CANAL_ID";
  if (await env.DB.get("poll")) await resolverEncuesta(env); // cierra una anterior pendiente
  const p = (await precios(["bitcoin"])).bitcoin;
  if (!p) return "no pude leer el precio";
  const base = Math.round(p.usd);
  const r = await tg(env, "sendPoll", { chat_id: env.CANAL_ID, question: `☕ ¿Bitcoin cierra el día arriba o abajo de $${base.toLocaleString("en-US")}?`,
    options: [{ text: "📈 Arriba" }, { text: "📉 Abajo" }], is_anonymous: true });
  if (!r || !r.ok) return "⚠️ " + ((r && r.description) || "no se pudo publicar");
  await env.DB.put("poll", JSON.stringify({ id: r.result.message_id, base, creado: Date.now() }));
  return `✅ publicada (base $${base.toLocaleString("en-US")})`;
}

export function textoResultado(base, ahora, votos) {
  const gano = ahora >= base ? 0 : 1;
  const total = votos[0] + votos[1];
  const pct = total ? Math.round((votos[gano] / total) * 100) : null;
  return `🗳️ <b>Resultado de la encuesta</b>\nBitcoin abrió el día en $${base.toLocaleString("en-US")} y va en <b>$${Math.round(ahora).toLocaleString("en-US")}</b>.\n` +
    `Ganó: <b>${gano === 0 ? "📈 Arriba" : "📉 Abajo"}</b>` + (pct == null ? "" : `\nAcertó el ${pct}% (${total} voto${total === 1 ? "" : "s"}).`) + "\n\nMañana a las 7:30 hay nueva encuesta ☕";
}

async function resolverEncuesta(env) {
  const raw = await env.DB.get("poll");
  if (!raw) return;
  const e = JSON.parse(raw);
  await env.DB.delete("poll");
  const p = (await precios(["bitcoin"])).bitcoin;
  const st = await tg(env, "stopPoll", { chat_id: env.CANAL_ID, message_id: e.id });
  const ops = (st && st.ok && st.result && st.result.options) || [];
  const votos = [ops[0] ? ops[0].voter_count : 0, ops[1] ? ops[1].voter_count : 0];
  if (p) await publicarCanal(env, textoResultado(e.base, p.usd, votos));
}

async function revisarCanal(env) {
  if (!env.CANAL_ID) return;
  const h = horaLocal();
  // 7:30 a 7:59: resumen + encuesta, una sola vez al día
  if (h.min >= 450 && h.min < 480 && !(await env.DB.get(`r:${h.fecha}`))) {
    await env.DB.put(`r:${h.fecha}`, "1", { expirationTtl: 172800 });
    await publicarResumen(env);
    await publicarEncuesta(env);
  }
  // desde las 8 pm: resultado de la encuesta (si lleva al menos 1 hora publicada)
  if (h.min >= 1200) {
    const raw = await env.DB.get("poll");
    if (raw && Date.now() - JSON.parse(raw).creado >= 3600 * 1000) await resolverEncuesta(env);
  }
}

async function estadisticas(env) {
  const h = horaLocal(), hace7 = horaLocal(Date.now() - 7 * 86400000).fecha;
  let cursor, total = 0, nuevos = 0, hoy = 0;
  do {
    const r = await env.DB.list({ prefix: "u:", cursor });
    for (const k of r.keys) {
      total++;
      const f = await env.DB.get(k.name);
      if (f && f.length === 10 && f >= hace7) nuevos++;
      if (f === h.fecha) hoy++;
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  const conAlertas = JSON.parse((await env.DB.get("idx")) || "[]").length;
  const senales = JSON.parse((await env.DB.get("sen")) || "[]").length;
  let canal = "sin CANAL_ID";
  if (env.CANAL_ID) { const r = await tg(env, "getChatMemberCount", { chat_id: env.CANAL_ID }); canal = r && r.ok ? String(r.result) : "no disponible"; }
  return `📊 <b>Estadísticas · ${h.texto}</b>\n\n👥 Usuarios del bot: <b>${total}</b>\n🆕 Nuevos en 7 días: <b>${nuevos}</b> (hoy: ${hoy})\n` +
    `🔔 Con alertas activas: ${conAlertas}\n📡 Con señales activadas: ${senales}\n📣 Suscriptores del canal: <b>${canal}</b>\n\n<i>Los usuarios que llegaron antes de la v6 cuentan en el total, no en "nuevos".</i>`;
}


/**
 * HSTLRS · Atención al cliente con IA (Cloudflare Worker).
 *
 * La web (GitHub Pages) envía la conversación a POST /chat y este Worker
 * responde con Claude. La clave de Anthropic vive solo aquí, como secreto
 * (`npx wrangler secret put ANTHROPIC_API_KEY`), nunca en la web.
 */
import Anthropic from "@anthropic-ai/sdk";

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
  CATALOG_URL: string;
}

interface CatalogItem {
  nombre: string;
  categoria: string;
  precio: number;
  precios_por_talla?: Record<string, number>;
  colores: string[];
  tallas: string[];
  disponible: boolean;
  url: string;
  descripcion: string;
  detalles: string[];
}

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 20;
const MAX_CHARS = 1200;

const STORE_INFO = `
Tienda: HSTLRS (streetwear mexicano). Web: https://hstlrs-shop.github.io
Contacto humano: WhatsApp +52 55 8014 9227 (https://wa.me/525580149227) o fragaaitss@icloud.com
Seguridad: solo se cobra en el checkout de Shopify (hsltrs.myshopify.com). HSTLRS nunca pide transferencias, depósitos, códigos ni datos de tarjeta por chat, WhatsApp o correo. Si alguien lo hace a nombre de HSTLRS, es fraude: que no pague y nos avise.
Moneda: pesos mexicanos (MXN), IVA incluido.

Envíos:
- Cada prenda se hace BAJO PEDIDO: producción de 2 a 5 días hábiles, luego envío de 3 a 10 días hábiles dentro de México.
- Envío estándar $150 MXN; GRATIS en pedidos desde $1,050 MXN.
- Al enviarse, el cliente recibe por correo el número de seguimiento (se puede rastrear en https://t.17track.net).
- Pedidos con varias piezas pueden llegar en paquetes separados sin costo extra.

Descuentos:
- Cupón HSTLR10: 10% en el primer pedido.
- 15% automático al llevar 3 o más piezas. No se combina con cupones: se aplica el mayor.

Cambios y devoluciones:
- 30 días desde que se recibe el pedido; la prenda debe estar sin usar y con etiquetas.
- Si llega con defecto o no es lo que se pidió: avisar en los primeros 7 días con fotos; se repone o se reembolsa sin costo.
- Reembolso al mismo método de pago en un máximo de 10 días hábiles.

Pagos: tarjeta de crédito/débito, PayPal, Shop Pay, Apple Pay y Google Pay en el checkout seguro de Shopify.

Tallas:
- Playeras CORE (Comfort Colors 1717): corte relajado. Ancho de pecho / largo en cm: S 51/71, M 56/74, L 61/76, XL 66/79, 2XL 71/81. Para look oversize, una talla más.
- Hoodie, crewneck y jogger: corte unisex regular; para look oversize, una talla más.
- Gorra y beanie: talla única ajustable.
`.trim();

let catalogCache: { at: number; text: string } | null = null;

async function catalogText(env: Env): Promise<string> {
  if (catalogCache && Date.now() - catalogCache.at < 10 * 60 * 1000) return catalogCache.text;
  try {
    const res = await fetch(env.CATALOG_URL, { cf: { cacheTtl: 600 } });
    const items = (await res.json()) as CatalogItem[];
    const text = items
      .map((p) => {
        const precio = p.precios_por_talla
          ? `$${p.precio} (${Object.entries(p.precios_por_talla).map(([t, v]) => `${t}: $${v}`).join(", ")})`
          : `$${p.precio}`;
        return `- ${p.nombre} [${p.categoria}] ${precio} MXN · colores: ${p.colores.join(", ")} · tallas: ${p.tallas.join(", ")} · ${p.disponible ? "DISPONIBLE" : "PRÓXIMAMENTE (aún no se puede comprar)"} · ${p.url}\n  ${p.descripcion} ${p.detalles.join("; ")}`;
      })
      .join("\n");
    catalogCache = { at: Date.now(), text };
    return text;
  } catch {
    return catalogCache?.text ?? "(catálogo no disponible en este momento)";
  }
}

function systemPrompt(catalog: string): string {
  return `Eres el asistente de atención al cliente de HSTLRS, una marca de streetwear mexicana. Atiendes por chat en la tienda online, las 24 horas.

Cómo respondes:
- En español de México, cercano y breve (2 a 5 oraciones). Tutea al cliente.
- Responde solo con la información de abajo. Si algo no está ahí (por ejemplo el estado de un pedido concreto, un cambio de dirección o un problema de pago), no inventes: pide que escriban por WhatsApp (https://wa.me/525580149227) o a fragaaitss@icloud.com con su número de pedido.
- Para el estado de un pedido: el correo de confirmación de Shopify trae el enlace "Ver tu pedido", y cuando se envía llega el número de seguimiento.
- Cuando recomiendes un producto, incluye su precio y su enlace. Solo ofrece como comprables los que dicen DISPONIBLE; los PRÓXIMAMENTE se pueden apartar con "Avísame" en su página.
- No prometas fechas exactas ni descuentos que no estén abajo.
- Nunca pidas datos de tarjeta ni contraseñas.

Información de la tienda:
${STORE_INFO}

Catálogo actual:
${catalog}`;
}

function cors(env: Env, origin: string | null): Record<string, string> {
  const allowed = origin && (origin === env.ALLOWED_ORIGIN || origin.startsWith("http://localhost")) ? origin : env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

const FALLBACK_REPLY =
  "Ahorita no puedo responder bien tu pregunta. Escríbenos por WhatsApp al +52 55 8014 9227 o a fragaaitss@icloud.com y te ayudamos personalmente.";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(env, request.headers.get("Origin"));
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname !== "/chat" || request.method !== "POST") return json({ error: "No encontrado" }, 404, headers);

    let body: { messages?: { role: string; content: string }[] };
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON inválido" }, 400, headers);
    }

    const history = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_TURNS)
      .map((m): Anthropic.MessageParam => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_CHARS) }));

    // La conversación debe empezar y terminar con un mensaje del cliente.
    while (history.length && history[0].role !== "user") history.shift();
    if (!history.length || history[history.length - 1].role !== "user") {
      return json({ error: "Falta el mensaje del cliente" }, 400, headers);
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2000, // respuestas de chat cortas
        system: systemPrompt(await catalogText(env)),
        cache_control: { type: "ephemeral" },
        output_config: { effort: "low" }, // chat de atención: rápido y económico
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: history,
      });

      if (response.stop_reason === "refusal") return json({ reply: FALLBACK_REPLY }, 200, headers);

      const reply = response.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("\n")
        .trim();
      return json({ reply: reply || FALLBACK_REPLY }, 200, headers);
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        return json({ reply: "Estamos atendiendo a muchas personas. Inténtalo de nuevo en un minuto." }, 200, headers);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("Clave de Anthropic inválida o ausente");
      } else if (error instanceof Anthropic.APIError) {
        console.error(`Error de la API ${error.status}: ${error.message}`);
      } else {
        console.error(error);
      }
      return json({ reply: FALLBACK_REPLY }, 200, headers);
    }
  },
};

# Atención al cliente con IA (HSTLRS)

El chat de la web ya funciona **24/7 sin configurar nada**: responde al instante sobre envíos, tallas, cambios, pagos, descuentos y productos con respuestas automáticas.

Esta carpeta añade el **"cerebro" con IA** (Claude, de Anthropic): un servidor pequeño en Cloudflare Workers que responde cualquier pregunta con la información de tu tienda. La clave de la IA vive solo en ese servidor, nunca en la web.

## Qué hace

- Responde en español de México, breve y amable.
- Conoce tus productos, precios y disponibilidad: lee `assets/data/productos.json`, que se genera desde el catálogo.
- Sabe tus políticas de envío, cambios, pagos, tallas y descuentos (`src/index.ts` → `STORE_INFO`).
- No inventa: lo que no sabe (un pedido concreto, un problema de pago) lo manda a `fragaaitss@icloud.com`.
- Si la IA falla o no está activa, el chat sigue respondiendo con las respuestas automáticas.

Modelo: `claude-opus-5-5` con esfuerzo `low` (rápido y económico para chat) y respaldo automático de modelo si la IA rechaza una pregunta.

## Activarlo (unos 15 minutos, desde una computadora)

1. **Clave de Anthropic:** crea una cuenta en [console.anthropic.com](https://console.anthropic.com), agrega un método de pago y crea una API key. Ponle un límite de gasto mensual en *Settings → Limits*.
2. **Cuenta gratis de Cloudflare:** [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
3. En esta carpeta:
   ```bash
   cd soporte-ia
   npm install
   npx wrangler login                        # abre el navegador para entrar a Cloudflare
   npx wrangler secret put ANTHROPIC_API_KEY # pega la clave de Anthropic
   npx wrangler deploy
   ```
   Te dará una dirección como `https://hstlrs-soporte.TU-USUARIO.workers.dev`.
4. En `assets/js/config.js` pon: `chat: { endpoint: "https://hstlrs-soporte.TU-USUARIO.workers.dev/chat" }` y súbelo.

## Mantenerlo al día

- Al cambiar productos o precios en `assets/js/catalog.js`, ejecuta `node scripts/build-knowledge.mjs` y sube el cambio: la IA lo lee en menos de 10 minutos.
- Al cambiar políticas (envío, devoluciones…), edita `STORE_INFO` en `src/index.ts` y vuelve a ejecutar `npx wrangler deploy`.

## Costo aproximado

Cloudflare Workers es gratis hasta 100,000 consultas al día. Lo que cuesta es la IA de Anthropic: cada respuesta usa unos pocos miles de tokens, que es poco dinero por conversación, y la información de la tienda se reutiliza entre preguntas gracias a la caché. Revisa el consumo en console.anthropic.com y ajusta el límite mensual.

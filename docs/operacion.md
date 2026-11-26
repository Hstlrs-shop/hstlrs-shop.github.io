# Operación diaria de HSTLRS

Cada día a las **9:13 (hora de CDMX)** una tarea programada de Claude revisa la tienda y te avisa al celular **solo si hay algo**. Este archivo son sus instrucciones; también sirven para hacer la revisión a mano.

## Reglas

- **Solo mirar.** No cambiar nada en Shopify, Printful ni Cloudflare. Nunca reembolsar, cambiar precios, publicar ni gastar dinero. Si algo necesita arreglo, se avisa con qué hacer.
- **Datos de clientes:** no escribir nombres, direcciones, correos ni teléfonos en el resumen ni en el repositorio. Los pedidos se nombran por su número (#1001).
- **Fallos:** si una API no responde o devuelve 429, decirlo en una línea y seguir con lo demás.
- En la nube, los tokens de Printful y Cloudflare los añade el proxy. Para Cloudflare manda el encabezado `Authorization: Bearer proxy-injected`. Para Printful no hace falta encabezado. Nunca escribas un token en archivos.

## Pasos

### 1. Printful
`python3 scripts/ops/printful_estado.py --json`

Anota estos datos:
- **Variantes ignoradas** (`ignoradas`) y **productos a medio conectar**: lo ideal es 0. Si hay alguna, Printful no fabricaría esos colores.
- **Pedidos atorados** (`atorados`: `draft`, `failed`, `onhold`). Con la aprobación automática activada, un `draft` significa que Printful espera aprobación o pago.
- **Pedidos nuevos** y sus guías de rastreo.

### 2. Shopify (conector de Shopify, solo consultas)
Si la sesión no tiene herramientas `mcp__Shopify__*` (búscalas con ToolSearch), sáltate este paso. En el resumen pon una línea: "Falta el conector de Shopify en la tarea: agrégalo en claude.ai → Tareas programadas → HSTLRS · operación diaria". Los pasos 1, 3 y 4 sí funcionan sin él.

- **Pedidos de las últimas 24 horas:** `orders(first: 50, query: "created_at:>=AAAA-MM-DDTHH:MM:SSZ")`, pidiendo `name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet { shopMoney { amount } } lineItems(first: 10) { nodes { title quantity } }`.
- **Pagados sin enviar desde hace más de 7 días:** `orders(first: 20, query: "financial_status:paid fulfillment_status:unshipped created_at:<=FECHA_HACE_7_DIAS")`.
- **Carritos abandonados de las últimas 24 horas:** `abandonedCheckouts(first: 20, query: "created_at:>=...")`, pidiendo solo `createdAt totalPriceSet { shopMoney { amount } } lineItems(first: 5) { nodes { title quantity } }`.
- **Inventario en Printful:** `products(first: 50, query: "status:active") { nodes { title totalInventory variantsCount { count } } }`. Cada producto debe cumplir `totalInventory = variantes × 9999`. Si no, ese producto tiene variantes fuera de la ubicación de Printful, y esos pedidos no le llegarían.
- **Perfiles de envío:** `deliveryProfiles(first: 10) { nodes { name productVariantsCount { count } } }`. Los perfiles "Printful: …" deben tener 0 variantes. Si Printful vuelve a meter productos ahí, se cobra su tarifa en dólares.
- **Envío del mercado México:** `market(id: "gid://shopify/Market/97710375185") { delivery { shipping { optionDefinitions(first: 10) { nodes { ... on DeliveryFlatRateOptionDefinition { name isActive freeDeliveryMinimumValue { amount } rateGroups(first: 3) { nodes { rate { price { amount } } } } } } } } } }`. Lo correcto: "Estándar" activo a $99, gratis desde $999, y "Expreso" inactivo.

### 3. Envío como lo ve el cliente
`bash scripts/ops/probe-envios.sh`

Todo debe coincidir con `assets/js/config.js`. Si la tienda responde 429, salta este paso y dilo.

### 4. Visitas (solo si `assets/js/config.js` tiene `analytics.cloudflareToken`)
1. `GET https://api.cloudflare.com/client/v4/accounts` → `accountTag` (el `id` de la cuenta).
2. `GET .../accounts/{accountTag}/rum/site_info/list` → el `site_tag` del sitio `hstlrs-shop.github.io`.
3. `POST https://api.cloudflare.com/client/v4/graphql` con:
   `viewer { accounts(filter: {accountTag: $acc}) { rumPageloadEventsAdaptiveGroups(limit: 10, filter: {siteTag: $tag, datetime_geq: $ayer}, orderBy: [count_DESC]) { count sum { visits } dimensions { requestPath refererHost } } } }`
   
   De ahí salen las visitas de ayer, las páginas más vistas y de dónde llegaron.

### 5. Resumen (lo que te llega al celular)
- **Hay pedidos nuevos o algún problema en los pasos 1 a 3:** máximo 8 líneas. Primero lo urgente, cada cosa con qué hacer. Por ejemplo: "Pedido #1001 atorado en Printful como borrador: entra a Printful y apruébalo".
- **Es lunes:** además, el resumen de la semana: pedidos, ventas, visitas, carritos abandonados y el producto más visto.
- **No hay nada:** termina con una sola línea: `Sin novedades.`

## Hacerlo a mano
En una sesión del entorno `hstlrs-shop`, pídele a Claude: "haz la revisión de `docs/operacion.md`".

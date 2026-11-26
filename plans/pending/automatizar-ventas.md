# Automatizar las ventas de HSTLRS

Estado: **propuesta, pendiente de aprobación** (26 nov 2026)

## Objetivo medible

- **Primer pedido real** pagado, fabricado y enviado por Printful **sin que nadie toque nada**, en 7 días o menos.
- Después, el ciclo corre solo: un post diario en redes → visitas medidas → venta en Shopify → Printful fabrica y envía → el cliente recibe su guía → tú recibes un aviso.

## Punto de partida (comprobado el 26 nov)

| Pieza | Estado |
|---|---|
| Web y carrito | ✅ 35 productos y 845 variantes; todas existen en Shopify y se pueden comprar |
| Cobro | ✅ La ficha de producto ofrece tarjeta (Visa, Mastercard, Maestro), Shop Pay y PayPal. Falta una compra real que lo confirme |
| Descuentos | ✅ `HSTLR10` (10 %) y "Lleva 3 o más: 15 %" activos en Shopify |
| Producción | ⚠️ 11 productos tienen su inventario en Printful. **24 no** (STUDIO 04–12, 6 hoodies y 9 crewnecks de diseño): se cobran, pero el pedido no le llega a Printful |
| Envío | ❌ Los productos de Printful cobran su tarifa en dólares: $245 una playera, $347 un hoodie y $592 un carrito de $2,098 que según la web va gratis. Los 24 sin conectar cobran bien ($150, gratis desde $1,050, expreso $195), pero al conectarlos heredarían la tarifa cara |
| Pedidos | 0 en toda la historia de la tienda; 1 carrito abandonado ($1,199, 13 nov) |
| Lista "Avísame" | Vacía (1 cliente registrado en total) |
| Visitas | Sin medir: la web no tiene analítica |
| Redes | No hay cuentas de HSTLRS conectadas para publicar; las conectadas son de otros proyectos |
| Automatizaciones | Ninguna de HSTLRS. `docs/lanzamiento.md` menciona una revisión de pedidos cada 3 horas que hoy no existe |
| Archivos de impresión | ✅ Los 24 diseños tienen PNG de 3600×4800 px (300 ppp) en `assets/print/` |
| Prendas base | Las mismas que ya usan los productos conectados: Comfort Colors 1717 (playeras), Cotton Heritage M2580 (hoodies) y M2480 (crewnecks) |

## Fases

### Fase 1: cada venta se cobra bien y se fabrica sola (hoy)

Verificado cuando: la prueba de envíos da $150 / $0 / $195 en todos los casos, Printful muestra 35 de 35 productos conectados y el pedido de prueba se produce solo.

#### Paso 1.1: acceso a Printful y mapa de lo ya conectado (S)
- Criterios: token de Printful guardado en el entorno `hstlrs-shop`; listado de los 35 productos con cuántas variantes tiene conectadas cada uno; anotado qué prenda, color y posición usan los 11 ya conectados.
- Verificación: `node scripts/ops/printful-estado.mjs`
- Archivos: `scripts/ops/printful-estado.mjs`
- Dónde se prueba: API de Printful (productos de la tienda)
- Bloqueado por: tu token (pregunta 1)

#### Paso 1.2: envío como promete la web (S)
- Criterios: todas las variantes en el "Perfil general" de Shopify, que también sirve a la ubicación de Printful; para CDMX, playera, hoodie, crewneck y gorro dan Estándar $150 por debajo de $1,050, $0 desde $1,050 y Expreso $195, estén conectados o no.
- Verificación: `bash scripts/ops/probe-envios.sh` (pide a Shopify las tarifas que vería un cliente)
- Archivos: `scripts/ops/probe-envios.sh`
- Dónde se prueba: tarifas del carrito de Shopify, lo mismo que ve el cliente
- Bloqueado por: pregunta 2. Si Printful vuelve a meter los productos en sus propios perfiles, te pediré apagar esa opción en tu panel de Printful.

#### Paso 1.3: conectar un producto completo primero (XS)
- Criterios: STUDIO 08 Jaguar conectado (Comfort Colors 1717, diseño en la espalda, versión clara u oscura según el color de la prenda, igual que los STUDIO 01–03); la vista previa de Printful se ve bien; la prueba de envíos sigue bien.
- Verificación: `node scripts/ops/printful-estado.mjs` + `bash scripts/ops/probe-envios.sh`
- Dónde se prueba: API de Printful (variantes de la tienda)
- Bloqueado por: 1.1, 1.2

#### Paso 1.4: conectar los otros 23 (M, por familias: 8 playeras, 6 hoodies, 9 crewnecks)
- Criterios: 35 de 35 productos conectados; su inventario aparece en la ubicación Printful de Shopify; la prueba de envíos sigue bien.
- Verificación: igual que 1.3
- Bloqueado por: 1.3

#### Paso 1.5: Printful listo para cobrar y producir (XS, lo haces tú)
- Criterios: método de pago en Printful y, según la pregunta 3, aprobación automática de pedidos activada.
- Verificación: el pedido de prueba (1.6) llega a Printful ya aprobado, no como borrador.
- Bloqueado por: pregunta 3

#### Paso 1.6: pedido real de prueba (S, tú compras y yo reviso)
- Criterios: compras el Beanie ($499 + $150 de envío = $649) a tu dirección; aparece en Shopify; en menos de 10 minutos está en Printful y aprobado; después Shopify recibe la guía de rastreo.
- Verificación: `node scripts/ops/printful-estado.mjs --pedidos`
- Bloqueado por: 1.2, 1.4, 1.5

### Fase 2: medir visitas (hoy, en paralelo)

Verificado cuando: una visita real a la web aparece en Cloudflare Web Analytics.

#### Paso 2.1: Cloudflare Web Analytics (S)
- Criterios: sitio creado con el token de Cloudflare que ya está guardado; el script de medición en `index.html`, `tienda.html` y `producto.html`; sin cookies, así que no hace falta aviso de cookies.
- Verificación: abrir la web publicada con un navegador y ver la visita en la API de Cloudflare
- Archivos: `index.html`, `tienda.html`, `producto.html`
- Bloqueado por: nada. Se publica cuando unes el PR. Si el token no tiene ese permiso, te digo cuál agregar.

### Fase 3: tráfico automático (días 1–3)

Verificado cuando: el primer post programado sale publicado en Instagram y TikTok de HSTLRS.

#### Paso 3.1: conectar @hstlrs a vidIQ (XS, lo autorizas tú)
- Criterios: Instagram de empresa y TikTok de HSTLRS conectados, con permiso para publicar.
- Verificación: la lista de cuentas de vidIQ las muestra con "puede publicar"
- Bloqueado por: pregunta 4

#### Paso 3.2: calendario de 30 días con lo que ya existe (S)
- Criterios: un post diario a las 19:30 (hora de CDMX) con las imágenes y videos de `docs/redes/`, `docs/anuncios/` y `docs/comercial/` y sus textos, con `HSTLR10` y el enlace; todos los archivos existen; lo apruebas una sola vez.
- Verificación: `node scripts/ops/validar-calendario.mjs`
- Archivos: `marketing/calendario.json`, `scripts/ops/validar-calendario.mjs`
- Bloqueado por: nada para armarlo; tu visto bueno para programarlo

#### Paso 3.3: programar los 30 posts en vidIQ (S)
- Criterios: los 30 posts programados con fecha y hora; el del día 1 sale publicado.
- Verificación: la lista de posts de vidIQ muestra 30 programados para las cuentas de HSTLRS
- Bloqueado por: 3.1, 3.2

#### Paso 3.4: catálogo gratis en Instagram Shopping y Google (S)
- Criterios: tú agregas en Shopify los canales "Facebook e Instagram" y "Google y YouTube" (Shopify exige que tú inicies sesión); yo publico ahí los 35 productos.
- Verificación: consulta en Shopify de los canales donde está publicado cada producto
- Bloqueado por: que agregues los canales

### Fase 4: piloto automático de la operación (día 1)

Verificado cuando: una corrida manual de la tarea diaria entrega un resumen correcto y te llega al celular.

#### Paso 4.1: tarea diaria "HSTLRS · operación" (S)
- Criterios: corre todos los días a las 9:13 (hora de CDMX) en el entorno `hstlrs-shop`, con los conectores de Shopify y vidIQ; revisa pedidos nuevos, su estado en Printful (borrador, retenido, fallido, enviado), productos desconectados, la prueba de envíos, carritos abandonados, posts publicados y visitas; te avisa solo cuando hay algo, más un resumen los lunes. Nunca reembolsa, cambia precios ni gasta dinero.
- Verificación: disparar la tarea una vez a mano y revisar su resultado
- Archivos: `docs/operacion.md` (las instrucciones que sigue la tarea)
- Bloqueado por: 1.1 (y 2.1 y 3.1 para sus secciones; sin ellas, las salta)

#### Paso 4.2: documentación al día (XS)
- Criterios: `docs/lanzamiento.md` y `README.md` describen lo que de verdad corre solo.
- Bloqueado por: 4.1

## Decisiones

| Decisión | Opción elegida | Por qué |
|---|---|---|
| Quién fabrica | Printful | Produce en Tijuana: más rápido y sin aranceles para México (ver `docs/dropshipping-printful.md`) |
| Cómo publicar en redes | vidIQ | Publica imágenes y video en Instagram y TikTok, y ya lo usas en otro proyecto |
| Programación de posts | Los 30 de una vez en vidIQ, más una tarea diaria que solo vigila | No gasta una sesión de IA por post |
| Analítica | Cloudflare Web Analytics | Gratis, sin cookies, y el token de Cloudflare ya está guardado |
| Envío | Pendiente (pregunta 2) | |

## Sin especificar todavía

- Paso 1.3: si la API de Printful no permite conectar productos creados en Shopify, el plan B es que los conectes tú en el panel de Printful con mi lista paso a paso (cerca de 1 hora). Se sabe en cuanto pruebe el primero.
- Paso 3.4: cuánto tarda Meta en aprobar Instagram Shopping. Sin estimar.
- Contenido después del día 30: sin definir; se investiga en la semana 3.
- Anuncios de Meta: presupuesto y momento, decisión tuya cuando pase el pedido de prueba.

## Siempre / Nunca

- Siempre: cada cambio en Shopify pasa por tu confirmación (el conector la pide); ves el calendario antes de que se programe; cada fase se comprueba con su verificación.
- Nunca: reembolsos, cambios de precio, borrar productos, gastar en anuncios, publicar en cuentas de otros proyectos, ni escribir tokens o datos privados en el repositorio (es público por GitHub Pages).

## Progreso

| Fase | Estado |
|---|---|
| 1. Cobro y producción | Pendiente de aprobación |
| 2. Medir visitas | Pendiente de aprobación |
| 3. Tráfico automático | Pendiente de aprobación |
| 4. Piloto automático | Pendiente de aprobación |

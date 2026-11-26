# Automatizar las ventas de HSTLRS

Estado: **aprobado el 26 nov 2026, en ejecución**

## Objetivo medible

- **Primer pedido real** pagado, fabricado y enviado por Printful **sin que nadie toque nada**, en 7 días o menos.
- Después, el ciclo corre solo: venta en Shopify → Printful la aprueba y la fabrica → el cliente recibe su guía → tú recibes un aviso solo si algo falla.

## Punto de partida (comprobado el 26 nov)

| Pieza | Estado |
|---|---|
| Web y carrito | ✅ 35 productos y 845 variantes; todas existen en Shopify y se pueden comprar |
| Cobro | ✅ La ficha de producto ofrece tarjeta (Visa, Mastercard, Maestro), Shop Pay y PayPal. Falta una compra real que lo confirme |
| Descuentos | ✅ `HSTLR10` (10 %) y "Lleva 3 o más: 15 %" activos en Shopify |
| Producción | ⚠️ Los 35 productos están conectados en Printful con su prenda y su diseño correctos. Pero **120 variantes no se fabricarían**: un color completo (5 tallas) en cada uno de los 24 productos de diseño (STUDIO 04–12, 6 hoodies y 9 crewnecks) está marcado como "ignorar" en Printful, y en Shopify esas variantes no tienen inventario en la ubicación de Printful. La web las vende (por ejemplo, STUDIO 08 Jaguar en negro) |
| Envío | ❌ Las otras 725 variantes cobran la tarifa de Printful en dólares: $245 una playera, $347 un hoodie y $592 un pedido de $2,098 que según la web va gratis. Solo las 120 rotas cobran lo que promete la web ($150, gratis desde $1,050, expreso $195) |
| Pedidos | 0 en Shopify y 0 en Printful; 1 carrito abandonado ($1,199, 13 nov) |
| Lista "Avísame" | Vacía (1 cliente registrado en total) |
| Visitas | Sin medir: la web no tiene analítica |
| Automatizaciones | Ninguna de HSTLRS. `docs/lanzamiento.md` menciona una revisión de pedidos cada 3 horas que hoy no existe |
| Acceso a Printful | ✅ Token guardado en el entorno `hstlrs-shop`; la tienda de Shopify en Printful es la 19046954 |

## Fases

### Fase 1: cada venta se cobra bien y se fabrica sola (hoy)

Verificado cuando: 0 de 845 variantes ignoradas, las 845 con inventario en la ubicación Printful, la prueba de envíos da lo acordado y el pedido de prueba se fabrica solo.

#### Paso 1.1: acceso a Printful y diagnóstico ✅
- Hecho: token guardado y funcionando; 35 de 35 productos conectados; 120 variantes ignoradas localizadas; sus archivos de diseño son los mismos que usan los colores parecidos del mismo producto.

#### Paso 1.2: arreglar un color primero (XS)
- Criterios: las 5 tallas de STUDIO 08 Jaguar negro dejan de estar ignoradas en Printful y quedan con inventario en la ubicación Printful de Shopify (Printful lo hace al quitarles el "ignorar" o, si no, lo hago yo en Shopify con tu confirmación).
- Verificación: `node scripts/ops/printful-estado.mjs` (variantes ignoradas y ubicación del inventario)
- Archivos: `scripts/ops/printful-estado.mjs`
- Dónde se prueba: API de Printful (variantes sincronizadas) + inventario de Shopify
- Bloqueado por: aprobación del plan

#### Paso 1.3: los otros 23 colores (S)
- Criterios: 0 de 845 variantes ignoradas; las 845 con inventario en la ubicación Printful.
- Verificación: igual que 1.2
- Bloqueado por: 1.2

#### Paso 1.4: envío según la decisión (S)
- Criterios: todas las variantes en el "Perfil general" de Shopify, que también sirve a la ubicación de Printful; para CDMX, playera, hoodie, crewneck y gorro dan Estándar $99 por debajo de $999 y $0 desde $999, sin "Expreso"; `assets/js/config.js` y los textos de la web dicen lo mismo.
- Verificación: `bash scripts/ops/probe-envios.sh` (pide a Shopify las tarifas que vería un cliente)
- Archivos: `scripts/ops/probe-envios.sh`
- Bloqueado por: tu respuesta sobre el envío. Si Printful vuelve a meter los productos en sus propios perfiles, te pediré apagar esa opción en tu panel de Printful.

#### Paso 1.5: Printful listo para cobrar y producir (XS, lo haces tú)
- Criterios: método de pago guardado en Printful y aprobación automática de pedidos activada (decidido: sí).
- Verificación: el pedido de prueba llega a Printful ya aprobado, no como borrador.

#### Paso 1.6: pedido real de prueba (S, tú compras y yo reviso)
- Criterios: el pedido aparece en Shopify; en menos de 10 minutos está en Printful y aprobado; después Shopify recibe la guía de rastreo y le avisa al cliente.
- Verificación: `node scripts/ops/printful-estado.mjs --pedidos`
- Bloqueado por: 1.3, 1.4, 1.5 y tu elección del producto de prueba

### Fase 2: medir visitas (hoy, en paralelo)

Verificado cuando: una visita real a la web aparece en Cloudflare Web Analytics.

#### Paso 2.1: Cloudflare Web Analytics (S)
- Criterios: sitio creado con el token de Cloudflare que ya está guardado; el script de medición en `index.html`, `tienda.html` y `producto.html`; sin cookies, así que no hace falta aviso de cookies.
- Verificación: abrir la web publicada con un navegador y ver la visita en la API de Cloudflare
- Archivos: `index.html`, `tienda.html`, `producto.html`
- Bloqueado por: nada. Se publica cuando unes el PR. Si el token no tiene ese permiso, te digo cuál agregar.

### Fase 3: tráfico sin redes sociales (días 1–5)

Verificado cuando: los productos están publicados en el canal de Google y el mensaje de WhatsApp está listo.

#### Paso 3.1: mensaje de lanzamiento para WhatsApp (XS)
- Criterios: texto corto para tus estados y contactos, con el enlace y `HSTLR10`, listo para copiar y pegar.
- Archivos: `docs/lanzamiento.md`

#### Paso 3.2: Google Shopping gratis (S, si lo apruebas)
- Criterios: tú agregas en Shopify el canal "Google y YouTube" con tu cuenta de Google; yo publico ahí los 35 productos y corrijo los datos que Google pida (marca, categoría, sexo y edad de las prendas).
- Verificación: consulta en Shopify de los canales donde está publicado cada producto
- Bloqueado por: tu respuesta y que agregues el canal

### Fase 4: piloto automático de la operación (día 1)

Verificado cuando: una corrida manual de la tarea diaria entrega un resumen correcto y te llega al celular.

#### Paso 4.1: tarea diaria "HSTLRS · operación" (S)
- Criterios: corre todos los días a las 9:13 (hora de CDMX) en el entorno `hstlrs-shop`, con el conector de Shopify; revisa pedidos nuevos y su estado en Printful (borrador, retenido, fallido, enviado), variantes ignoradas o fuera de la ubicación Printful, la prueba de envíos, carritos abandonados y visitas; te avisa solo cuando hay algo, más un resumen los lunes. Nunca reembolsa, cambia precios ni gasta dinero.
- Verificación: disparar la tarea una vez a mano y revisar su resultado
- Archivos: `docs/operacion.md` (las instrucciones que sigue la tarea)
- Bloqueado por: 1.3 (y 2.1 para la sección de visitas; sin ella, la salta)

#### Paso 4.2: documentación al día (XS)
- Criterios: `docs/lanzamiento.md` y `README.md` describen lo que de verdad corre solo.
- Bloqueado por: 4.1

## Decisiones

| Decisión | Opción elegida | Por qué |
|---|---|---|
| Acceso a Printful | Token en el entorno `hstlrs-shop` | Respuesta del 26 nov |
| Aprobación de pedidos | Automática en Printful | Respuesta del 26 nov: lo más rápido para el cliente |
| Redes sociales | Fuera por ahora | Respuesta del 26 nov; la tarea diaria no usa vidIQ |
| Arreglo de las 120 variantes | Quitar "ignorar" y llevar su inventario a Printful, sin tocar diseños | Prenda y archivo ya son los correctos |
| Analítica | Cloudflare Web Analytics | Gratis, sin cookies, y el token de Cloudflare ya está guardado |
| Envío | Gratis desde $999 y $99 en pedidos menores, igual en la web y en Shopify; sin "Expreso" | Respuesta del 26 nov. Printful cobra $250 por playera y $354 por hoodie a CDMX y no ofrece exprés a México; con esta oferta todos los pedidos dejan ganancia |
| Google Shopping | Sí | Respuesta del 26 nov: única fuente de visitas gratis que corre sola sin redes |
| Producto de prueba | STUDIO 08 Jaguar negra | Respuesta del 26 nov: también comprueba el arreglo de los 120 colores |

## Hallazgos durante la ejecución

- La causa de las 120 variantes rotas no era la falta de conexión: Printful las tenía marcadas como "ignorar" y Shopify no las tenía en la ubicación de Printful. Además, 105 variantes de los crewnecks Ajolote, Jaguar y La ola estaban bien en Printful pero tampoco tenían inventario en su ubicación de Shopify. Se arreglaron las dos cosas.
- El envío que cobra Shopify no sale del "Perfil general", sino de las **opciones de envío del mercado México** (Mercados → México). Ahí estaban el Estándar de $150 con envío gratis desde $1,050 y el Expreso de $195. Se cambió a Estándar $99, gratis desde $999, entrega de 3 a 10 días, y el Expreso quedó inactivo (no borrado).
- La prueba de envíos (`probe-envios.sh`) pasó de 0 de 9 a 9 de 9 carritos iguales a la web.
- El script del entorno fallaba en máquinas nuevas: `pip` instalaba para un Python distinto del que corre `python3`. Se cambió a `python3 -m pip`.
- La tienda de Shopify limita las consultas seguidas al carrito (429), así que la prueba de envíos espera entre carritos. Para comprobar sin la tienda, sirve `draftOrderCalculate` del API de administración, que calcula sin crear nada.

## Sin especificar todavía

- Paso 1.2: si quitar el "ignorar" en Printful no lleva solo el inventario a su ubicación en Shopify, y si Shopify deja hacerlo desde el conector. Se sabe con el primer color.
- Paso 3.2: qué datos exactos pide Google para ropa y cuánto tarda en aprobar. Se revisa al llegar ahí.
- Anuncios de Meta: presupuesto y momento, decisión tuya cuando pase el pedido de prueba.

## Siempre / Nunca

- Siempre: cada cambio en Shopify pasa por tu confirmación (el conector la pide); cada fase se comprueba con su verificación.
- Nunca: reembolsos, cambios de precio, borrar productos, gastar en anuncios, publicar en redes, ni escribir tokens o datos privados en el repositorio (es público por GitHub Pages).

## Progreso

| Fase | Estado |
|---|---|
| 1. Cobro y producción | 1.1–1.4 hechos y verificados (0 de 845 variantes ignoradas; 845 de 845 con inventario en Printful; envío $99 / gratis desde $999 comprobado con el cálculo de Shopify). 1.5 y 1.6 esperan acciones tuyas |
| 2. Medir visitas | La web ya está lista; falta el token de Cloudflare Web Analytics (el token guardado no puede crear sitios) |
| 3. Tráfico sin redes | 3.1 hecho (mensaje en `docs/lanzamiento.md`); 3.2 espera a que agregues el canal de Google |
| 4. Piloto automático | 4.1 tarea creada (`trig_01QJhrro2Rdu4XLgRSEha7sv`, diaria 9:13 CDMX, aviso al celular). Corre sin el conector de Shopify hasta que lo agregues en claude.ai; la primera corrida de prueba falló por el script del entorno (pip instalaba para otro Python), ya corregido; 4.2 hecho |

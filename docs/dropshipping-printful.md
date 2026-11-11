# HSTLRS como dropshipping con Printful

**Modelo:** vendes en Shopify → Printful recibe el pedido automáticamente → lo imprime o borda bajo pedido → lo envía a tu cliente con tu marca. Tú no tocas inventario; solo pagas a Printful cada prenda vendida.

**Por qué Printful y no Printify:** Printful tiene centro de producción en Tijuana, así que los pedidos de México se hacen y se envían dentro del país (más rápido y sin aranceles). Printify suele producir en EE. UU. y para México puede tardar más y generar impuestos de importación. Printify queda como respaldo.
Fuentes: [Printful vs Printify](https://bootstrappingecommerce.com/printful-vs-printify/) · [Envíos de Printful a México](https://help.printful.com/hc/en-us/articles/360014068559-How-does-shipping-work-for-products-fulfilled-in-Mexico-) · [Envíos de Printify](https://podvector.ai/articles/printify/shipping/where-does-printify-ship-from-shipping-times-locations-international-options)

---

## 1. Lo que tienes que hacer tú (15 minutos)

1. **Crea tu cuenta** en [printful.com](https://www.printful.com).
2. **Conecta Shopify:** en Shopify → Apps → busca **Printful** → Instalar → acepta y elige la tienda `hsltrs.myshopify.com`.
3. **Crea un token de la API** en [developers.printful.com/tokens](https://developers.printful.com/tokens) → *Add new token*:
   - Acceso: solo la tienda HSTLRS
   - Permisos: productos de la tienda, archivos y pedidos (lectura y escritura). Escritura es necesaria para que yo cree los productos.
   - Caducidad: la que prefieras (no se renueva sola).
4. **Guárdalo en el entorno de esta sesión, no en el chat:** menú del entorno en la barra de título de la sesión → *Edit* → *Network secrets* (o *Environment variables*) → nombre **`PRINTFUL_API_TOKEN`**. Se activa al abrir una sesión nueva.
5. **Sube los archivos originales de STUDIO** (ver punto 3) a la carpeta `assets/print/` del repositorio o pásamelos aquí.

## 2. Lo que hago yo cuando tenga el token

- Subir los diseños a Printful y crear cada playera con sus tallas y colores.
- Generar los mockups oficiales de Printful y sincronizarlos con Shopify (Printful crea los productos en tu tienda).
- Poner precios, descripciones y tus fotos; activar los productos.
- Conectar la web: cada talla/color con su variante de Shopify, y pasar el Drop 01 de "Próximamente" a "Comprar".
- Retirar los 11 productos de ejemplo de la web (ya están archivados en Shopify).

## 3. Archivos de impresión

Requisitos de Printful: **PNG con fondo transparente, 300 ppp**, a tamaño real del área de impresión (espalda ~30 × 40 cm ≈ 3600 × 4800 px).

| Diseño | Archivo | Estado |
|---|---|---|
| CORE (logo al frente, blanco) | `assets/print/core-frente-hstlrs-blanco.png` | ✅ listo |
| CORE (logo al frente, negro) | `assets/print/core-frente-hstlrs-negro.png` | ✅ listo |
| CORE 01 manga (texto vertical, gris oscuro tono sobre tono) | `assets/print/core01-manga-hstlrs-vertical.png` | ✅ listo |
| CORE 02 monograma HR (para bordado) | `assets/print/core02-monograma-hr.png` | ✅ listo (revisa que te guste) |
| STUDIO 01 Acueducto, 02 Beyond Borders, 03 The Climb, Follow the Unknown, Hecho a pulso, Tu ritmo tu camino | — | ❌ **necesito tus originales**: los mockups no sirven para imprimir |

Si tus diseños los generaste con IA, pide la ilustración sola, sin la playera, en fondo liso. Con eso puedo preparar el PNG transparente.

## 4. Producto de Printful para cada diseño

Base recomendada: **Oversized Faded T-Shirt (AS Colour 5082)**, teñido en prenda, corte oversize. [Ver producto](https://www.printful.com/custom/mens/t-shirts/oversized-faded-t-shirt-ascolour-5082). Elige en el catálogo los colores más cercanos a negro, hueso y carbón deslavado, y confirma que ese modelo se produce en Tijuana.

| Diseño | Técnica en Printful | Diferencia con el mockup |
|---|---|---|
| CORE 01 — Negra relieve | DTG frente + manga izquierda en gris oscuro | El relieve 3D no existe en bajo demanda: queda como estampado tono sobre tono |
| CORE 02 — Deslavada monograma | **Bordado** en pecho izquierdo | Igual que el mockup (confirma que el modelo admite bordado) |
| CORE 03 — Hueso etiqueta | DTG frente + **etiqueta interior** con tu logo | La etiqueta tejida exterior no está disponible; la interior de Printful es impresa |
| STUDIO (6 diseños) | DTG espalda (gran formato) + logo pequeño al frente | Muy parecido; el efecto desgastado depende del archivo |

**Lo que el bajo demanda no puede hacer:** relieve/puff 3D, etiqueta tejida cosida y lavado ácido hecho a tu medida. Si más adelante los quieres, esas piezas tendrían que hacerse en lote con un taller (ver `docs/proveedores.md`).

## 5. Antes de lanzar

- **Pide una muestra de cada diseño** (Printful ofrece descuento en pedidos de muestra) y revisa la calidad con la lista de `docs/proveedores.md`.
- **Precio:** revisa en Printful el costo de cada prenda + envío a México y fija tu precio de venta para tener margen. A $799 MXN, comprueba que te quede ganancia después de la producción, el envío, la comisión de pago y el cupón del 10 %.
- **Envíos en Shopify:** ahora cobras $150 o envío gratis desde $1,050. Asegúrate de que cubra lo que te cobra Printful por el envío.

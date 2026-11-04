# HSTLRS

Tienda online de ropa streetwear preparada para **dropshipping**. Web estática (HTML + CSS + JS, sin dependencias): se puede publicar gratis en GitHub Pages, Netlify o Vercel.

## Qué incluye

- Catálogo con filtros por categoría, búsqueda y ordenación
- Ficha de producto con colores, tallas, guía de tallas y fecha de entrega estimada
- Carrito persistente (se guarda en el navegador) con barra de envío gratis
- Códigos de descuento (`HSTLR10`)
- Pago con el checkout de Shopify (tienda `0n1xxz-jc.myshopify.com`, en MXN); alternativa por WhatsApp o email
- Seguimiento de pedidos (vía 17TRACK), FAQ de envíos y devoluciones, textos legales
- Newsletter con código de bienvenida y diseño adaptado a móvil

## Drop 01 (colección propia)

La sección "Drop 01 — Próximamente" muestra tus playeras CORE y STUDIO, que en Shopify siguen en borrador (sin fotos y con precio pendiente). Los datos están en `assets/js/upcoming.js`. Para lanzarlas:

1. En Shopify, sube las fotos, confirma precio y stock (o desactiva el control de inventario) y cámbialas a **Activo**.
2. Copia los IDs de sus variantes y pasa cada playera de `upcoming.js` a `products.js` (con `shopifyVariants`).
3. Los suscriptores del formulario quedan en Shopify como clientes con la etiqueta `drop-01`: envíales el aviso desde Shopify Email.

## Cómo personalizarla

| Archivo | Qué cambiar |
|---|---|
| `assets/js/config.js` | Moneda, email, WhatsApp, coste y plazos de envío, cupones y modo de checkout |
| `assets/js/products.js` | Productos: nombre, precio, precio anterior, colores, tallas y foto (`image`) del proveedor |
| `assets/css/styles.css` | Colores y tipografías (variables en `:root`) |

### Flujo de dropshipping recomendado

1. Elige proveedor (CJ Dropshipping, AliExpress, Printful para ropa con tu logo…).
2. Añade cada producto en `products.js` con la foto del proveedor en `image` y tu precio de venta.
3. La web ya está conectada a Shopify (`checkoutMode: "shopify"`): al pulsar "Finalizar compra" el carrito se abre en el checkout de Shopify, que cobra, calcula el envío y aplica los descuentos.
4. Cada talla/color de `products.js` está vinculado a su variante en Shopify mediante `shopifyVariants`. Si añades un producto, créalo también en Shopify y copia los IDs de sus variantes.
5. Instala una app de dropshipping en Shopify (DSers, CJ Dropshipping, Printful…) para que los pedidos pasen al proveedor automáticamente.

Ajusta los plazos de `shipping` en `config.js` a los reales de tu proveedor y revisa los textos legales con la normativa de tu país.

## Ver en local

Abre `index.html` en el navegador, o ejecuta `python3 -m http.server` y entra en http://localhost:8000.

## Estado de la tienda en Shopify (`0n1xxz-jc.myshopify.com`)

Ya configurado:
- 11 productos activos con fotos por color, precios en MXN y precio anterior tachado
- Colecciones automáticas: Hoodies, Camisetas, Pantalones, Accesorios
- Cupón `HSTLR10` (10 %, todos los clientes, sin caducidad)
- Envíos (los que trae la tienda): estándar $150, gratis desde $1,050, exprés $195, internacional $360

Pendiente en el panel de Shopify (no se puede hacer desde la web):
1. **Contratar un plan** (la tienda está en prueba y no puede cobrar).
2. **Pagos** → Configuración → Pagos: activar Shopify Payments (RFC, CLABE y datos fiscales) y, si quieres, PayPal y pagos en efectivo (OXXO) con un proveedor como Mercado Pago o Conekta.
3. **Políticas** → pegar los textos de [`docs/politicas-shopify.md`](docs/politicas-shopify.md).
4. **Quitar la contraseña** de la tienda online al lanzar (Tienda online → Preferencias).
5. **Proveedor**: instalar DSers, CJ Dropshipping o Printful y vincular cada producto.
6. Cambiar en `assets/js/config.js` el email y el WhatsApp reales.

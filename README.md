# HSTLRS

Tienda online de ropa streetwear preparada para **dropshipping**. Web estática (HTML + CSS + JS, sin dependencias): se puede publicar gratis en GitHub Pages, Netlify o Vercel.

## Qué incluye

- Catálogo con filtros por categoría, búsqueda y ordenación
- Ficha de producto con colores, tallas, guía de tallas y fecha de entrega estimada
- Carrito persistente (se guarda en el navegador) con barra de envío gratis
- Códigos de descuento (`HSTLR10`, `DROP5`)
- Checkout por WhatsApp, email o redirección al checkout de Shopify
- Seguimiento de pedidos (vía 17TRACK), FAQ de envíos y devoluciones, textos legales
- Newsletter con código de bienvenida y diseño adaptado a móvil

## Cómo personalizarla

| Archivo | Qué cambiar |
|---|---|
| `assets/js/config.js` | Moneda, email, WhatsApp, coste y plazos de envío, cupones y modo de checkout |
| `assets/js/products.js` | Productos: nombre, precio, precio anterior, colores, tallas y foto (`image`) del proveedor |
| `assets/css/styles.css` | Colores y tipografías (variables en `:root`) |

### Flujo de dropshipping recomendado

1. Elige proveedor (CJ Dropshipping, AliExpress, Printful para ropa con tu logo…).
2. Añade cada producto en `products.js` con la foto del proveedor en `image` y tu precio de venta.
3. Empieza con `checkoutMode: "whatsapp"`: recibes el pedido, envías el enlace de pago y lo compras al proveedor con la dirección del cliente.
4. Cuando crezcas, crea la tienda en Shopify, pon `checkoutMode: "shopify"`, rellena `shopifyDomain` y los `shopifyVariants` de cada producto para cobrar con su checkout y automatizar los pedidos al proveedor.

Ajusta los plazos de `shipping` en `config.js` a los reales de tu proveedor y revisa los textos legales con la normativa de tu país.

## Ver en local

Abre `index.html` en el navegador, o ejecuta `python3 -m http.server` y entra en http://localhost:8000.

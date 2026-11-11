# HSTLRS

**Web publicada:** https://hstlrs-shop.github.io/ (GitHub Pages de la organización Hstlrs-shop, rama `tienda-dropshipping`)

Tienda online de streetwear **HSTLRS**, pensada como dropshipping: impresión bajo demanda con Printful y pago con el checkout de Shopify (`hsltrs.myshopify.com`, en MXN). Web estática (HTML + CSS + JS, sin dependencias): se publica gratis en GitHub Pages, Netlify o Vercel.

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: portada, categorías, novedades, historia de marca, pack, Essentials, lookbook, FAQ y club |
| `tienda.html` | Catálogo con filtros por categoría (`?cat=playeras`), búsqueda (`?q=hoodie`) y orden |
| `producto.html?id=…` | Ficha de producto: galería, color, talla, guía de tallas, carrito o "Avísame" y recomendados |

## Archivos

| Archivo | Qué cambiar |
|---|---|
| `assets/js/catalog.js` | **Productos**: nombre, precio, colores, tallas, fotos, `shopify` (IDs de variante) y `published` |
| `assets/js/config.js` | Moneda, email, WhatsApp, envíos, cupones, dominio de Shopify |
| `assets/js/store.js` | Lógica de la tienda (cabecera, carrito, checkout, avisos, páginas) |
| `assets/css/store.css` | Diseño (colores y tipografías en `:root`) |
| `assets/img/` | `drop/` tus fotos · `arte/` láminas · `concept/` ilustraciones provisionales |
| `assets/print/` | Archivos de impresión para Printful |

## Cómo se vende un producto

1. Créalo en Printful (se sincroniza con Shopify) o actívalo en Shopify.
2. En `catalog.js`, rellena `shopify` con los IDs de sus variantes (`"L": 123…` o `"L/Negro": 123…`) y pon `published: true`.
3. La web cambia "Avísame" por "Agregar al carrito" y el carrito manda al checkout de Shopify.

Mientras un producto no está publicado, el botón "Avísame" guarda el correo en Shopify como cliente con la etiqueta `aviso-<producto>`, para avisarle con Shopify Email.

Los 6 borradores del Drop 01 (CORE 01–03, STUDIO 01–03) ya tienen sus IDs de variante: solo falta activarlos en Shopify y poner `published: true`.

## Documentación

- [`docs/productos.md`](docs/productos.md): productos con potencial de venta y por qué
- [`docs/dropshipping-printful.md`](docs/dropshipping-printful.md): conexión con Printful
- [`docs/proveedores.md`](docs/proveedores.md): proveedores y ficha técnica
- [`docs/politicas-shopify.md`](docs/politicas-shopify.md): políticas para pegar en Shopify

## Ver en local

Abre `index.html` en el navegador, o ejecuta `python3 -m http.server` y entra en http://localhost:8000.

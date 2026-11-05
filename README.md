# Hstlrs
Tienda de ropa

## Colita (`colita/`)
App web de la tienda: catálogo con filtros por categoría, búsqueda y orden; detalle de
producto con color, talla y cantidad; favoritos; carrito lateral con envío gratis desde
$999 MXN; y checkout con validación (demo, sin cobro real).

Es HTML/CSS/JS sin dependencias ni build. Para probarla:

```sh
cd colita && python3 -m http.server 8000
# abre http://localhost:8000
```

El catálogo se edita en `colita/js/products.js`. El carrito y los favoritos se guardan en
el `localStorage` del navegador.

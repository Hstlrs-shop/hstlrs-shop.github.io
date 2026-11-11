// Genera assets/data/productos.json a partir de assets/js/catalog.js.
// Lo usa el asistente de IA (soporte-ia) para conocer productos y precios.
// Uso: node scripts/build-knowledge.mjs
import fs from "node:fs";
import vm from "node:vm";

const SITE = "https://hstlrs-shop.github.io/";
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("../assets/js/catalog.js", import.meta.url), "utf8"), ctx);
const cats = Object.fromEntries(ctx.window.CATEGORIES.map((c) => [c.id, c.name]));

const items = ctx.window.CATALOG.map((p) => ({
  nombre: p.name,
  categoria: cats[p.category] || p.category,
  precio: p.price,
  ...(p.sizePrice ? { precios_por_talla: p.sizePrice } : {}),
  colores: p.colors.map((c) => c.name),
  tallas: p.sizes,
  disponible: Boolean(p.published && p.shopify),
  url: `${SITE}producto.html?id=${p.id}`,
  descripcion: p.description,
  detalles: p.details,
}));

fs.writeFileSync(new URL("../assets/data/productos.json", import.meta.url), JSON.stringify(items, null, 1) + "\n");
console.log(`${items.length} productos (${items.filter((i) => i.disponible).length} disponibles)`);

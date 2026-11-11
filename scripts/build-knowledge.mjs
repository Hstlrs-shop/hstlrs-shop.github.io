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

// sitemap.xml con todas las páginas y productos disponibles
const today = new Date().toISOString().slice(0, 10);
const pages = ["", "tienda.html", ...ctx.window.CATEGORIES.map((c) => `tienda.html?cat=${c.id}`),
  ...ctx.window.CATALOG.filter((p) => p.published && p.shopify).map((p) => `producto.html?id=${p.id}`)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
  pages.map((u) => `  <url><loc>${SITE}${u.replace(/&/g, "&amp;")}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(new URL("../sitemap.xml", import.meta.url), xml);
console.log(`sitemap: ${pages.length} URLs`);

// Empaqueta ../site (y ../site/assets) dentro del Worker (src/site-files.ts) para
// servir la web desde la misma URL que la API, sin hosting aparte.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const root = new URL("../../site/", import.meta.url).pathname;
const text = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };
const bin = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon" };
const files = {};
let bytes = 0;
function walk(dir, prefix) {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) { walk(full, `${prefix}${f}/`); continue; }
    const ext = extname(f);
    if (text[ext]) files[`/${prefix}${f}`] = { type: text[ext], body: readFileSync(full, "utf8") };
    else if (bin[ext]) files[`/${prefix}${f}`] = { type: bin[ext], b64: readFileSync(full).toString("base64") };
    else continue;
    bytes += statSync(full).size;
  }
}
walk(root, "");
// Versión de los recursos: cambia en cada despliegue que los modifica (rompe la caché del navegador)
const V = createHash("sha1").update(["/app.js", "/styles.css", "/config.js"].map((k) => files[k]?.body ?? "").join("")).digest("hex").slice(0, 8);
for (const f of Object.values(files)) {
  if (f.type.startsWith("text/html")) f.body = f.body.replace(/"\/(app\.js|styles\.css|config\.js)"/g, `"/$1?v=${V}"`);
}
files["/"] = files["/index.html"];
writeFileSync(new URL("../src/site-files.ts", import.meta.url),
  `// Generado por scripts/build-site.mjs — no editar a mano.\nexport const ASSET_V = "${V}";\n` +
  "export const SITE: Record<string, { type: string; body?: string; b64?: string }> = " + JSON.stringify(files) + ";\n");
console.log(`site empaquetado: ${Object.keys(files).length} archivos, ${Math.round(bytes / 1024)} KB`);

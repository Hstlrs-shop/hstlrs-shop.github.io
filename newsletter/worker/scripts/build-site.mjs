// Empaqueta ../site dentro del Worker (src/site-files.ts) para servir la web
// desde la misma URL que la API, sin hosting aparte.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const dir = new URL("../../site/", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const files = {};
for (const f of readdirSync(dir)) {
  const ext = extname(f);
  if (!types[ext]) continue;
  files["/" + f] = { type: types[ext], body: readFileSync(join(dir, f), "utf8") };
}
files["/"] = files["/index.html"];
writeFileSync(new URL("../src/site-files.ts", import.meta.url),
  "// Generado por scripts/build-site.mjs — no editar a mano.\nexport const SITE: Record<string, { type: string; body: string }> = " + JSON.stringify(files) + ";\n");
console.log("site empaquetado:", Object.keys(files).join(" "));

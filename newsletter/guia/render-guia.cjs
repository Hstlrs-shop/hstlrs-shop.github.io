// Genera los PDF de la guía: completa (guia1.pdf) y muestra gratis (capitulo-1.pdf).
// Uso: node render-guia.cjs <carpeta de salida>
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const out = process.argv[2] || __dirname;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + path.join(__dirname, "guia.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const footer = `<div style="width:100%;font:7.5pt Inter,sans-serif;color:#8a7a6c;padding:0 18mm;display:flex;justify-content:space-between">
    <span>Lana con Café · Tu primera inversión en México · Ed. 1.0</span><span class="pageNumber"></span></div>`;
  for (const [file, hide] of [["guia1.pdf", ".solo-gratis"], ["capitulo-1.pdf", ".solo-completa"]]) {
    await page.evaluate((sel) => {
      document.querySelectorAll(".solo-gratis, .solo-completa").forEach((e) => (e.style.display = ""));
      document.querySelectorAll(sel).forEach((e) => (e.style.display = "none"));
    }, hide);
    await page.pdf({ path: path.join(out, file), format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: footer, preferCSSPageSize: true });
    console.log("ok", file);
  }
  await browser.close();
})();

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed } from "../src/rss.ts";
import { scoreItem, fingerprint } from "../src/scoring.ts";

const rss = `<rss><channel><item><title><![CDATA[Fed cuts interest rates &amp; signals more]]></title>
<link>https://x.com/a?utm=1</link><description>&lt;p&gt;Hola&lt;/p&gt;</description><pubDate>Thu, 20 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>ECB holds</title><link rel="alternate" href="https://e.eu/1"/><updated>2026-11-20T10:00:00Z</updated><summary>txt</summary></entry></feed>`;

test("parsea RSS con CDATA y entidades", () => {
  const [i] = parseFeed(rss);
  assert.equal(i.title, "Fed cuts interest rates & signals more");
  assert.equal(i.summary, "Hola");
  assert.equal(i.publishedAt, Date.parse("2026-11-20T10:00:00Z"));
});
test("parsea Atom", () => {
  const [i] = parseFeed(atom);
  assert.equal(i.link, "https://e.eu/1");
});
test("puntúa alto una decisión de tasas oficial", () => {
  const s = scoreItem("Federal Reserve issues FOMC statement on interest rates", "", { id: "fed", name: "Fed", url: "", tier: "oficial", scope: "global" });
  assert.ok(s.impact >= 4, JSON.stringify(s));
  assert.equal(s.category, "bancos centrales");
});
test("penaliza ruido", () => {
  const s = scoreItem("Podcast: recetas de fútbol", "", { id: "x", name: "x", url: "", tier: "medio", scope: "global" });
  assert.equal(s.impact, 1);
});
test("huella igual para el mismo titular reordenado", () => {
  assert.equal(fingerprint("Fed cuts rates by 25 bps"), fingerprint("Rates: Fed cuts by 25 bps"));
});

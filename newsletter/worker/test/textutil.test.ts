import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesTerm, normalize, parseCdmx, validTerm } from "../src/textutil.ts";

test("normaliza acentos y mayúsculas", () => assert.equal(normalize("  Política  MONETARIA "), "politica monetaria"));
test("valida temas del radar", () => {
  assert.equal(validTerm("$NVDA"), "nvda");
  assert.equal(validTerm("Peso"), "peso");
  assert.equal(validTerm("a"), null);
  assert.equal(validTerm("<script>"), null);
});
test("coincide por palabra completa", () => {
  const t = normalize("El peso mexicano se aprecia; Banxico recorta tasa");
  assert.ok(matchesTerm(t, "peso"));
  assert.ok(matchesTerm(t, "banxico"));
  assert.ok(!matchesTerm(normalize("Pesos pesados de la industria"), "peso"));
  assert.ok(matchesTerm(normalize("Acciones de S&P 500 suben"), "s&p 500"));
});
test("hora del centro de México a UTC", () => {
  assert.equal(parseCdmx("2026-11-24", "08:30"), Date.parse("2026-11-24T14:30:00Z"));
  assert.equal(parseCdmx("24/11/2026", "08:30"), null);
});

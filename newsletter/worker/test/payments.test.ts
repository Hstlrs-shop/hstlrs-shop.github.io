import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyMercadoPago } from "../src/signature.ts";

const secret = "mp_secret";
const sign = (id: string, req: string, ts: number) =>
  createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");

test("acepta firma válida de Mercado Pago (id en minúsculas)", async () => {
  const ts = Math.floor(Date.now() / 1000);
  const sig = sign("2c9380848abc", "req-1", ts);
  assert.equal(await verifyMercadoPago("2C9380848ABC", `ts=${ts},v1=${sig}`, "req-1", secret), true);
});
test("rechaza firma alterada, caducada o ausente", async () => {
  const ts = Math.floor(Date.now() / 1000);
  assert.equal(await verifyMercadoPago("abc", `ts=${ts},v1=${"0".repeat(64)}`, "r", secret), false);
  const old = ts - 3600;
  assert.equal(await verifyMercadoPago("abc", `ts=${old},v1=${sign("abc", "r", old)}`, "r", secret), false);
  assert.equal(await verifyMercadoPago("abc", null, "r", secret), false);
});

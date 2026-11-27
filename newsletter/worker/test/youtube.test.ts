import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed } from "../src/youtube-feed.ts";
test("lee el feed de YouTube", () => {
  const xml = `<feed><entry><yt:videoId>abc123</yt:videoId><title>CETES hoy &amp; tu dinero</title><link rel="alternate" href="https://www.youtube.com/shorts/abc123"/><published>2026-11-21T14:00:00+00:00</published></entry><entry><yt:videoId>zzz</yt:videoId><title>Semana</title><link rel="alternate" href="https://www.youtube.com/watch?v=zzz"/><published>2026-11-22T14:00:00+00:00</published></entry></feed>`;
  const v = parseFeed(xml);
  assert.equal(v.length, 2); assert.equal(v[0].id, "zzz"); assert.equal(v[1].title, "CETES hoy & tu dinero"); assert.ok(v[1].short); assert.ok(!v[0].short);
});

// Lectura del feed RSS público de YouTube (sin dependencias, para poder probarla).

export interface Video { id: string; title: string; published: number; url: string; thumb: string; short: boolean }

export function parseFeed(xml: string): Video[] {
  const out: Video[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = e.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    const pub = Date.parse(e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "");
    const link = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? `https://www.youtube.com/watch?v=${id}`;
    if (!id || !isFinite(pub)) continue;
    const t = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    out.push({ id, title: t, published: pub, url: link, thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, short: link.includes("/shorts/") });
  }
  return out.sort((a, b) => b.published - a.published);
}


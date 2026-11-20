// Parser RSS 2.0 / Atom mínimo, sin dependencias (corre en Workers).

export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: number; // epoch ms
  image: string | null; // foto que la propia fuente publica en su RSS
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

export function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function stripHtml(s: string): string {
  return decode(decode(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m?.[1];
}

function atomLink(block: string): string | undefined {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  const pick = links.find((a) => /rel=["']alternate["']/i.test(a)) ?? links.find((a) => !/rel=/i.test(a)) ?? links[0];
  return pick?.match(/href=["']([^"']+)["']/i)?.[1];
}

function parseDate(s: string | undefined): number {
  if (!s) return Date.now();
  const t = Date.parse(decode(s).trim());
  return Number.isFinite(t) ? t : Date.now();
}

/** Foto del item: media:content / media:thumbnail / enclosure de imagen / primer <img> del contenido. */
export function extractImage(block: string): string | null {
  const attr = (tagRe: RegExp) => {
    for (const m of block.matchAll(tagRe)) {
      const a = m[0];
      if (/type=["'](?!image)/i.test(a) && !/medium=["']image/i.test(a)) continue; // video/audio
      const u = a.match(/url=["']([^"']+)["']/i)?.[1];
      if (u) return u;
    }
    return null;
  };
  const url =
    attr(/<media:content\b[^>]*>/gi) ?? attr(/<media:thumbnail\b[^>]*>/gi) ?? attr(/<enclosure\b[^>]*>/gi) ??
    decode(block).match(/<img\b[^>]*?\ssrc=["']([^"']+)["']/i)?.[1] ?? null;
  if (!url) return null;
  const clean = decode(url).trim();
  return /^https:\/\//i.test(clean) && clean.length < 1000 ? clean : null;
}

export function parseFeed(xml: string): FeedItem[] {
  const isAtom = /<feed\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom/i.test(xml) && !/<item\b/i.test(xml);
  const blocks = [...xml.matchAll(isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);

  const items: FeedItem[] = [];
  for (const b of blocks) {
    const title = stripHtml(tag(b, "title") ?? "");
    const link = isAtom ? atomLink(b) : decode(tag(b, "link") ?? tag(b, "guid") ?? "").trim();
    if (!title || !link) continue;
    const summary = stripHtml(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content") ?? "").slice(0, 500);
    const date = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    items.push({ title, link: decode(link).trim(), summary, publishedAt: parseDate(date), image: extractImage(b) });
  }
  return items;
}

// Fuentes de noticias. La velocidad sale de aquí: las fuentes OFICIALES
// (bancos centrales, reguladores, estadísticas) publican el dato antes que
// cualquier medio. Los medios y agregadores sirven para cobertura general.
//
// Todas estas URLs se comprobaron (HTTP 200 con items) el 2026-11-20.
// Nota: el feed de BLS (bls_latest.rss) es un único item fijo; para datos de
// EE.UU. al segundo usa su calendario de publicación (ver docs/OPERACION.md).

export type Tier = "oficial" | "agencia" | "medio" | "agregador";
export type Scope = "global" | "nacional";

export interface Source {
  id: string;
  name: string;
  url: string;
  tier: Tier;
  scope: Scope;
  every?: number; // minutos entre lecturas (Google News limita a las IPs de Cloudflare: 429)
}

const gnews = (q: string, hl: string, gl: string, ceid: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

export const GLOBAL_SOURCES: Source[] = [
  // Oficiales: mueven mercados en el segundo en que se publican
  { id: "fed", name: "Reserva Federal", url: "https://www.federalreserve.gov/feeds/press_all.xml", tier: "oficial", scope: "global" },
  { id: "ecb", name: "BCE", url: "https://www.ecb.europa.eu/rss/press.html", tier: "oficial", scope: "global" },
  { id: "boe", name: "Banco de Inglaterra", url: "https://www.bankofengland.co.uk/rss/news", tier: "oficial", scope: "global" },
  { id: "sec", name: "SEC", url: "https://www.sec.gov/news/pressreleases.rss", tier: "oficial", scope: "global" },
  { id: "wh", name: "Casa Blanca", url: "https://www.whitehouse.gov/news/feed/", tier: "oficial", scope: "global" },
  // Medios / tiempo real
  { id: "mw-rt", name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", tier: "medio", scope: "global" },
  { id: "bbc-biz", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", tier: "medio", scope: "global" },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", tier: "medio", scope: "global" },
  { id: "aje", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", tier: "medio", scope: "global" },
  { id: "inv-es", name: "Investing.com ES", url: "https://es.investing.com/rss/news.rss", tier: "medio", scope: "global" },
  // Agregador temático (cubre Reuters/Bloomberg/AP vía titulares)
  {
    id: "gn-macro",
    name: "Google News · Macro",
    url: gnews("Fed OR \"tasas de interés\" OR inflación OR aranceles OR OPEP OR \"Wall Street\"", "es-419", "US", "US:es-419"),
    tier: "agregador",
    scope: "global",
    every: 15,
  },
];

// Presets nacionales. Se elige con la variable COUNTRY en wrangler.toml.
// Añade aquí el feed oficial de tu banco central / bolsa cuando lo tengas.
export const NATIONAL_PRESETS: Record<string, Source[]> = {
  MX: [
    { id: "ef-merc", name: "El Financiero · Mercados", url: "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/category/mercados/?outputType=xml", tier: "medio", scope: "nacional" },
    { id: "ef-eco", name: "El Financiero · Economía", url: "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/category/economia/?outputType=xml", tier: "medio", scope: "nacional" },
    { id: "exp-merc-mx", name: "Expansión · Mercados", url: "https://expansion.mx/rss/mercados", tier: "medio", scope: "nacional" },
    { id: "exp-eco-mx", name: "Expansión · Economía", url: "https://expansion.mx/rss/economia", tier: "medio", scope: "nacional" },
    { id: "eu-cartera", name: "El Universal · Cartera", url: "https://www.eluniversal.com.mx/arc/outboundfeeds/rss/category/cartera/?outputType=xml", tier: "medio", scope: "nacional" },
    { id: "gn-mx", name: "Google News · México", url: gnews("Banxico OR \"peso mexicano\" OR BMV OR Hacienda OR Pemex", "es-419", "MX", "MX:es-419"), tier: "agregador", scope: "nacional", every: 15 },
  ],
  ES: [
    { id: "exp-merc", name: "Expansión Mercados", url: "https://e00-expansion.uecdn.es/rss/mercados.xml", tier: "medio", scope: "nacional" },
    { id: "gn-es", name: "Google News · España", url: gnews("Ibex OR \"Banco de España\" OR CNMV OR \"prima de riesgo\"", "es", "ES", "ES:es"), tier: "agregador", scope: "nacional", every: 15 },
  ],
  CO: [
    { id: "gn-co", name: "Google News · Colombia", url: gnews("\"Banco de la República\" OR \"peso colombiano\" OR \"Bolsa de Valores de Colombia\" OR Ecopetrol", "es-419", "CO", "CO:es-419"), tier: "agregador", scope: "nacional", every: 15 },
  ],
  AR: [
    { id: "gn-ar", name: "Google News · Argentina", url: gnews("BCRA OR Merval OR \"dólar blue\" OR \"riesgo país\" OR FMI", "es-419", "AR", "AR:es-419"), tier: "agregador", scope: "nacional", every: 15 },
  ],
  VE: [
    { id: "gn-ve", name: "Google News · Venezuela", url: gnews("BCV OR \"tipo de cambio\" OR PDVSA OR \"Bolsa de Caracas\" OR petróleo Venezuela", "es-419", "VE", "VE:es-419"), tier: "agregador", scope: "nacional", every: 15 },
  ],
  CL: [
    { id: "gn-cl", name: "Google News · Chile", url: gnews("\"Banco Central de Chile\" OR IPSA OR \"peso chileno\" OR cobre", "es-419", "CL", "CL:es-419"), tier: "agregador", scope: "nacional", every: 15 },
  ],
  PE: [
    { id: "gn-pe", name: "Google News · Perú", url: gnews("BCRP OR \"Bolsa de Valores de Lima\" OR sol peruano OR MEF", "es-419", "PE", "PE:es-419"), tier: "agregador", scope: "nacional", every: 15 },
  ],
};

export function sourcesFor(country: string): Source[] {
  return [...GLOBAL_SOURCES, ...(NATIONAL_PRESETS[country.toUpperCase()] ?? [])];
}

// Páginas para Google: "Precio del dólar hoy" y "Precio del bitcoin hoy".
// Se generan en el servidor con el precio ya escrito en el HTML (Google lo lee
// sin ejecutar JavaScript), tabla de conversiones, noticias que lo mueven y
// preguntas frecuentes con datos estructurados (FAQPage).

import type { Env } from "./env";
import { catImage, layout, newsPath } from "./pages";

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mx = (n: number, d = 2) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });

async function getJson(url: string): Promise<any> {
  // Caché de 5 min en el borde de Cloudflare: no se llama a la API en cada visita
  const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true }, headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

function hoyCdmx(ms = Date.now()) {
  const d = new Date(ms - 6 * 3600_000);
  const m = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][d.getUTCMonth()];
  return { fecha: `${d.getUTCDate()} de ${m} de ${d.getUTCFullYear()}`, hora: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}` };
}

interface Kind {
  slug: string; title: (p: string, f: string) => string; h1: string; symbol: string; unit: string; base: string;
  newsSql: string; amounts: number[]; explainer: string; faq: [string, string][];
}

const KINDS: Record<string, Kind> = {
  dolar: {
    slug: "dolar-hoy", h1: "Precio del dólar hoy en México", symbol: "FX_IDC:USDMXN", unit: "dólar", base: "USD",
    title: (p, f) => `Precio del dólar hoy en México: $${p} pesos (${f})`,
    newsSql: "(category LIKE '%divis%' OR category LIKE '%banco%' OR headline_es LIKE '%peso%' OR headline_es LIKE '%dólar%' OR title LIKE '%peso%' OR title LIKE '%dólar%' OR title LIKE '%Banxico%')",
    amounts: [1, 5, 10, 20, 50, 100, 200, 500, 1000, 5000],
    explainer: `El tipo de cambio entre el dólar y el peso se mueve por la diferencia de tasas de interés entre Banxico y la Reserva Federal de EE.UU., los datos de inflación y empleo, el precio del petróleo, el apetito por riesgo de los inversionistas globales y las noticias políticas y comerciales (aranceles, T-MEC). Cuando Banxico baja su tasa más rápido que la Fed, invertir en pesos se vuelve menos atractivo y el dólar tiende a subir; cuando hay calma en los mercados, el peso suele fortalecerse.`,
    faq: [
      ["¿A cuánto está el dólar hoy en México?", "El precio de referencia del mercado aparece arriba y se actualiza cada pocos minutos. Es el tipo de cambio interbancario; bancos y casas de cambio venden un poco más caro y compran un poco más barato."],
      ["¿Por qué el dólar en el banco es más caro que el precio de hoy?", "Los bancos y casas de cambio agregan un margen (spread) sobre el precio interbancario para cubrir costos y obtener ganancia. Por eso la ventanilla puede estar entre 50 centavos y 1 peso por encima."],
      ["¿Qué hace que el dólar suba o baje?", "Principalmente las tasas de interés de Banxico y la Fed, la inflación, el petróleo, la confianza de los inversionistas y noticias políticas o comerciales. En Lana con Café te avisamos en cuanto sale una noticia que puede moverlo."],
      ["¿Cómo recibo una alerta cuando se mueva el dólar?", "Únete gratis al bot de Lana con Café en Telegram y agrega “peso” a tu radar: te avisamos cuando salga una noticia que lo mueva."],
    ],
  },
  bitcoin: {
    slug: "bitcoin-hoy", h1: "Precio del bitcoin hoy en pesos mexicanos", symbol: "BITSTAMP:BTCUSD", unit: "bitcoin", base: "BTC",
    title: (p, f) => `Precio del bitcoin hoy en pesos: $${p} MXN (${f})`,
    newsSql: "(category LIKE '%cripto%' OR title LIKE '%bitcoin%' OR title LIKE '%cripto%' OR headline_es LIKE '%bitcoin%')",
    amounts: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    explainer: `El precio del bitcoin depende de la oferta y la demanda en los exchanges de todo el mundo. Lo mueven las decisiones de la Fed (tasas más bajas suelen favorecer a los activos de riesgo), la entrada o salida de dinero en los ETF de bitcoin, la regulación y el ánimo general de los mercados. En pesos, además, influye el tipo de cambio: si el dólar sube, el bitcoin en pesos también sube aunque en dólares no se mueva.`,
    faq: [
      ["¿Cuánto vale un bitcoin hoy en pesos mexicanos?", "El precio de referencia aparece arriba y se actualiza cada pocos minutos. Cada plataforma (Bitso, Binance, etc.) puede mostrar una diferencia pequeña por sus comisiones."],
      ["¿Puedo comprar menos de un bitcoin?", "Sí. Un bitcoin se divide en 100 millones de “satoshis”, así que puedes comprar fracciones desde unos cuantos pesos. La tabla de arriba muestra cuánto cuestan algunas fracciones."],
      ["¿Por qué cambia tanto el precio del bitcoin?", "Es un activo muy volátil: reacciona fuerte a las tasas de interés, la regulación, el flujo de los ETF y el ánimo de los inversionistas. No es una inversión segura; infórmate antes de invertir."],
      ["¿Cómo recibo alertas del bitcoin?", "En el bot de Lana con Café en Telegram puedes crear alertas de precio (/alerta btc 1200000) y agregar “bitcoin” a tu radar de noticias."],
    ],
  },
};

export async function marketPage(env: Env, key: "dolar" | "bitcoin"): Promise<Response> {
  const k = KINDS[key];
  const { fecha, hora } = hoyCdmx();
  let price = 0, second = "", rows = "";
  try {
    if (key === "dolar") {
      const r = (await getJson("https://api.coinbase.com/v2/exchange-rates?currency=USD")).data.rates;
      price = parseFloat(r.MXN);
      const eur = price / parseFloat(r.EUR);
      second = `<div class="kpi"><span>Euro</span><b>$${mx(eur)}</b><small>pesos por euro</small></div><div class="kpi"><span>1 peso</span><b>$${mx(1 / price, 4)}</b><small>dólares</small></div>`;
    } else {
      const [mxn, usd] = await Promise.all([
        getJson("https://api.coinbase.com/v2/prices/BTC-MXN/spot"), getJson("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
      ]);
      price = parseFloat(mxn.data.amount);
      second = `<div class="kpi"><span>En dólares</span><b>$${mx(parseFloat(usd.data.amount), 0)}</b><small>USD por bitcoin</small></div><div class="kpi"><span>1,000 pesos</span><b>${mx(1000 / price, 6)}</b><small>bitcoin</small></div>`;
    }
  } catch (e) {
    console.warn("precio", (e as Error).message);
  }
  const p = price ? mx(price, key === "bitcoin" ? 0 : 2) : "—";
  rows = price ? k.amounts.map((a) => `<tr><td>${a.toLocaleString("es-MX", { maximumFractionDigits: 4 })} ${k.base}</td><td><b>$${mx(a * price, key === "bitcoin" && a >= 0.1 ? 0 : 2)} MXN</b></td></tr>`).join("") : "";

  const news = await env.DB.prepare(
    `SELECT * FROM news WHERE detected_at > ?1 AND impact >= 2 AND ${k.newsSql} ORDER BY impact DESC, detected_at DESC LIMIT 6`,
  ).bind(Date.now() - 4 * 86400_000).all<any>();
  const bot = await env.BOT_KV?.get("botuser");
  const url = `${env.SITE_URL}/${k.slug}`;
  const title = k.title(p, fecha);
  const description = `${k.h1}: $${p} pesos al ${fecha}, ${hora} h. Convertidor, gráfica en vivo y las noticias que lo están moviendo.`;

  const body = `<main class="wrap seo">
  <nav class="crumbs"><a href="/">Inicio</a> › <a href="/mercados.html">Mercados</a> › <span>${h(k.h1)}</span></nav>
  <section class="quote panel">
    <div>
      <h1>${h(k.h1)}</h1>
      <p class="note">Actualizado el ${fecha} a las ${hora} h (CDMX) · Referencia de mercado</p>
      <div class="price-now">1 ${k.unit} = <b>$${p}</b> <small>pesos mexicanos</small></div>
      <div class="kpis">${second}</div>
    </div>
    <div class="converter" data-rate="${price}" data-base="${k.base}">
      <label>${k.base}<input type="number" inputmode="decimal" value="${key === "dolar" ? 100 : 0.01}" step="any" data-from></label>
      <span class="swap">⇅</span>
      <label>MXN<input type="number" inputmode="decimal" step="any" data-to></label>
      <p class="note">Convertidor con el precio de referencia.</p>
    </div>
  </section>
  <div class="panel tv-box" style="height:380px;margin-top:20px" data-tv-mini="${k.symbol}"></div>

  <div class="seo-grid">
    <section>
      <h2>Lo que está moviendo el ${k.unit}</h2>
      <div class="cards">${news.results.map((n) => `
        <a class="card" href="${newsPath(n)}"><img src="${h(n.image ?? catImage(env, n.category))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${h(catImage(env, n.category))}'"><div><h3>${h(n.headline_es ?? n.title)}</h3>${n.brief_es ? `<p>${h(n.brief_es)}</p>` : ""}<small>${h(n.source_name)}</small></div></a>`).join("") || `<p class="note">Sin noticias relevantes en los últimos días.</p>`}</div>
      <h2>¿Por qué sube o baja?</h2>
      <p>${h(k.explainer)}</p>
      <h2>Preguntas frecuentes</h2>
      <div class="faq">${k.faq.map(([q, a]) => `<details><summary>${h(q)}</summary><p>${h(a)}</p></details>`).join("")}</div>
    </section>
    <aside class="stack">
      ${rows ? `<div class="panel"><h3>Tabla de conversión</h3><table class="conv"><tbody>${rows}</tbody></table></div>` : ""}
      <div class="cta-box">
        <img src="/assets/logo-mark-light.svg" alt="" width="44" height="44">
        <h3>Te avisamos cuando se mueva</h3>
        <p>Agrega “${key === "dolar" ? "peso" : "bitcoin"}” a tu radar en Telegram y recibe la noticia en cuanto sale, explicada en 1 minuto.</p>
        ${bot ? `<a class="btn" href="https://t.me/${h(bot)}">Abrir el bot gratis</a>` : `<a class="btn" data-link="TELEGRAM_FREE">Unirme en Telegram</a>`}
      </div>
    </aside>
  </div>
</main>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: k.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  }).replace(/</g, "\\u003c")}</script>`;

  return new Response(layout(env, { title: `${title} · ${env.BRAND}`, description, image: `${env.SITE_URL}/assets/cat-${key === "dolar" ? "divisas" : "cripto"}.jpg`, url, body }), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120" },
  });
}

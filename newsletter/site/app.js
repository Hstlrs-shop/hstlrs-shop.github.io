const C = window.LCC;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : new Date(ms).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};
const dark = matchMedia("(prefers-color-scheme: dark)").matches;
const getJSON = (path) => fetch(`${C.API}${path}`).then((r) => r.json());

// Enlaces configurables (Telegram, Mercado Pago)
$$("[data-link]").forEach((a) => C[a.dataset.link] && (a.href = C[a.dataset.link]));

// ---------- TradingView (widgets gratuitos con atribución) ----------
function tv(el, name, config) {
  if (!el) return;
  el.innerHTML = `<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>`;
  const s = document.createElement("script");
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`;
  s.async = true;
  s.textContent = JSON.stringify({ colorTheme: dark ? "dark" : "light", isTransparent: true, locale: "es", ...config });
  el.firstChild.appendChild(s);
}
const SYM = {
  usdmxn: { proName: "FX_IDC:USDMXN", title: "Dólar / Peso" },
  eurmxn: { proName: "FX_IDC:EURMXN", title: "Euro / Peso" },
  eww: { proName: "AMEX:EWW", title: "Bolsa México (ETF)" },
  spx: { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  ndx: { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
  dji: { proName: "FOREXCOM:DJI", title: "Dow Jones" },
  btc: { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  oil: { proName: "TVC:USOIL", title: "Petróleo WTI" },
  gold: { proName: "TVC:GOLD", title: "Oro" },
  us10: { proName: "TVC:US10Y", title: "Bono 10A EE.UU." },
};
tv($("#ticker"), "ticker-tape", { symbols: Object.values(SYM), showSymbolLogo: true, displayMode: "adaptive" });

const OVERVIEW_TABS = [
  // Los widgets gratuitos no incluyen datos de la BMV: usamos el ETF de México y los ADR de emisoras mexicanas en Nueva York
  { title: "México", symbols: [{ s: "FX_IDC:USDMXN", d: "Dólar / Peso" }, { s: "AMEX:EWW", d: "Bolsa México (ETF EWW)" }, { s: "NYSE:AMX", d: "América Móvil (ADR)" }, { s: "NYSE:CX", d: "Cemex (ADR)" }, { s: "NYSE:FMX", d: "Femsa (ADR)" }, { s: "NYSE:KOF", d: "Coca-Cola Femsa (ADR)" }] },
  { title: "EE.UU.", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:DJI", d: "Dow Jones" }, { s: "NASDAQ:NVDA", d: "Nvidia" }, { s: "NASDAQ:AAPL", d: "Apple" }, { s: "NASDAQ:TSLA", d: "Tesla" }] },
  { title: "Cripto", symbols: [{ s: "BITSTAMP:BTCUSD", d: "Bitcoin" }, { s: "BITSTAMP:ETHUSD", d: "Ethereum" }, { s: "COINBASE:SOLUSD", d: "Solana" }, { s: "BITSTAMP:XRPUSD", d: "XRP" }] },
  { title: "Materias primas", symbols: [{ s: "TVC:USOIL", d: "Petróleo WTI" }, { s: "TVC:GOLD", d: "Oro" }, { s: "TVC:SILVER", d: "Plata" }, { s: "CAPITALCOM:COPPER", d: "Cobre" }] },
];
tv($("#tv-overview"), "market-overview", { dateRange: "1D", showChart: true, width: "100%", height: "100%", showSymbolLogo: true, showFloatingTooltip: true, tabs: OVERVIEW_TABS });

function advancedChart(el, symbol) {
  tv(el, "advanced-chart", { autosize: true, symbol, interval: "60", timezone: "America/Mexico_City", theme: dark ? "dark" : "light", style: "1", allow_symbol_change: true, withdateranges: true, hide_side_toolbar: false, support_host: "https://www.tradingview.com" });
}
const chartEl = $("#tv-chart");
if (chartEl) {
  advancedChart(chartEl, chartEl.dataset.symbol || "FX_IDC:USDMXN");
  $$("[data-chart]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-chart]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    advancedChart(chartEl, b.dataset.chart);
  }));
}
$$("[data-tv-mini]").forEach((el) => tv(el, "mini-symbol-overview", { symbol: el.dataset.tvMini, width: "100%", height: "100%", dateRange: "1M", trendLineColor: "#C8742B", underLineColor: "rgba(200,116,43,.15)", underLineBottomColor: "rgba(200,116,43,0)" }));
tv($("#tv-heatmap"), "stock-heatmap", { exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" });
tv($("#tv-calendar"), "events", { width: "100%", height: "100%", importanceFilter: "0,1", countryFilter: "mx,us" });

// ---------- Noticias ----------
const img = (n, cls = "") => `<img ${cls} src="${esc(n.image || n.cat_img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${esc(n.cat_img)}'">`;
const chip = (n) => `<span class="chip cat-${esc((n.cat_img || "").replace(/^.*cat-|\.jpg$/g, ""))}">${esc(n.category || "mercados")}</span>`;
const card = (n) => `<a class="card" href="${esc(n.url)}">${img(n)}<div>${chip(n)}<h3>${esc(n.title)}</h3>${n.brief ? `<p>${esc(n.brief)}</p>` : ""}
  <div class="foot"><span class="dot i${n.impact}" title="Impacto ${n.impact}/5"></span>${esc(n.source)} · ${ago(n.detected_at)}${n.views > 5 ? ` · 👁 ${n.views}` : ""}</div></div></a>`;

const leadEl = $("#lead");
if (leadEl) {
  let all = [], scope = "", shown = 12, featured = new Set();
  const render = () => {
    const list = all.filter((n) => (!scope || n.scope === scope) && (scope || !featured.has(n.id)));
    $("#cards").innerHTML = list.slice(0, shown).map(card).join("") || `<p class="note">Sin noticias de alto impacto todavía.</p>`;
    $("#more").hidden = list.length <= shown;
  };
  const load = async () => {
    try {
      const d = await getJSON(`/api/news?limit=60&min_impact=2`);
      all = d.items;
      $("#delay").textContent = d.realtime ? "En vivo" : `Retraso ${d.delay_min} min · Pro: al instante`;
      // Portada: la de mayor impacto con foto; luego 3 secundarias
      const byWeight = [...all].sort((a, b) => (b.impact - a.impact) || (!!b.image - !!a.image) || (b.detected_at - a.detected_at));
      const lead = byWeight.find((n) => n.image) || byWeight[0];
      if (lead) {
        leadEl.href = lead.url;
        leadEl.innerHTML = `${img(lead)}<div class="shade"></div><div class="txt">${chip(lead)}<h2>${esc(lead.title)}</h2>${lead.brief ? `<p>${esc(lead.brief)}</p>` : ""}</div>`;
        const side = byWeight.filter((n) => n !== lead).slice(0, 4);
        featured = new Set([lead, ...side].map((n) => n.id));
        $("#side").innerHTML = side.map((n) => `<a class="mini" href="${esc(n.url)}">${img(n)}<div>${chip(n)}<h3>${esc(n.title)}</h3><small>${esc(n.source)} · ${ago(n.detected_at)}</small></div></a>`).join("");
      }
      render();
    } catch {
      $("#cards").innerHTML = `<p class="note">No se pudieron cargar las noticias.</p>`;
    }
  };
  $$("#scope button").forEach((b) => b.addEventListener("click", () => {
    $$("#scope button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    scope = b.dataset.scope; shown = 12; render();
  }));
  $("#more")?.addEventListener("click", () => { shown += 12; render(); });
  load();
  setInterval(load, 120_000);

  // Lo más leído
  getJSON("/api/top").then((d) => {
    $("#top").innerHTML = d.items.map((n) => `<li><a href="${esc(n.url)}">${esc(n.title)}<small>${esc(n.source)} · ${ago(n.detected_at)}</small></a></li>`).join("") || `<li class="note">Aún sin lecturas.</li>`;
  }).catch(() => {});

  // Termómetro: noticias por hora y temas
  getJSON("/api/chart").then((d) => {
    const hours = Array.from({ length: 24 }, (_, h) => d.hours.find((x) => x.h === h) || { n: 0, hot: 0 });
    const max = Math.max(1, ...hours.map((x) => x.n));
    const hot = hours.reduce((a, x) => a + (x.hot || 0), 0);
    const level = hot >= 8 ? ["🔴", "Muy agitado"] : hot >= 4 ? ["🟠", "Agitado"] : hot >= 1 ? ["🟡", "Atento"] : ["🟢", "Tranquilo"];
    $("#level").textContent = `${level[0]} ${level[1]}`;
    $("#hot").textContent = `${hot} noticias de impacto alto en 24 h`;
    $("#bars").innerHTML = hours.map((x) => `<span style="height:${(x.n / max) * 100}%" title="${x.n} noticias"><i style="height:${x.n ? (x.hot / x.n) * 100 : 0}%"></i></span>`).join("");
    const cmax = Math.max(1, ...d.categories.map((c) => c.n));
    $("#cats").innerHTML = d.categories.map((c) => `<div class="hbar">${esc(c.c)} · ${c.n}<div><b style="width:${(c.n / cmax) * 100}%"></b></div></div>`).join("");
    const b = Object.fromEntries(d.bias.map((x) => [x.b, x.n]));
    const tot = (b.alcista || 0) + (b.bajista || 0) + (b.mixto || 0) + (b.neutral || 0);
    if (tot) {
      const pc = (k) => Math.round(((b[k] || 0) / tot) * 100);
      $("#sent").innerHTML = `<span class="u" style="width:${pc("alcista")}%"></span><span class="m" style="width:${pc("mixto") + pc("neutral")}%"></span><span class="d" style="width:${pc("bajista")}%"></span>`;
      $("#sent-legend").innerHTML = `<span>▲ Alcista ${pc("alcista")}%</span><span>↔ Mixto/neutral ${pc("mixto") + pc("neutral")}%</span><span>▼ Bajista ${pc("bajista")}%</span>`;
    } else $("#sent-wrap").hidden = true;
  }).catch(() => {});
}

// Ediciones del newsletter
const arch = $("#archive");
if (arch) getJSON("/api/digests").then((ds) => {
  arch.innerHTML = ds.slice(0, 6).map((d) => `<li><a href="/edicion.html?id=${d.id}">${esc(d.subject)}</a><div class="note">${d.id}</div></li>`).join("") || `<li class="note">La primera edición sale el próximo día hábil a las 5:17.</li>`;
}).catch(() => {});

// ---------- Suscripción por email ----------
$$("form.sub").forEach((f) => f.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = f.querySelector("button");
  btn.disabled = true;
  try {
    const r = await fetch(`${C.API}/api/subscribe`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: f.querySelector("input").value, source: location.pathname }) });
    f.innerHTML = r.ok ? `<p class="note">✅ Listo. Mañana te llega la primera edición con el café.</p>` : `<p class="note">Revisa el email e inténtalo de nuevo.</p>`;
  } catch { btn.disabled = false; }
}));

// ---------- Página de noticia: reacciones y copiar enlace ----------
const react = $(".react");
if (react) $$("button", react).forEach((b) => b.addEventListener("click", async () => {
  try {
    const r = await fetch(`${C.API}/api/react`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: react.dataset.id, v: Number(b.dataset.v) }) });
    const d = await r.json();
    $$("button", react)[0].querySelector("b").textContent = d.likes;
    $$("button", react)[1].querySelector("b").textContent = d.dislikes;
    b.setAttribute("aria-pressed", "true");
  } catch {}
}));
$$("button.copy").forEach((b) => b.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(b.dataset.url); b.textContent = "¡Copiado!"; } catch { prompt("Copia el enlace:", b.dataset.url); }
}));

// ---------- Edición del newsletter ----------
const ed = $("#edition");
if (ed) {
  const id = new URLSearchParams(location.search).get("id") || "latest";
  getJSON(`/api/digest/${encodeURIComponent(id)}`).then((d) => {
    if (!d.html) throw 0;
    document.title = `${d.subject} · ${C.BRAND}`;
    ed.innerHTML = d.html;
  }).catch(() => (ed.innerHTML = "<p>Edición no encontrada.</p>"));
}

// ---------- Gracias (vuelta de Mercado Pago con ?preapproval_id=…) ----------
const acc = $("#access");
if (acc) {
  const id = new URLSearchParams(location.search).get("preapproval_id");
  let tries = 0;
  const poll = async () => {
    const r = await fetch(`${C.API}/api/acceso?preapproval_id=${encodeURIComponent(id)}`);
    const d = await r.json();
    if (r.status === 202 && tries++ < 40) {
      acc.innerHTML = "<p>Mercado Pago está confirmando tu pago… no cierres esta página.</p>";
      return setTimeout(poll, 3000);
    }
    if (!d.invite_link) return (acc.innerHTML = `<p>Aún no vemos tu suscripción como pagada (${esc(d.error || "pendiente")}). Recarga en unos minutos o escríbenos por Telegram.</p>`);
    acc.innerHTML = `
      <p><a class="btn accent" href="${esc(d.invite_link)}">Entrar al canal Pro de Telegram</a></p>
      <p class="note">El enlace es de un solo uso y caduca en 7 días. No lo compartas. Puedes volver a esta página para verlo de nuevo.</p>
      ${d.api_key ? `<p>Tu API key (guárdala):</p><code class="key">${esc(d.api_key)}</code>
      <p class="note">Uso: <code>GET ${esc(C.API)}/api/news</code> con cabecera <code>Authorization: Bearer TU_KEY</code></p>` : ""}`;
  };
  id ? poll() : (acc.innerHTML = "<p>Falta el identificador de la suscripción.</p>");
}

// Herramientas para Google: "CETES hoy" con calculadora y calculadora de rendimiento real (vs inflación).
// Tasas: página pública de Banxico (resultados de la última subasta), en caché de 3 h en D1 (flags 'rates:banxico').
// Inflación: variables INFLATION_PCT / INFLATION_PERIOD (INEGI), con su periodo visible en la página.
// Todo el cálculo se explica en la página; los valores iniciales ya van en el HTML (Google los lee sin JavaScript).

import { num, type Env } from "./env";
import { layout } from "./pages";

const h = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mx = (n: number, d = 2) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const RET_ISR = 0.009; // retención anual de ISR sobre el capital, LIF 2026 (DOF 7/11/2025)

export interface Rates { date: string; target: number; c28: number; c91: number; c182: number; c364: number; fetched: number; source: string }
const FALLBACK: Rates = { date: "17/11/2026", target: 6.25, c28: 6.19, c91: 6.49, c182: 6.67, c364: 6.95, fetched: 0, source: "Banxico (respaldo)" };

export function parseBanxico(html: string): Rates | null {
  const t = html.replace(/<[^>]*>/g, " ").replace(/&iacute;/g, "í").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const num1 = (re: RegExp) => { const m = t.match(re); return m ? parseFloat(m[1]) : NaN; };
  const date = t.match(/subasta de valores gubernamentales\s+(\d{2}\/\d{2}\/\d{4})/)?.[1];
  const r = {
    c28: num1(/Cetes a 28 días\s+([\d.]+)/), c91: num1(/Cetes a 91 días\s+([\d.]+)/),
    c182: num1(/Cetes a 182 días\s+([\d.]+)/), c364: num1(/Cetes a 364 días\s+([\d.]+)/),
  };
  const tgt = html.match(/id="tdSF61745">\s*([\d.]+)/)?.[1];
  if (!date || Object.values(r).some((x) => !(x > 0 && x < 30))) return null;
  return { date, target: tgt ? parseFloat(tgt) : NaN, ...r, fetched: Date.now(), source: "Banco de México" };
}

export async function getRates(env: Env, ctx?: ExecutionContext): Promise<Rates> {
  const row = await env.DB.prepare("SELECT v FROM flags WHERE k = 'rates:banxico'").first<{ v: string }>();
  const cached = row ? (JSON.parse(row.v) as Rates) : null;
  const refresh = async () => {
    const res = await fetch("https://www.banxico.org.mx/tipcamb/llenarTasasInteresAction.do?idioma=sp", { headers: { "user-agent": "Mozilla/5.0 lanaconcafe" } });
    const r = res.ok ? parseBanxico(await res.text()) : null;
    if (r) await env.DB.prepare("INSERT INTO flags (k, v) VALUES ('rates:banxico', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1").bind(JSON.stringify(r)).run();
    return r;
  };
  if (cached && Date.now() - cached.fetched < 3 * 3600_000) return cached;
  if (cached) { ctx?.waitUntil(refresh().catch(() => null)); return cached; }
  return (await refresh().catch(() => null)) ?? FALLBACK;
}

const inflation = (env: Env) => ({ pct: num(env.INFLATION_PCT, 3.75), period: env.INFLATION_PERIOD ?? "octubre de 2026" });
const real = (nom: number, inf: number) => ((1 + nom / 100) / (1 + inf / 100) - 1) * 100;

function faqLd(faq: [string, string][]) {
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
}
const cta = `<div class="panel" style="margin:28px 0;padding:20px;border-radius:16px;background:#2B1A12;color:#F6EBDD">
  <b style="font-size:18px">¿Primera vez invirtiendo?</b>
  <p style="margin:6px 0 14px;opacity:.9">Lee gratis el capítulo 1 de la guía <i>Tu primera inversión en México</i> y únete al canal de Telegram con las noticias que mueven tu dinero.</p>
  <a class="btn" style="background:#E2B33C;color:#2B1A12;border-color:#E2B33C" href="/go/guia?s=web">Capítulo 1 gratis</a> &nbsp; <a class="btn ghost" style="color:#F6EBDD" href="/go/canal?s=web">Canal de Telegram</a></div>`;

// ---------- /cetes-hoy ----------
export async function cetesPage(env: Env, ctx: ExecutionContext): Promise<Response> {
  const r = await getRates(env, ctx), inf = inflation(env);
  const rows = ([[28, r.c28], [91, r.c91], [182, r.c182], [364, r.c364]] as [number, number][]);
  const ex = (days: number, rate: number, m = 10000) => ({ gross: (m * rate * days) / 36000, isr: (m * RET_ISR * days) / 365 });
  const e364 = ex(364, r.c364);
  const faq: [string, string][] = [
    ["¿Cuánto pagan los CETES hoy?", `En la subasta del ${r.date}, los CETES pagaron ${r.c28}% anual a 28 días, ${r.c91}% a 91 días, ${r.c182}% a 182 días y ${r.c364}% a 364 días (fuente: Banco de México). Las tasas cambian cada semana.`],
    ["¿Cuánto gano si invierto $10,000 en CETES?", `A 364 días con una tasa de ${r.c364}%, ganarías alrededor de $${mx(e364.gross)} antes de impuestos; la retención de ISR (0.90% anual sobre el capital en 2026) sería de unos $${mx(e364.isr)}, así que te quedarían cerca de $${mx(e364.gross - e364.isr)}. Es un cálculo aproximado.`],
    ["¿Los CETES le ganan a la inflación?", `Con una inflación anual de ${inf.pct}% (INEGI, ${inf.period}), los CETES a 28 días dan un rendimiento real aproximado de ${mx(real(r.c28, inf.pct))}% anual: sí le ganan, aunque por poco.`],
    ["¿Cuál es el mínimo para invertir en CETES?", "En Cetesdirecto, el programa oficial del gobierno, el mínimo es de $100 y no se cobran comisiones por abrir la cuenta, invertir o retirar."],
    ["¿Por qué cambian las tasas de los CETES?", `Siguen de cerca a la tasa objetivo del Banco de México (${isFinite(r.target) ? r.target + "%" : "consulta Banxico"}). Cuando Banxico baja su tasa, los CETES suelen pagar menos en las siguientes subastas.`],
  ];
  const body = `<main class="wrap" style="max-width:860px;padding:32px 16px 60px">
<p class="eyebrow">Herramienta · datos oficiales</p>
<h1 style="font-family:Fraunces,serif;font-size:clamp(30px,5.5vw,48px);line-height:1.05;margin:.2em 0">CETES hoy: tasas y calculadora</h1>
<p style="font-size:18px;opacity:.85">Tasas de la última subasta (<b>${h(r.date)}</b>), según el ${h(r.source)}. Calcula cuánto ganas con tu dinero, cuánto se retiene de ISR y si le ganas a la inflación.</p>
<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:17px">
<tr style="background:#2B1A12;color:#F6EBDD"><th style="text-align:left;padding:10px">Plazo</th><th style="text-align:right;padding:10px">Tasa anual</th><th style="text-align:right;padding:10px">Real (vs. inflación ${inf.pct}%)</th><th style="text-align:right;padding:10px">$10,000 → ganas aprox.*</th></tr>
${rows.map(([d, t]) => { const e = ex(d, t); return `<tr style="border-bottom:1px solid #e7dccd"><td style="padding:10px">${d} días</td><td style="text-align:right;padding:10px"><b>${mx(t)}%</b></td><td style="text-align:right;padding:10px">${mx(real(t, inf.pct))}%</td><td style="text-align:right;padding:10px">$${mx(e.gross - e.isr)}</td></tr>`; }).join("")}
</table>
<p style="font-size:13px;opacity:.7">* Después de la retención de ISR de 0.90% anual sobre el capital (2026), por un solo plazo. Inflación anual ${inf.pct}% (INEGI, ${h(inf.period)}). Tasa objetivo de Banxico: ${isFinite(r.target) ? r.target + "%" : "—"}.</p>

<h2 style="margin-top:32px">Calculadora de CETES</h2>
<div id="calc" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));background:#fbf6ef;border:1px solid #e7dccd;border-radius:16px;padding:18px">
  <label>¿Cuánto inviertes?<br><input id="m" type="number" min="100" step="100" value="10000" inputmode="numeric" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5"></label>
  <label>Plazo<br><select id="d" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5">${rows.map(([d, t]) => `<option value="${d}" data-r="${t}" ${d === 364 ? "selected" : ""}>${d} días (${mx(t)}%)</option>`).join("")}</select></label>
  <label>¿Reinviertes por cuántos años?<br><select id="y" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5">${[1, 2, 3, 5, 10].map((y) => `<option value="${y}">${y} año${y > 1 ? "s" : ""}</option>`).join("")}</select></label>
</div>
<div id="out" style="margin:16px 0;font-size:18px;line-height:1.7"></div>
<p style="font-size:13px;opacity:.7">Cálculo aproximado: interés = monto × tasa × días / 360; retención = monto × 0.90% × días / 365. Al reinvertir se supone la misma tasa todo el periodo, lo que en la realidad no pasa (cambia cada semana). El impuesto definitivo se calcula en la declaración anual sobre el interés real. No es asesoría financiera.</p>
${cta}
<h2>Cómo comprar CETES</h2>
<ol style="font-size:17px;line-height:1.6"><li>Entra a <b>cetesdirecto.com</b> (programa oficial del gobierno) o a su app.</li><li>Regístrate con INE, CURP y una cuenta bancaria a tu nombre con CLABE.</li><li>Deposita por SPEI desde tu banco; el mínimo es $100.</li><li>Elige el plazo y si quieres reinversión automática.</li></ol>
<h2>Preguntas frecuentes</h2>
${faq.map(([q, a]) => `<h3 style="margin-bottom:4px">${h(q)}</h3><p style="margin-top:0">${h(a)}</p>`).join("")}
<p style="font-size:13px;opacity:.7">Fuentes: Banco de México (resultados de la subasta de valores gubernamentales), INEGI (INPC), Ley de Ingresos de la Federación 2026 (retención de ISR), Cetesdirecto. Información, no asesoría financiera.</p>
</main>
<script>
(function(){var $=function(i){return document.getElementById(i)};var INF=${inf.pct};
var f=function(n){return n.toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})};
function calc(){var m=Math.max(0,+$("m").value||0),o=$("d").selectedOptions[0],d=+o.value,r=+o.dataset.r,y=+$("y").value;
var g=m*r*d/36000,isr=m*0.009*d/365,net=g-isr,n=Math.max(1,Math.floor(365*y/d)),cap=m;for(var i=0;i<n;i++){cap+=cap*r*d/36000-cap*0.009*d/365}
var infl=m*Math.pow(1+INF/100,y);
$("out").innerHTML="En <b>"+d+" días</b> ganas <b>$"+f(g)+"</b> antes de impuestos; se retienen <b>$"+f(isr)+"</b> de ISR y recibes <b>$"+f(m+net)+"</b>.<br>"+
"Reinvirtiendo "+n+(n>1?" veces (":" vez (")+y+" año"+(y>1?"s":"")+"), tus $"+f(m)+" llegarían a <b>$"+f(cap)+"</b>. Para no perder poder de compra con una inflación de "+INF+"% necesitarías $"+f(infl)+": "+(cap>=infl?"<b style=color:#2e7d4f>le ganas a la inflación por $"+f(cap-infl)+"</b>.":"<b style=color:#b3402f>te quedas $"+f(infl-cap)+" abajo de la inflación</b>.");}
["m","d","y"].forEach(function(i){$(i).addEventListener("input",calc)});calc();})();
</script>`;
  return new Response(layout(env, {
    title: `CETES hoy (${r.date}): tasas ${mx(r.c28)}% a 28 días y calculadora`,
    description: `Tasas de CETES de la subasta del ${r.date}: 28 días ${r.c28}%, 91 días ${r.c91}%, 182 días ${r.c182}%, 364 días ${r.c364}%. Calcula cuánto ganas, el ISR y si le ganas a la inflación.`,
    image: `${env.SITE_URL}/assets/og.jpg`, url: `${env.SITE_URL}/cetes-hoy`, body, extraHead: faqLd(faq),
  }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900" } });
}

// ---------- /calculadora-inflacion ----------
export async function inflationPage(env: Env, ctx: ExecutionContext): Promise<Response> {
  const r = await getRates(env, ctx), inf = inflation(env);
  const faq: [string, string][] = [
    ["¿Cuánto pierde mi dinero guardado por la inflación?", `Con una inflación anual de ${inf.pct}% (INEGI, ${inf.period}), $10,000 guardados sin rendimiento compran en un año lo que hoy cuestan unos $${mx(10000 / (1 + inf.pct / 100))}.`],
    ["¿Qué es el rendimiento real?", "Es lo que gana tu dinero después de descontar la inflación: (1 + rendimiento) ÷ (1 + inflación) − 1. Si es negativo, pierdes poder de compra aunque veas más pesos en tu cuenta."],
    ["¿Qué inversiones le ganan a la inflación?", `Hoy los CETES a 28 días pagan ${r.c28}% anual (subasta del ${r.date}), un rendimiento real aproximado de ${mx(real(r.c28, inf.pct))}%. Compara siempre la GAT real de cualquier cuenta o pagaré.`],
  ];
  const body = `<main class="wrap" style="max-width:860px;padding:32px 16px 60px">
<p class="eyebrow">Herramienta · datos oficiales</p>
<h1 style="font-family:Fraunces,serif;font-size:clamp(30px,5.5vw,48px);line-height:1.05;margin:.2em 0">Calculadora de inflación y rendimiento real</h1>
<p style="font-size:18px;opacity:.85">Inflación anual en México: <b>${inf.pct}%</b> (INEGI, ${h(inf.period)}). Descubre cuánto pierde tu dinero guardado y si tu inversión de verdad le gana a la inflación.</p>
<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));background:#fbf6ef;border:1px solid #e7dccd;border-radius:16px;padding:18px;margin-top:18px">
  <label>Tu dinero<br><input id="m" type="number" min="0" step="500" value="10000" inputmode="numeric" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5"></label>
  <label>Rendimiento anual de tu inversión (%)<br><input id="r" type="number" step="0.01" value="${r.c28}" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5"></label>
  <label>Inflación anual (%)<br><input id="i" type="number" step="0.01" value="${inf.pct}" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5"></label>
  <label>Años<br><input id="y" type="number" min="1" max="40" value="5" style="width:100%;padding:10px;font-size:18px;border-radius:10px;border:1px solid #d9c9b5"></label>
</div>
<div id="out" style="margin:16px 0;font-size:18px;line-height:1.7"></div>
<p style="font-size:13px;opacity:.7">Supone rendimiento e inflación constantes (en la realidad cambian) y no descuenta impuestos ni comisiones. El rendimiento inicial es el de los CETES a 28 días de la subasta del ${h(r.date)}; cámbialo por la GAT de tu cuenta. No es asesoría financiera.</p>
${cta}
<h2>Preguntas frecuentes</h2>
${faq.map(([q, a]) => `<h3 style="margin-bottom:4px">${h(q)}</h3><p style="margin-top:0">${h(a)}</p>`).join("")}
<p style="font-size:13px;opacity:.7">Fuentes: INEGI (INPC), Banco de México. Información, no asesoría financiera.</p>
</main>
<script>
(function(){var $=function(i){return document.getElementById(i)};var f=function(n){return n.toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})};
function calc(){var m=+$("m").value||0,r=(+$("r").value||0)/100,i=(+$("i").value||0)/100,y=Math.max(1,+$("y").value||1);
var keep=m/Math.pow(1+i,y),inv=m*Math.pow(1+r,y),realv=inv/Math.pow(1+i,y),rr=((1+r)/(1+i)-1)*100;
$("out").innerHTML="Guardados sin rendimiento, tus $"+f(m)+" en "+y+" año"+(y>1?"s":"")+" comprarían lo que hoy cuestan <b style=color:#b3402f>$"+f(keep)+"</b> (pierdes $"+f(m-keep)+" de poder de compra).<br>"+
"Invertidos al "+(r*100).toFixed(2)+"% anual llegarían a <b>$"+f(inv)+"</b>, que en pesos de hoy equivalen a <b>$"+f(realv)+"</b>.<br>Rendimiento real: <b style=color:"+(rr>=0?"#2e7d4f":"#b3402f")+">"+rr.toFixed(2)+"% anual</b> "+(rr>=0?"(le ganas a la inflación).":"(pierdes contra la inflación).");}
["m","r","i","y"].forEach(function(k){$(k).addEventListener("input",calc)});calc();})();
</script>`;
  return new Response(layout(env, {
    title: `Calculadora de inflación México ${inf.period.split(" ").pop()}: ¿cuánto pierde tu dinero?`,
    description: `Inflación anual ${inf.pct}% (INEGI, ${inf.period}). Calcula cuánto poder de compra pierde tu dinero y el rendimiento real de tus inversiones.`,
    image: `${env.SITE_URL}/assets/og.jpg`, url: `${env.SITE_URL}/calculadora-inflacion`, body, extraHead: faqLd(faq),
  }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=900" } });
}

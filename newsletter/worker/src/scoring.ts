// Puntuación heurística (0-100) de "capacidad de mover mercados".
// Es instantánea y gratis: decide qué noticias merecen pasar por la IA
// y cuáles pueden alertarse incluso si la IA no está configurada.

import type { Source } from "./sources";

const TIER_BASE: Record<Source["tier"], number> = { oficial: 35, agencia: 25, medio: 15, agregador: 10 };

// [patrón, puntos, categoría]
const RULES: [RegExp, number, string][] = [
  [/\b(breaking|urgente|última hora|ultima hora|flash|alerta)\b/i, 20, "urgente"],
  [/\b(rate decision|interest rates?|tasas? de inter[eé]s|tipos? de inter[eé]s|fomc|rate cut|rate hike|recorte de tasas|alza de tasas|pol[ií]tica monetaria)\b/i, 30, "bancos centrales"],
  [/\b(cpi|inflation|inflaci[oó]n|ipc|pce|ppi)\b/i, 25, "inflación"],
  [/\b(nonfarm|payrolls|unemployment|desempleo|n[oó]minas|empleo)\b/i, 20, "empleo"],
  [/\b(gdp|pib|recession|recesi[oó]n)\b/i, 20, "crecimiento"],
  [/\b(tariffs?|aranceles?|sanctions?|sanciones|trade war|guerra comercial|embargo)\b/i, 25, "comercio/geopolítica"],
  [/\b(war|guerra|missile|misil|invasion|invasi[oó]n|attack|ataque|ceasefire|alto el fuego|coup|golpe de estado)\b/i, 20, "geopolítica"],
  [/\b(opec|opep|crude|brent|wti|petr[oó]leo|oil)\b/i, 15, "energía"],
  [/\b(default|impago|bankruptcy|quiebra|bailout|rescate|downgrade|rebaja de calificaci[oó]n|moody'?s|fitch|s&p global)\b/i, 25, "crédito"],
  [/\b(earnings|resultados|guidance|profit warning|beneficios|ganancias trimestrales)\b/i, 12, "empresas"],
  [/\b(merger|acquisition|fusi[oó]n|adquisici[oó]n|takeover|opa)\b/i, 12, "empresas"],
  [/\b(sec charges|fraud|fraude|investigation|investigaci[oó]n|antitrust|multa)\b/i, 10, "regulación"],
  [/\b(bitcoin|crypto|cripto|etf)\b/i, 8, "cripto"],
  [/\b(peso|d[oó]lar|dollar|yen|euro|yuan|devaluaci[oó]n|tipo de cambio)\b/i, 10, "divisas"],
  [/\b(stocks?|acciones|bolsa|wall street|s&p 500|nasdaq|dow|ibex|bmv|merval|ipsa)\b/i, 8, "bolsas"],
  [/\b(treasury|bonos?|yields?|rendimientos?|deuda soberana)\b/i, 10, "renta fija"],
];

// Ruido que casi nunca mueve precios
const PENALTIES: RegExp[] = [
  /\b(podcast|opinion|opini[oó]n|video|watch:|live:|en vivo|horoscop|recipe|receta|f[uú]tbol|celebrity)\b/i,
];

export interface Score {
  score: number;
  category: string;
  impact: number; // 1-5 heurístico; la IA puede reemplazarlo
}

export function scoreItem(title: string, summary: string, source: Source): Score {
  const text = `${title} ${summary}`;
  let score = TIER_BASE[source.tier];
  let best = { pts: 0, cat: "general" };
  for (const [re, pts, cat] of RULES) {
    if (re.test(text)) {
      score += pts;
      if (pts > best.pts) best = { pts, cat };
    }
  }
  for (const re of PENALTIES) if (re.test(text)) score -= 30;
  score = Math.max(0, Math.min(100, score));
  const impact = score >= 80 ? 5 : score >= 65 ? 4 : score >= 50 ? 3 : score >= 35 ? 2 : 1;
  return { score, category: best.cat, impact };
}

// Huella del titular para detectar la misma noticia en distintas fuentes.
const STOP = new Set("the a an of to in on for and or is are as at by with from de la el los las y o en un una que por con para del al se su sus es".split(" "));
export function fingerprint(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 8)
    .sort()
    .join("-");
}

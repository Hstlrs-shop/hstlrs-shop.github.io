// Capa de IA (Claude): clasifica impacto, reescribe titulares en español con
// resumen propio (nunca copiamos el artículo) y redacta la edición diaria.

import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "./env";

export interface Candidate {
  id: string;
  title: string;
  summary: string;
  source: string;
  scope: string;
}

export interface Analysis {
  id: string;
  impact: number;
  category: string;
  assets: string[];
  bias: "alcista" | "bajista" | "mixto" | "neutral";
  headline_es: string;
  brief_es: string;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "impact", "category", "assets", "bias", "headline_es", "brief_es"],
        properties: {
          id: { type: "string" },
          impact: { type: "integer", description: "1 = irrelevante para mercados, 5 = mueve mercados de inmediato" },
          category: { type: "string" },
          assets: { type: "array", items: { type: "string" } },
          bias: { type: "string", enum: ["alcista", "bajista", "mixto", "neutral"] },
          headline_es: { type: "string" },
          brief_es: { type: "string" },
        },
      },
    },
  },
} as const;

const SYSTEM_CLASSIFY = `Eres el editor de mesa de un servicio de noticias financieras en español.
Para cada titular recibido devuelve:
- impact (1-5): cuánto puede mover precios de activos en las próximas horas. 5 = decisión de tasas sorpresa, dato macro clave fuera de consenso, guerra/sanciones nuevas, quiebra sistémica. 1 = sin efecto en mercados.
- category: una de bancos centrales, inflación, empleo, crecimiento, comercio/geopolítica, energía, crédito, empresas, regulación, divisas, bolsas, renta fija, cripto, política, general.
- assets: activos o índices más expuestos (ej. "S&P 500", "USD/MXN", "Brent", "Bono 10A EE.UU."). Máximo 4. Vacío si impact <= 2.
- bias: efecto probable sobre esos activos. Usa "neutral" o "mixto" si no está claro.
- headline_es: titular propio en español, máximo 110 caracteres, factual, sin clickbait.
- brief_es: una o dos frases propias en español explicando por qué importa al inversor. No copies texto de la fuente.
Es información, no asesoría: nunca digas "compra" o "vende".`;

function client(env: Env): Anthropic {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/** Analiza un lote de titulares en una sola llamada (más barato y rápido). */
export async function analyze(env: Env, batch: Candidate[]): Promise<Analysis[]> {
  if (!env.ANTHROPIC_API_KEY || batch.length === 0) return [];
  const response = await client(env).beta.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system: SYSTEM_CLASSIFY,
    messages: [{ role: "user", content: JSON.stringify(batch) }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return [];
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];
  const parsed = JSON.parse(text.text) as { items: Analysis[] };
  const ids = new Set(batch.map((c) => c.id));
  return parsed.items
    .filter((a) => ids.has(a.id))
    .map((a) => ({ ...a, impact: Math.max(1, Math.min(5, Math.round(a.impact))) }));
}

const SYSTEM_DIGEST = `Eres el editor jefe de un newsletter financiero en español para inversores minoristas de Latinoamérica y España.
Escribe la edición del día en Markdown con esta estructura:
# (asunto atractivo y factual, máx. 70 caracteres)
Un párrafo "En 30 segundos" con lo esencial.
## Lo que mueve el mercado hoy (3-5 noticias globales, cada una: titular en negrita, 2-3 frases de contexto e impacto, enlace a la fuente)
## En casa (noticias nacionales, mismo formato)
## Qué vigilar (agenda/eventos próximos que se deduzcan de las noticias)
Termina con: "_Esto es información, no asesoría de inversión._"
Tono claro, directo, sin jerga innecesaria. Redacción 100 % propia: no copies frases de las fuentes. Usa solo los hechos que te paso; no inventes cifras.`;

export async function writeDigest(env: Env, items: unknown[]): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY || items.length === 0) return null;
  const response = await client(env).beta.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: SYSTEM_DIGEST,
    messages: [{ role: "user", content: `Noticias de las últimas 24 h (JSON):\n${JSON.stringify(items)}` }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || null;
}

const SYSTEM_ASK = `Eres "Lana", la analista de Lana con Café: explicas en español de México, claro y cercano, qué está pasando en los mercados y cómo puede afectar al bolsillo.
Reglas:
- Responde en máximo 900 caracteres, texto plano (sin Markdown ni HTML). Puedes usar 1-2 emojis.
- Apóyate en las noticias numeradas que te paso y cítalas así: [3]. Si no hay noticias sobre lo que preguntan, dilo y da contexto general educativo.
- No inventes cifras ni hechos que no estén en las noticias.
- Nunca digas "compra" o "vende" ni des recomendaciones personalizadas. Explica escenarios e impactos posibles.
- Si preguntan algo que no es de economía, finanzas o mercados, redirige amablemente.`;

/** Respuesta de la IA a una pregunta libre, usando las noticias recientes como contexto. */
export async function answerQuestion(env: Env, question: string, news: { title: string; brief: string | null; source: string }[]): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  const context = news.map((n, i) => `[${i + 1}] ${n.title}${n.brief ? ` — ${n.brief}` : ""} (${n.source})`).join("\n");
  const response = await client(env).beta.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SYSTEM_ASK,
    messages: [{ role: "user", content: `Noticias recientes:\n${context}\n\nPregunta del usuario: ${question}` }],
  });
  if (response.stop_reason === "refusal") return "Esa no la puedo responder. Pregúntame sobre mercados, economía o tu dinero ☕";
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || null;
}

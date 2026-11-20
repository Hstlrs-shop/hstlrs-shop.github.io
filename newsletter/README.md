# Pulso Mercados

Newsletter + alertas de Telegram con las noticias que mueven los mercados (globales y nacionales), en español, con modelo de monetización freemium.

```
 Fuentes oficiales y medios (RSS, cada minuto)
   Fed · BCE · BoE · SEC · Casa Blanca · MarketWatch · BBC · Al Jazeera · Investing · Google News (país)
                │
                ▼
 ┌──────────────────────── Cloudflare Worker ────────────────────────┐
 │ ingest: ETag/304 → dedup (enlace + huella titular) → puntuación     │
 │         → Claude: impacto 1-5, activos, sesgo, titular y resumen ES  │
 │ D1 (noticias, ediciones, leads, miembros) · KV (estado de feeds)    │
 └───────┬──────────────────┬───────────────────┬──────────────────────┘
         │ al instante      │ +15 min           │ lun–vie 11:17 UTC
         ▼                  ▼                   ▼
  Telegram PRO (pago)  Telegram público   Edición diaria → web + Telegram + email
         ▲              + web + RSS
         │
  Stripe → webhook → enlace de invitación único + API key
```

## Estructura

| Ruta | Qué es |
|------|--------|
| `worker/` | Cloudflare Worker (TypeScript): ingesta, IA, alertas, API, pagos |
| `worker/src/sources.ts` | Fuentes y presets por país (`COUNTRY`: MX, ES, CO, AR, VE, CL, PE) |
| `worker/src/scoring.ts` | Puntuación heurística de impacto (instantánea, sin coste) |
| `worker/src/ai.ts` | Claude: clasificación en lote y redacción de la edición |
| `worker/src/stripe.ts` | Webhook de pagos → acceso al canal Pro |
| `site/` | Web estática (portada con feed, precios, ediciones, gracias) |
| `docs/MODELO-NEGOCIO.md` | Monetización, precios, embudo, métricas, legal, hoja de ruta |
| `docs/DESPLIEGUE.md` | Puesta en marcha paso a paso |
| `docs/OPERACION.md` | Rutina diaria y ajustes |

## API del Worker

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/news?limit=&scope=global\|nacional&min_impact=` | Noticias. Sin key: con retraso. Con `Authorization: Bearer pk_…`: tiempo real |
| GET | `/rss.xml` | RSS público (con retraso) |
| GET | `/api/digests` · `/api/digest/:fecha\|latest` | Ediciones del newsletter |
| POST | `/api/subscribe` | `{ email }` → tabla `leads` |
| GET | `/api/acceso?session_id=cs_…` | Enlace al canal Pro tras pagar |
| POST | `/stripe/webhook` | Webhook de Stripe (firma verificada) |
| POST | `/telegram/chat-member` | Updates reenviados por tu bot (para expulsar al cancelar) |
| POST | `/admin/run?task=ingest\|free\|digest\|stats` | Tareas manuales (`ADMIN_TOKEN`) |

## Desarrollo

```bash
cd worker
npm install
npm run typecheck && npm test
npx wrangler d1 execute pulso-db --local --file=schema.sql
npm run dev
```

Empieza por **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

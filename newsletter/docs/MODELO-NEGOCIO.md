# Modelo de negocio · Lana con Café

> Las cifras son estimaciones para planificar, no promesas. Revísalas cada mes con los datos reales de `/admin/run?task=stats`.

## 1. Propuesta de valor

**"Entérate primero de lo que mueve tu dinero, en español y en 5 minutos al día."**

- **Velocidad**: leemos cada minuto las fuentes que *originan* las noticias (Fed, BCE, BoE, SEC, Casa Blanca, bancos centrales nacionales) y no solo los medios que las repiten.
- **Filtro**: de ~200 titulares por hora, solo alertamos lo que puede mover precios (impacto 4–5).
- **Contexto**: cada alerta dice qué activos se ven afectados y en qué dirección probable.
- **Doble foco**: global + tu país en el mismo lugar.

### Expectativa realista sobre "primero que nadie"

No vamos a ganarle a un terminal Bloomberg ni a las agencias con línea directa. Sí podemos ganarle **a los medios en español, a X/Twitter y a los grupos de Telegram** en datos oficiales y noticias globales, que es lo que importa a nuestro público. Ese es el mensaje de venta, y es verdadero.

## 2. Embudo

```
Contenido gratis (X, TikTok/Reels, Telegram público, SEO del archivo)
        │
        ▼
Newsletter gratis (email)  ← activo principal: la lista es tuya
        │  CTA en cada edición y en cada alerta con retraso
        ▼
Pro ($99 MXN/mes fundadores, luego $149) — alertas instantáneas en Telegram privado
        │
        ▼
API / Equipos ($1,490 MXN/mes) — traders, mesas, medios, bots
```

Cada alerta del canal gratuito termina con: *"⚡ Los miembros Pro recibieron esto al instante"*. Ese retraso de 15 min es el producto: el usuario gratuito *siente* lo que se pierde.

## 3. Fuentes de ingreso

| # | Ingreso | Precio orientativo | Cuándo activarlo |
|---|---------|--------------------|------------------|
| 1 | **Suscripción Pro** (Telegram privado instantáneo + resumen semanal ampliado) | $99 MXN/mes de por vida para los primeros 100 (250 ⭐), luego $149 MXN/mes (~400 ⭐); anual $1,190 MXN con Mercado Pago | Desde el día 1 (aunque tengas pocos usuarios: valida la disposición a pagar) |
| 2 | **API / Equipos** | $1,490 MXN/mes · plan a medida para medios | Desde ~1.000 suscriptores o cuando alguien lo pida |
| 3 | **Patrocinio del newsletter** (1 bloque por edición) | CPM $25–60 en nicho finanzas | Desde ~2.000–3.000 suscriptores activos (apertura > 40 %) |
| 4 | **Afiliados** (brokers, apps de inversión, cursos) | CPA $50–200 por cuenta fondeada | Con cuidado legal (ver §7). Mejor en el newsletter que en las alertas |
| 5 | **Informes premium puntuales** (ej. "Guía Banxico 2027", "Calendario de resultados") | $9–29 c/u | Cuando tengas lista; buen producto para quien no quiere suscripción |
| 6 | **Licencia de contenido** a medios/radios locales | $200–1.000/mes | Fase 3 |

### Proyección orientativa (12 meses)

| Mes | Suscriptores email | Pro (conv. 2–4 %) | API | Patrocinio/mes | Ingreso mensual aprox. (MXN) |
|-----|--------------------|--------------------|-----|----------------|------------|
| 3 | 1.000 | 20 | 0 | – | $3,980 |
| 6 | 4.000 | 100 | 3 | $10,000 | $34,370 |
| 12 | 12.000 | 360 | 10 | $45,000 | $131,540 |

### Costes mensuales estimados

| Concepto | Coste |
|----------|-------|
| Cloudflare Workers Paid (cron/minuto, D1, KV) | ~$5 |
| Claude API (≈20 análisis/min en horas de mercado en lotes de 10 + 1 edición diaria) | $30–150 según volumen y modelo (ajusta `AI_MIN_SCORE` para controlarlo) |
| Plataforma de email (Beehiiv/Buttondown/Kit) | $0–50 al inicio |
| Mercado Pago | comisión por cobro (≈ 3–4 % + IVA según plazo de liberación; revisa tu tarifa en el panel) |
| Dominio | ~$1 |

Margen bruto > 85 % desde ~100 miembros Pro.

## 4. Planes y qué incluye cada uno

> Costo aprox. de IA: pregunta rápida ~$0.001 USD, análisis profundo ~$0.05 USD. Implementado en el bot v11 (`bot/worker.js`) + `worker/src/pro.ts`. Límites en `LIMITS` de `pro.ts`.

| Función del bot | Gratis | Prueba (3 días) | Pro | API |
|---|---|---|---|---|
| 🤖 Pregúntale a Lana (Haiku 5.5, rápida; usa tu radar y recuerda 3 intercambios) | 5/día | 30/día | 100/día | 200/día |
| 🔬 `/analiza` (Opus 5.5, análisis profundo) | – | 2/día | 5/día | 10/día |
| 💬 Botón "¿Qué significa para mí?" en alertas, radar y web | ✅ | ✅ | ✅ | ✅ |
| 🎯 Radar personal (aviso por DM) | 1 tema, +15 min | 10 temas, al instante | 10, al instante | 25 |
| ☀️ Briefing personal 7:00 | – | ✅ | ✅ | ✅ |
| ⏰ Recordatorio 15 min antes de cada evento (`/evento` del admin) | – | ✅ | ✅ | ✅ |
| 🌡️ Termómetro, 💵 dólar, noticias, agenda | ✅ | ✅ | ✅ | ✅ |
| 🎁 Referidos: 3 amigos con `/invita` = 7 días Pro | ✅ | ✅ | – | – |


| | Gratis | Pro | API |
|---|---|---|---|
| Newsletter diario | ✅ | ✅ | ✅ |
| Telegram público (retraso 15 min, solo impacto ≥4) | ✅ | ✅ | ✅ |
| **Telegram privado instantáneo** | – | ✅ | ✅ |
| Activos afectados + sesgo en cada alerta | – | ✅ | ✅ |
| Web/RSS en tiempo real | – | ✅ (con su key) | ✅ |
| API JSON | – | – | ✅ |

Todo esto ya está implementado en el Worker: los parámetros `FREE_DELAY_MIN`, `FREE_MIN_IMPACT` y `PRO_MIN_IMPACT` controlan la diferencia entre planes.

## 5. Crecimiento (qué hacer cada semana)

1. **X/Twitter + Threads**: publica 3–5 alertas al día *con retraso* + enlace al newsletter. Usa Typefully para programar.
2. **Vídeo corto diario** (TikTok/Reels/Shorts, 45 s): "3 noticias que mueven tu dinero hoy". Se guioniza solo a partir de la edición.
3. **SEO**: cada edición queda archivada en `edicion.html?id=…` (fase 2: páginas estáticas por edición para que Google las indexe).
4. **Referidos**: "invita a 3 amigos y gana 1 mes de Pro" (Beehiiv lo trae nativo).
5. **Intercambio de menciones** con otros newsletters en español (finanzas personales, cripto, tecnología).
6. **Momentos pico**: día de decisión de la Fed/Banxico, dato de inflación, elecciones. Prepara un post antes ("hoy te avisamos al segundo") y vende Pro ese día.

## 6. Métricas que importan

| Métrica | Objetivo |
|---------|----------|
| Tasa de apertura del newsletter | > 45 % |
| Conversión gratis → Pro | 2–4 % |
| Churn mensual Pro | < 6 % |
| Latencia fuente oficial → alerta Pro | < 90 s |
| Alertas Pro por día | 5–15 (más = ruido, la gente silencia el canal) |
| Precisión del impacto (revisión semanal manual de 20 alertas) | > 80 % "bien clasificada" |

## 7. Legal y confianza (no te lo saltes)

- **Descargo en todo**: "Información, no asesoría de inversión". Ya va en el newsletter, la web y las alertas Pro no dan órdenes de compra/venta.
- **Recomendaciones**: dar señales de compra/venta personalizadas puede requerir registro como asesor (CNBV en México, CNMV en España, SFC en Colombia, CNV en Argentina, SEC/FINRA en EE.UU.). Por eso el sistema habla de *impacto y sesgo probable*, no de "compra X".
- **Derechos de autor**: solo titular + resumen propio + enlace a la fuente. Nunca copiamos el artículo (la IA está instruida para redactar con palabras propias).
- **Afiliados de brokers**: decláralos como publicidad y elige brokers regulados en el país del lector.
- **Datos personales**: política de privacidad y baja en un clic en el email (lo da la plataforma de email).
- **Pagos**: Mercado Pago Suscripciones (México). Emite tus comprobantes/facturas según tu régimen fiscal ante el SAT; Mercado Pago no factura por ti.

## 8. Hoja de ruta

**Fase 1 — Lanzamiento (semanas 1–2)**
- Desplegar Worker + web (ver `DESPLIEGUE.md`). Elegir país en `COUNTRY`.
- Crear canal público y canal Pro privado en Telegram; añadir el bot como admin en ambos.
- Conectar la plataforma de email al `DIGEST_WEBHOOK_URL`.
- Crear los planes de Mercado Pago Suscripciones (Pro y API).
- 30 primeros suscriptores a mano (amigos, grupos, X).

**Fase 2 — Ventaja de velocidad (semanas 3–8)**
- Añadir feeds oficiales nacionales (banco central, bolsa local, ministerio de hacienda).
- Calendario económico: programar sondeo cada 10 s en las horas exactas de publicación de datos (IPC, empleo, decisiones de tasas) con Durable Objects (los cron de Cloudflare van al minuto).
- Panel de métricas y revisión semanal de calidad.

**Fase 3 — Escala (mes 3+)**
- Páginas estáticas por edición (SEO), referidos, primer patrocinador.
- Plan API comercial y licencias a medios.
- Segundo país (otro `COUNTRY` = otro Worker y otro canal, mismo código).

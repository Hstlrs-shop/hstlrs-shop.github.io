# Lana con Café: guía para Claude

## Reglas de trabajo (léelas primero)

1. **El dueño no sabe programar.** Explica todo en español sencillo, sin tecnicismos. Si usas un término técnico, dilo en una frase simple la primera vez.
2. **Pasos pequeños.** Un cambio a la vez. Después de cada uno: qué cambió, cómo se probó y qué sigue.
3. **Pide permiso antes de:**
   - instalar cualquier cosa (paquetes, programas, conectores);
   - borrar archivos, datos o tablas;
   - gastar dinero o créditos: planes de pago, la API de Claude en pruebas, créditos de vidIQ o de voz (Speko), anuncios.
4. **Nunca pongas claves, tokens o contraseñas en el código** ni en este repositorio, que es **público**. Van como secretos de Cloudflare (`npx wrangler secret put NOMBRE`) o en el prompt privado de la tarea programada.
5. **Todo el contenido es información, no asesoría de inversión.**
   - Nunca digas "compra" o "vende".
   - Cada cifra sale de una fuente oficial o citada; nunca inventes datos.
   - Cada pieza publicada lleva "Información, no asesoría financiera".
6. **Nada se publica en redes sin el ✅ del dueño en Telegram.**
7. **Datos privados fuera del repositorio:** IDs de cuentas de redes, la carpeta de Drive, la llave de la cola de aprobaciones, el texto de la guía de pago y el conflicto de interés del dueño.
8. **Las señales de Bitcoin (`scalp*.ts`) no se publican ni se venden sin aprobación explícita del dueño.** Hoy son solo para el dueño. Cualquier cambio que las muestre a otras personas (canal, bot, sitio, plan de pago) necesita su permiso por escrito en el chat.

## Qué es Lana con Café

Noticias de economía y mercados explicadas en 1 minuto, para ahorradores e inversionistas comunes en México. El tono es cercano y claro, "con el primer café". Nunca es alarmista ni de "hazte rico".

## Canales

| Canal | Qué recibe la gente | Estado |
|---|---|---|
| **Sitio web** [lanaconcafe.com](https://lanaconcafe.com) | Noticias con resumen propio, "Dólar hoy", "Bitcoin hoy", "CETES hoy", calculadora de inflación, guía gratis | En vivo |
| **Newsletter diario matutino** | La edición del día, lunes a viernes a las 5:17 a.m. (hora de México), en el sitio (`/edicion.html`) y en Telegram | En vivo; **sin envío por correo todavía** |
| **Alertas en Telegram** | Canal gratis `@LanaconCafe` (noticias fuertes con 15 min de retraso, máx. 8 al día) y bot `@LanaconcafeBot` (guías, preguntas a la IA, cobros) | En vivo |
| **YouTube, Instagram y TikTok** | 3 videos diarios (Reels y Shorts), con aprobación del dueño | En vivo |
| **Plan Pro** | Alertas al instante, radar personal, IA que responde dudas y briefing a las 7:00 | Precio $99 MXN/mes (fundadores, los primeros 100), luego $149. **El cobro con Mercado Pago aún no está configurado** |

Productos digitales en el bot, cobrados con Telegram Stars:
- Guía gratis "Tu primera inversión en México", para quien se une al canal.
- "Plan de inversión en 30 días", 875 Stars (≈ $349 MXN), con reembolso en 7 días.

## Stack técnico (con qué está hecho)

- **Lenguajes:**
  - TypeScript: el servidor.
  - JavaScript: el bot y la web.
  - Python: los videos y las guías.
- **Hosting:** Cloudflare Workers, código que corre en los servidores de Cloudflare sin un servidor propio. Son dos:
  - `lanaconcafe-news`: sitio, noticias, alertas, IA, pagos y cola de videos.
  - `lanaconcafe`: el bot de Telegram.
- **Base de datos:**
  - Cloudflare **D1** (SQL): noticias, ediciones, miembros, compras, aprobaciones y consumo de IA (`ai_usage`).
  - **KV** (almacén rápido): archivos de las guías, videos de vista previa y estado del bot.
- **IA:** API de Claude.
  - **Haiku 5.5:** clasifica cada noticia (impacto 1–5, activos, titular y resumen en español) y responde rápido en el bot.
  - **Opus 5.5:** redacta la edición diaria y los análisis profundos.
- **Producción de video:** una tarea programada de Claude Code (modelo Sonnet 5.5) corre 6 veces al día. Usa:
  - Speko: voz es-MX "Valeria".
  - Mixkit: video y música con licencia libre.
  - Python con ffmpeg y OpenCV: edición.
  - Playwright: render de escenas.
  - vidIQ: programación en Instagram, TikTok y YouTube.
  - Google Drive: archivos de video.
- **Servicios externos:** Telegram Bot API (mensajes y cobros con Stars), Mercado Pago (suscripción Pro, pendiente), ManyChat ("Comenta GUÍA" en Instagram), Google Search Console.
- **De dónde salen los datos de mercado:**
  - **Noticias** (RSS, revisadas cada minuto):
    - Fed, BCE, Banco de Inglaterra, SEC y Casa Blanca.
    - MarketWatch, BBC, Al Jazeera, Investing.com, El Financiero, Expansión, El Universal y Google News.
  - **CETES y UDI:** Banxico (página pública de subastas, guardada 3 horas).
  - **Inflación:** INEGI. Se actualiza **a mano** cada mes en `INFLATION_PCT` e `INFLATION_PERIOD` (worker/wrangler.toml).
  - **Bitcoin:** Coinbase y Bitstamp.
  - **Gráficas en el sitio** (dólar, bolsas): widgets de TradingView.

## Cómo está organizado el código

| Carpeta | Para qué sirve |
|---|---|
| `newsletter/worker/` | **El cerebro.** Worker principal en TypeScript |
| `newsletter/worker/src/` | Código: `ingest.ts` (lee y clasifica noticias, alertas), `digest.ts` (edición diaria), `ai.ts` (llamadas a Claude y su registro de consumo), `pro.ts` (plan Pro, radar, briefing), `studio.ts` (cola de aprobación de videos, guías, enlaces), `payments.ts` (Mercado Pago), `tools.ts` (CETES e inflación), `seo.ts` (páginas Dólar/Bitcoin hoy), `scalp*.ts` (señales de Bitcoin), `youtube*.ts` (ciclo YouTube → Telegram), `index.ts` (rutas y horarios) |
| `newsletter/worker/migrations/` | Cambios a la base de datos, numerados (001 a 009) |
| `newsletter/worker/schema.sql` | Esquema base de la base de datos |
| `newsletter/worker/test/` | Pruebas automáticas |
| `newsletter/worker/scripts/` | Empaquetado del sitio y laboratorios de backtest de Bitcoin |
| `newsletter/site/` | La web estática (portada, precios, ediciones, mercados). Se empaqueta dentro del Worker al desplegar |
| `newsletter/bot/` | Bot de Telegram (`worker.js`). Los `*.original.js`, `*.v8.js` y el `.diff` son copias viejas |
| `newsletter/estudio/` | Producción de videos: `MANUAL.md` (las reglas que sigue la tarea programada), `lecciones.md`, `aprobaciones.py` (cola de ✅/❌) y `scripts/` (motor de video, clips de Mixkit, QR, voz) |
| `newsletter/guia/` | Generador de las guías en PDF y de la hoja de cálculo (el texto de la guía de pago no se sube) |
| `newsletter/docs/` | Documentos: modelo de negocio, despliegue, operación diaria y señales |
| `newsletter/media/` | Render de imágenes para redes |

## Cómo se publica cada cosa

| Qué | Cuándo | Automático o manual |
|---|---|---|
| **Leer y clasificar noticias** | Cada minuto | Automático (Worker + Claude Haiku) |
| **Alertas Pro** | Al instante (impacto 3+) | Automático, pero **el canal Pro todavía no existe** (`TELEGRAM_PRO_CHAT` pendiente) |
| **Alertas del canal gratis** | 15 min después, máx. 8 al día, una cada 40 min | Automático |
| **Newsletter (edición diaria)** | Lunes a viernes 5:17 a.m. | Automático: Claude Opus la redacta, se guarda en el sitio y se avisa en Telegram. **Por correo no sale** hasta configurar `DIGEST_WEBHOOK_URL` (Beehiiv, Buttondown o Make) |
| **Kit de contenido** (guion y captions) | 6:30 a.m., solo al dueño | Automático |
| **Videos en redes** | Producción a las 6:40, 11:40 y viernes 16:40; revisión a las 7:40, 12:40 y 19:40 | Semiautomático: la tarea produce el video y lo manda a Telegram; **el dueño aprueba con ✅** y solo entonces se publica |
| **YouTube → Telegram** | Cada 15 min | Automático: anuncia los videos nuevos del canal |
| **Inflación** | Cada mes (~día 9) | **Manual**: cambiar `INFLATION_PCT` y `INFLATION_PERIOD` y desplegar |
| **Comercial y piezas especiales** | Cuando se piden | Manual, con Claude |

## Comandos

Todo se corre desde `newsletter/worker/`. En las sesiones en la nube de Claude, Cloudflare se autentica solo con `CLOUDFLARE_API_TOKEN=proxy-injected` antes del comando.

```bash
cd newsletter/worker
npm install                 # instalar dependencias (pide permiso antes)
npm test                    # pruebas automáticas (19 pruebas, deben pasar todas)
npm run typecheck           # revisa que el código no tenga errores de tipos
npm run dev                 # correr el Worker en local (simula los horarios con --test-scheduled)
npm run deploy              # publicar el Worker y el sitio en Cloudflare (pide permiso antes)

# Bot de Telegram (usa el wrangler de la carpeta worker)
npx wrangler deploy --config ../bot/wrangler.toml

# Base de datos (D1): aplicar un cambio nuevo
npx wrangler d1 execute lanaconcafe-news-db --remote --file migrations/NNN_nombre.sql
# Ojo: `wrangler d1 migrations apply` falla porque las migraciones viejas se aplicaron a mano.

# Consultar la base (gasta lecturas del límite diario gratis)
npx wrangler d1 execute lanaconcafe-news-db --remote --command "SELECT ..."

# Cola de videos (necesita la variable STUDIO_TOKEN, que NO está en el repo)
python3 ../estudio/aprobaciones.py today
```

Antes de desplegar, siempre: `npm test` y `npm run typecheck`. Después, revisa que estas páginas respondan: `/`, `/dolar-hoy`, `/cetes-hoy`, `/api/kit`.

## Números clave (medir cada lunes)

Córrelos **una vez por semana**. Antes de correrlos, avisa al dueño cuántas lecturas de D1 gasta; la última vez, las consultas de la base gastaron **4,820 lecturas**, menos del 0.1 % del límite diario.

| Número | Dónde se mide | Cómo |
|---|---|---|
| Miembros del canal `@LanaconCafe` | Telegram | El dueño manda `/stats` al bot. No se puede leer desde la sesión de Claude porque requiere la llave del bot |
| Usuarios del bot | KV del bot (no gasta lecturas de D1) | `npx wrangler kv key list --namespace-id 8b002a988c5d49db8dc3ab2820239ed5 --remote --prefix "u:"` y contar. También sale en `/stats` |
| Compras con Stars, suscriptores Pro, clics y gasto de IA | D1 | Consultas de abajo |
| Visitas del sitio | Analítica de Cloudflare (no gasta D1) | Consulta GraphQL de abajo. **Ojo:** incluye robots y buscadores, así que es un techo, no visitas reales |

Consultas de D1 (desde `newsletter/worker/`, con `--json --command "..."`; con `--file` no devuelven resultados):

```sql
-- Compras con Stars (sin reembolsos), en total y de los últimos 7 días
SELECT product, COUNT(*) AS compras, COALESCE(SUM(stars),0) AS stars,
       SUM(created_at > (strftime('%s','now') - 7*86400) * 1000) AS compras_7d
FROM purchases WHERE refunded = 0 GROUP BY product;
SELECT COUNT(*) AS reembolsos FROM purchases WHERE refunded = 1;

-- Suscriptores Pro (pagos) y pruebas activas
SELECT plan, status, COUNT(*) AS n FROM members GROUP BY plan, status;
SELECT COUNT(*) AS pruebas_activas FROM trials WHERE until > strftime('%s','now') * 1000;

-- Clics de los enlaces por red (/ig, /tt, /yt, /x…), últimos 7 días
SELECT src, dest, SUM(n) AS clics FROM clicks
WHERE day >= date('now','-7 days') GROUP BY src, dest ORDER BY clics DESC;

-- Vistas de páginas de noticias publicadas en los últimos 7 días
SELECT COALESCE(SUM(views),0) AS vistas, COUNT(*) AS noticias FROM news
WHERE detected_at > (strftime('%s','now') - 7*86400) * 1000;

-- Gasto de IA de la semana (USD, con precios de lista de Anthropic)
SELECT task, model, COUNT(*) AS llamadas, SUM(input_tokens) AS entrada, SUM(output_tokens) AS salida,
  ROUND(SUM(
    (CASE WHEN model LIKE 'claude-haiku%' THEN 0.10 WHEN model LIKE 'claude-sonnet%' THEN 2.0 ELSE 4.0 END)
      * (input_tokens + cache_write * 1.25 + cache_read * 0.1)
  + (CASE WHEN model LIKE 'claude-haiku%' THEN 0.50 WHEN model LIKE 'claude-sonnet%' THEN 10.0 ELSE 20.0 END)
      * output_tokens) / 1000000.0, 4) AS usd
FROM ai_usage WHERE ts > (strftime('%s','now') - 7*86400) * 1000
GROUP BY task, model ORDER BY usd DESC;
```

Visitas (analítica de Cloudflare, por día; `ZONA` es el id de la zona `lanaconcafe.com`, que sale de `GET /client/v4/zones?name=lanaconcafe.com`):

```graphql
{ viewer { zones(filter: {zoneTag: "ZONA"}) {
  httpRequests1dGroups(limit: 10, filter: {date_geq: "AAAA-MM-DD", date_leq: "AAAA-MM-DD"}) {
    dimensions { date } sum { pageViews } uniq { uniques } } } } }
```

## Costos mensuales

Lo que se sabe al 26/11/2026. Donde dice "no registrado", el dueño debe anotar el monto.

| Servicio | Para qué | Costo | Notas |
|---|---|---|---|
| Cloudflare Workers, D1 y KV | Sitio, bot, base de datos | **$0** (plan gratis) | Límite de D1: 5 millones de lecturas al día. El plan de pago cuesta 5 USD al mes y da mucho más margen |
| Dominio `lanaconcafe.com` | Dirección del sitio | No registrado | Pago anual |
| API de Claude (Anthropic) | Clasificar noticias, edición diaria, IA del bot | Por uso; se mide cada semana con `ai_usage` | Haiku 5.5: 0.10 / 0.50 USD por millón de tokens (entrada / salida). Opus 5.5: 4 / 20 USD |
| Suscripción de Claude (claude.ai) | Claude Code y la tarea programada de videos | No registrado | Tiene límite semanal de uso; la tarea ya corre con Sonnet 5.5 para gastar menos |
| vidIQ | Programar videos en 3 redes | No registrado | Funciona con créditos; al 26/11 quedaban 20 y se renuevan a 150 el 8 de diciembre |
| Speko | Voz de los videos | Por uso; no registrado | |
| ManyChat | "Comenta GUÍA" en Instagram | $0 (plan gratis) | Ofrece prueba Pro de 14 días |
| Mixkit, Telegram, GitHub, Search Console, Google Drive | Video y música, bot y canal, código, SEO, archivos | $0 | Google Drive gratis hasta 15 GB |
| Telegram Stars | Cobro de guías | Comisión por venta | Revisar la comisión vigente antes de calcular ingresos |
| Mercado Pago | Cobro del plan Pro (pendiente) | Comisión por venta | Revisar la comisión vigente al configurarlo |

## Pendientes y problemas conocidos (al 26/11/2026)

1. **Límite de lecturas de D1 (plan gratis, 5 millones al día).**
   - El 26/11 se agotó y `/cetes-hoy` y `/api/kit` dieron error 500.
   - **Causa real** (medida con la analítica de D1 de Cloudflare): entre las 04:00 y las 08:00 UTC, probablemente un robot visitó 1,460 páginas de noticias. La consulta de "noticias relacionadas" leía ~3,700 filas por página: 5.4 millones de lecturas en 5 horas. En horas normales la base lee 20,000–50,000 filas por hora.
   - **Corrección** (27/11, publicada): las relacionadas leen solo las 80 noticias más recientes por el índice de fecha y se guardan 5 minutos en memoria. En prueba local hace unas 28 veces menos trabajo.
   - La cola del canal gratis también recibió un índice nuevo (migración 009), pero solo sumaba unas 75,000 lecturas: no era la causa.
   - Regla: toda consulta que corra cada minuto **o en cada visita de página** debe usar un índice por fecha y un `LIMIT`. Para ver qué consulta gasta más, usa el conjunto `d1QueriesAdaptiveGroups` de la analítica de Cloudflare.
2. **Plan Pro sin cobro.** Faltan los secretos `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`, los planes `MP_PLAN_PRO` y `MP_PLAN_API` de Mercado Pago, y crear el canal Pro privado (`TELEGRAM_PRO_CHAT` y `PRO_CANAL_ID` en el bot).
3. **Newsletter sin correo.** Falta `DIGEST_WEBHOOK_URL` para mandarlo por email.
4. **Guía premium "Plan 30 días" sin escribir.** El cobro existe; la lista de espera se avisa cuando esté lista.
5. **Inflación manual** cada mes (ver arriba).
6. **Fase 2 de eficiencia en curso:** medir el costo real por tarea con la tabla `ai_usage`, revisar si la tarea de videos rinde bien con Sonnet 5.5 y quitar conectores que no se usan en claude.ai.
7. **Publicación automática en X y Threads:** en pausa.
8. **Limpieza:**
   - `README.md` de la raíz casi vacío; `newsletter/README.md` describe el plan original (Mercado Pago, antes de Stars y videos).
   - Copias viejas del bot en `newsletter/bot/`.
   - Dos videos del comercial (53 MB) sueltos en la raíz: no se suben al repositorio, pero ocupan espacio.
9. **La rama de trabajo** es `claude/optimistic-tesla-xe9m8k`. La tarea programada clona esa rama: si cambia, hay que actualizar su prompt.

# Estudio Lana con Café: videos diarios para Instagram y TikTok

Manual que siguen las tareas programadas de producción. Los IDs de cuentas y la carpeta de Drive
**no** están aquí (el repositorio es público): vienen en el prompt de cada tarea.

## Calendario (hora del centro de México, America/Mexico_City)

| Hora | Pieza | Se produce en |
|---|---|---|
| 08:30 | **Dato curioso o educativo** (evergreen) | corrida de las 06:40 |
| 13:30 | **Noticia del día** (lunes a viernes) · educativo en fin de semana | corrida de las 11:40 |
| 20:00 | **Educativo** (lunes a jueves y fin de semana) · **Cierre de semana** los viernes | 06:40 · viernes 16:40 |

Una sola tarea programada corre a las 06:40, 07:40, 11:40, 12:40, 16:40 y 19:40 y hace lo que toque a esa hora.
El bot pide el ✅ antes de la última revisión previa al slot: 07:40 (para 08:30), 12:40 (para 13:30) y 19:40 (para 20:00).

Cada video sale en **Instagram y TikTok** a la misma hora, desde un solo borrador de vidIQ con dos destinos.

## Reglas que no se rompen

1. **Nada se publica sin el ✅ del administrador en Telegram.** El flujo es: borrador en vidIQ → `python3 aprobaciones.py add` → el Worker le manda la vista previa al bot con ✅/❌ → la tarea de revisión publica solo lo aprobado. Sin ✅, no sale.
2. **Nunca inventar cifras.** Cada cifra sale de una fuente leída (con hora si es intradía). En educativos, fuentes oficiales: Banxico, INEGI, CONDUSEF, CNBV, IPAB, CONSAR, SAT, Cetesdirecto. Reportes no confirmados se atribuyen.
3. **No recomendar comprar ni vender.** Siempre "Información, no asesoría financiera".
4. **Captions sin "@"** (ninguna mención). CTA exacto: `Únete gratis a nuestro canal de Telegram: el link está en la bio 👆`. El "@lanaconcafe" solo puede ir dentro del video, junto al QR.
5. **Fotos solo de Wikimedia Commons** con licencia libre y crédito en pantalla. Sin logotipos, sin figuras públicas, sin personas en inicio o cierre. Sin objetos 3D ni estética de IA: fotos reales y gráficas con datos reales.
6. **Sin vida personal ni escándalos.**
7. **Duración 65–75 s** (TikTok solo paga en su programa de creadores videos de más de 1 minuto).
8. **No repetir tema** de los últimos 14 días: revisa `vidiq_social_post_list` antes de elegir.

## Ideas de contenido (rotar; nunca repetir en 14 días)

- **Dato curioso:** por qué el billete de $20 es de polímero; cuánto valía el dólar en 1994 vs hoy (Banxico); el origen de los CETES (1978); qué es una UDI; cuánto cuesta la canasta básica hoy vs hace 10 años (INEGI); por qué Banxico no "imprime" dinero para pagar deudas; la regla del 72.
- **Educativo:** fondo de emergencia; CETES paso a paso; rendimiento real vs inflación; qué protege el IPAB y el Prosofipo; GAT y CAT; ser totalero; aportaciones voluntarias a la Afore; cómo detectar fraudes (SIPRES); qué es un ETF; interés compuesto; cómo leer tu estado de cuenta.
- Cuando un educativo trata un tema de la guía, cierra con: "Esto y más está en la guía *Tu primera inversión en México*, capítulo 1 gratis en el bot" (en el video, no como promesa).

## Producción de cada Reel

Copia `scripts/` a una carpeta de trabajo nueva (el motor espera `credits.json`, `px.json`, `font/` e `img/` junto a él).

1. **Datos:** para noticias, parte de `curl -s https://lanaconcafe-news.gt2hf24n6t.workers.dev/api/kit` y verifica cada cifra en la fuente original con WebSearch (modo extended). Para educativos, fuentes oficiales.
2. **Guion:** gancho de menos de 3 s + desarrollo + cierre con QR. 165–185 palabras (≈ 70 s). Números escritos como se pronuncian.
3. **Fuente:** `curl -sL -o font/bg.ttf "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf"`.
4. **Fotos:** `SSL_CERT_FILE=/root/.ccr/ca-bundle.crt python3 -I scripts/fotos_commons.py <carpeta> '{"clave":"búsqueda en inglés"}'`. Commons da 429 seguido: el script pausa y reintenta; si no alcanza, reutiliza fotos. Revisa una hoja de contacto (logos, personas).
5. **QR:** `python3 scripts/qr.py <carpeta>` (verifica que escanee a https://t.me/LanaconCafe).
6. **Voz (Speko `audio_synthesize`)**, un audio por escena: voz `es-MX-Valeria:MAI-Voice-2.1`, modelo `MAI-Voice-2.1`, speed 1.1, `constraints.allowedProviders.tts: ["azure"]`, instructions de locutora de radio financiera (cálida, segura, pausas naturales, énfasis en cifras). La ruta del wav sale del resultado con la regex `saved to ([^\s"\\]+\.wav)` → `raw0.wav…`; luego `bash scripts/voz.sh <carpeta>`.
7. **Escenas:** `scripts/motor_video.py` (Ken Burns, degradado, tarjetas de vidrio, pills, crédito, transición zoom 0.4 s). Reescribe las funciones de escena con los datos del día; ver `ejemplo_reel_actualizacion.py`. Revisa `python3 motor_video.py stills …` antes del render.
8. **Render:** escenas en paralelo y `join` → 720x1280, libx264 crf 34, AAC 64k, +faststart, **menos de 3.0 MB**. Verifica el QR del último cuadro con `cv2.wechat_qrcode`.
9. **Subida:** Drive `create_file` (base64Content = `sha256:<hash>:<ruta absoluta>`, `video/mp4`, `disableConversionToGoogleType: true`, carpeta del prompt) → `vidiq_video_upload` con la URL de Drive → `uploadId`.
10. **Borrador vidIQ** (`vidiq_social_post_draft_create`): media `{type: "video", id: uploadId}`, `publishAt` a la hora del slot, destinos Instagram y TikTok (IDs del prompt; TikTok con `privacyLevel: "PUBLIC_TO_EVERYONE"`, `allowComment: true`, `musicUsageConfirmed: true`, elegidos por el administrador el 20/11/2026). Guarda `postId` y `revision`.
11. **Aprobación:** `python3 newsletter/estudio/aprobaciones.py add '<json>'` con id `AAAA-MM-DD-HHMM`, slot, `publish_at` (ISO con zona), kind, title, caption, `video_url` (URL directa al mp4: la que devuelve `vidiq_video_upload`, o `https://drive.google.com/uc?export=download&id=<id>`), drive_url, post_id, revision.

## Revisión y publicación (en cada corrida de la tarea, al final)

1. `python3 newsletter/estudio/aprobaciones.py approved`.
2. Por cada uno: `vidiq_social_post_publish` con su `post_id` y `revision`. Si `ya_paso` es true y pasaron menos de 3 horas, primero `vidiq_social_post_draft_update` con `publishAt` = ahora + 10 min (y publica con la revisión nueva); si pasaron más de 3 horas, `aprobaciones.py fail <id> tarde` y no lo publiques.
3. `aprobaciones.py done <id>` (o `fail <id> <motivo>` si vidIQ lo rechaza).
4. Un publicado nunca se publica dos veces. Los rechazados (❌) y los que no reciben respuesta no se tocan.

## Captions

```
<Gancho en una línea con emoji>

<subtítulo>:
• viñeta con cifra y fuente
• … (3–5 viñetas)

Fuentes: …  Fotos: Wikimedia Commons (créditos en pantalla)

Únete gratis a nuestro canal de Telegram: el link está en la bio 👆

Información, no asesoría financiera.

#finanzas #inversiones #dinero #mexico #lanaconcafe + 2–4 del tema
```

Lecciones técnicas acumuladas: `lecciones.md`.

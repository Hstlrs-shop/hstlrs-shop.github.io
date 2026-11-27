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
5. **Imágenes: video real de Mixkit (preferido) o fotos de Wikimedia Commons**, siempre con licencia libre y crédito en pantalla. Sin logotipos, sin figuras públicas, sin personas en inicio o cierre. Sin objetos 3D ni estética de IA: fotos reales y gráficas con datos reales.
6. **Sin vida personal ni escándalos.**
7. **Duración 65–75 s** (TikTok solo paga en su programa de creadores videos de más de 1 minuto).
8. **No repetir tema** de los últimos 14 días: revisa `vidiq_social_post_list` antes de elegir.

## Ideas de contenido (rotar; nunca repetir en 14 días)

- **Dato curioso:** por qué el billete de $20 es de polímero; cuánto valía el dólar en 1994 vs hoy (Banxico); el origen de los CETES (1978); qué es una UDI; cuánto cuesta la canasta básica hoy vs hace 10 años (INEGI); por qué Banxico no "imprime" dinero para pagar deudas; la regla del 72.
- **Educativo:** fondo de emergencia; CETES paso a paso; rendimiento real vs inflación; qué protege el IPAB y el Prosofipo; GAT y CAT; ser totalero; aportaciones voluntarias a la Afore; cómo detectar fraudes (SIPRES); qué es un ETF; interés compuesto; cómo leer tu estado de cuenta.
- Cuando un educativo trata un tema de la guía, cierra con: "Esto y más está en la guía *Tu primera inversión en México*, capítulo 1 gratis en el bot" (en el video, no como promesa).

## Estilo de edición (aprobado por el administrador el 22/11/2026, para todos los videos)

Referencia: el comercial v5–v7 (comerciales de Apple, Tesla y Nvidia como **estilo**, nunca como material). **Colores, tipografía y zonas seguras:** skill `.claude/skills/estudio-video/SKILL.md` (se carga sola). Reglas:

- **Video real en movimiento**, no fotos fijas: clips de Mixkit (`scripts/clips_mixkit.py`, licencia libre, uso comercial). Temas reconocibles para México: CDMX desde arriba, Catedral, bandera, billetes y monedas en mano, manos con el celular, café (latte, espresso, taza humeante), pantallas de mercado. Commons solo cuando el tema exige una foto específica.
- **Cortes al ritmo**: en `SC` pon una **lista** de 2–4 claves de clip por escena y el motor cambia de clip cada 2 tiempos (`BEAT`, por defecto 0.968 s = 124 BPM). En el gancho, un corte por cada palabra clave.
- **Tipografía cinética**: la palabra clave en grande (130–150 px) que entra con `pop` justo cuando la voz la dice, con su cifra en una pastilla debajo. Poco texto por pantalla ("menos es más").
- **Gradación cálida** igual en todo (ya la aplica el motor), viñeta y degradado para que el texto se lea.
- **Gráficas con datos reales** en tarjeta de vidrio cuando hay cifras (dólar, CETES, inflación).
- **Música con licencia libre** debajo de la voz con ducking: `MUSIC=<ruta.mp3> python3 motor_video.py join`. Pistas ya revisadas de Mixkit (Mixkit Stock Music Free License): `623` "Deep Urban" (124 BPM, house; la del comercial), `77` "Running Out of Time" (129 BPM), `371` "Cat Walk" (129 BPM), `113` "House Fest" (123 BPM). URL: `https://assets.mixkit.co/music/<id>/<id>.mp3`. Empieza la pista unos segundos antes de su entrada fuerte para que el "drop" caiga en el momento clave del guion. Rota pistas; no inventes otras sin escucharlas por análisis (BPM/volumen).
- **Voz**: Valeria (Speko) como hasta ahora. La voz del administrador solo con su clon aprobado (pendiente); no simules su voz con otra.
- **Ahorro de uso** (el administrador lo pidió): una sola hoja de stills por video, sin 4K, sin re-renders salvo error real, escenas en paralelo, clips de 12 s a 1080p máx. y borrados al terminar.

## Producción de cada Reel

Copia `scripts/` a una carpeta de trabajo nueva (el motor espera `credits.json`, `px.json`, `font/` e `img/` junto a él).

1. **Datos:** para noticias, parte de `curl -s https://lanaconcafe.com/api/kit` y verifica cada cifra en la fuente original con WebSearch (modo extended). Para educativos, fuentes oficiales.
2. **Guion:** gancho de menos de 3 s + desarrollo + cierre con QR. 165–185 palabras (≈ 70 s). Números escritos como se pronuncian.
3. **Fuente:** `curl -sL -o font/bg.ttf "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf"`.
4. **Clips:** `python3 -I scripts/clips_mixkit.py <carpeta> '{"clave":"búsqueda en inglés"}' 3` (3 clips por clave → `clave_0…2` para montar al ritmo). **Fotos** (solo si hace falta): `SSL_CERT_FILE=/root/.ccr/ca-bundle.crt python3 -I scripts/fotos_commons.py <carpeta> '{"clave":"búsqueda en inglés"}'`. Commons da 429 seguido: el script pausa y reintenta; si no alcanza, reutiliza fotos. Revisa una hoja de contacto (logos, personas).
5. **QR:** `python3 scripts/qr.py <carpeta>` (verifica que escanee a https://t.me/LanaconCafe).
6. **Voz (Speko `audio_synthesize`)**, un audio por escena: voz `es-MX-Valeria:MAI-Voice-2.1`, modelo `MAI-Voice-2.1`, speed 1.1, `constraints.allowedProviders.tts: ["azure"]`, instructions de locutora de radio financiera (cálida, segura, pausas naturales, énfasis en cifras). La ruta del wav sale del resultado con la regex `saved to ([^\s"\\]+\.wav)` → `raw0.wav…`; luego `bash scripts/voz.sh <carpeta>`.
7. **Escenas:** `scripts/motor_video.py` (Ken Burns, degradado, tarjetas de vidrio, pills, crédito, transición zoom 0.4 s). Reescribe las funciones de escena con los datos del día; ver `ejemplo_reel_actualizacion.py`. Revisa `python3 motor_video.py stills …` antes del render.
8. **Render:** escenas en paralelo y `join` → 720x1280, libx264 crf 34, AAC 64k, +faststart, **menos de 3.0 MB**. Verifica el QR del último cuadro con `cv2.wechat_qrcode`.
9. **Subida:** Drive `create_file` (base64Content = `sha256:<hash>:<ruta absoluta>`, `video/mp4`, `disableConversionToGoogleType: true`, carpeta del prompt) → `vidiq_video_upload` con la URL de Drive → `uploadId`.
10. **Borrador vidIQ** (`vidiq_social_post_draft_create`): media `{type: "video", id: uploadId}`, `publishAt` a la hora del slot, destinos Instagram y TikTok (IDs del prompt; TikTok con `privacyLevel: "PUBLIC_TO_EVERYONE"`, `allowComment: true`, `musicUsageConfirmed: true`, elegidos por el administrador el 20/11/2026). Guarda `postId` y `revision`.
11. **Aprobación** (requiere `export STUDIO_TOKEN=...`, que viene en el prompt de la tarea; nunca lo escribas en el repo): `python3 newsletter/estudio/aprobaciones.py add '<json>'` con id `AAAA-MM-DD-HHMM`, slot, `publish_at` (ISO con zona), kind, title, caption, `video_url` (URL directa al mp4: la que devuelve `vidiq_video_upload`, o `https://drive.google.com/uc?export=download&id=<id>`), drive_url, post_id, revision.

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

Fuentes: …  Video: Mixkit / Fotos: Wikimedia Commons (créditos en pantalla)

Únete gratis a nuestro canal de Telegram: el link está en la bio 👆

Información, no asesoría financiera.

#finanzas #inversiones #dinero #mexico #lanaconcafe + 2–4 del tema
```

Lecciones técnicas acumuladas: `lecciones.md`.

## YouTube (cuando el canal esté conectado en vidIQ)

Cada Reel diario se publica también como **YouTube Short** desde el mismo borrador (tercer destino, platformAccountId en el prompt de la tarea).

- **title** (máx. 100 caracteres, sin < ni >): el gancho del video + palabra clave de búsqueda. Ej.: `¿Los CETES le ganan a la inflación? Tasas de hoy`.
- **text** (descripción), siempre con este cierre para cerrar el ciclo YouTube → sitio → Telegram:
  ```
  <2–3 líneas con las cifras y su fuente>

  📊 Calcula tu caso: https://lanaconcafe.com/cetes-hoy   (o la página del sitio que corresponda al tema)
  📖 Guía gratis para tu primera inversión: https://lanaconcafe.com/go/guia?s=yt
  ☕ Noticias diarias en Telegram: https://lanaconcafe.com/go/canal?s=yt

  Información, no asesoría financiera.
  #finanzas #inversiones #mexico #shorts
  ```
  (Cuando exista el dominio propio, los enlaces cambian a él.)
- **privacyStatus**: el que eligió el administrador (en el prompt). **categoryId** 27 (Educación). **tags**: 5–10 del tema (cetes, inflación, dólar, banxico, ahorro…).
- En YouTube sí se permiten enlaces en la descripción: úsalos siempre hacia el sitio, nunca directo a otro perfil.

### Segmento semanal "IA y tu dinero" (domingo 20:00)
Reel de 65–75 s sobre lo que pasó en la semana (lunes a domingo) con las empresas y el dinero de la inteligencia artificial: acciones de IA y chips (Nvidia, AMD, Intel, Microsoft, Alphabet, Meta, Amazon, TSMC, Broadcom, índice SOX), resultados, inversiones en centros de datos, regulación, y **qué significa para alguien que invierte desde México** (fondos, ETFs, tipo de cambio). Gancho con el dato más sorprendente de la semana (menos de 3 s), 2–3 datos con su número y fecha, un "¿por qué?" en lenguaje simple y "lo que viene" con una fecha concreta. Tono alegre y directo. Solo cifras leídas en una fuente; nunca decir que algo va a subir ni qué comprar.

### Video largo semanal (se produce el domingo a las 06:40 y sale a las 12:00; aprobación antes de las 11:40)
"La semana en tu bolsillo" (8–12 min): las 5 noticias de la semana para México, qué significan para tu dinero, la tasa de CETES y el dólar, y lo que viene. Capítulos en la descripción (00:00 …), miniatura con una cifra grande. Mismo flujo de aprobación por Telegram.

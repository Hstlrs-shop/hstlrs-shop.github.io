---
name: estudio-video
description: Producir o editar un video de Lana con Café (Reel, Short, video largo o comercial) con el motor del estudio. Úsala antes de escribir guiones de escena, elegir colores, tipografía o posición de textos, descargar clips o música, o renderizar. Contiene el estilo visual aprobado, los colores con su contraste medido y las zonas seguras de Instagram y TikTok. El procedimiento completo (datos, voz, Drive, vidIQ, aprobación) está en newsletter/estudio/MANUAL.md.
---

# Estudio de video: estilo aprobado

Fuente de verdad del estilo: el comercial aprobado por el dueño el 22/11/2026. El procedimiento paso a paso está en `newsletter/estudio/MANUAL.md`; lee solo la sección que necesites.

## Colores (ya están en `newsletter/estudio/scripts/motor_video.py`)

| Uso | Token | Color | Contraste sobre foto oscurecida |
|---|---|---|---|
| Marca, cifra clave, palabra destacada, pastillas | `CAF` | `#E2B33C` dorado | 5.8:1 |
| Texto principal | `CRE` | `#F5F1EA` crema | 10.3:1 |
| Texto secundario, créditos | `MUT` | `#CFC6BA` gris claro | ≈ 6:1 |
| Subidas | `GRN` | `#5AD78C` verde | 6.3:1 |
| Bajadas | `RED` | `#FF7A6B` rojo coral | 4.5:1 |
| Texto sobre pastilla dorada | `INK` | `#2B1D16` café oscuro | alto |

Reglas:
- No inventes colores nuevos; usa los tokens.
- Subidas y bajadas siempre con signo (`+`/`−` o `▲`/`▼`), nunca solo con color.
- Todo texto debe medir al menos 4.5:1 de contraste. Si el fondo es claro, oscurécelo (el motor ya aplica gradación y degradado).

## Tipografía

- Bricolage Grotesque (`font/bg.ttf`; descarga en el MANUAL).
- **Tamaño mínimo 28 px** en 1080×1920. Cifra principal de 96 a 150 px.
- Una idea por pantalla.
- Palabra clave de 130–150 px que entra justo cuando la voz la dice.

## Zonas seguras (Instagram y TikTok tapan los bordes)

- **Arriba:** marca y progreso desde y = 170, no más arriba.
- **Abajo:** créditos en y = 1640–1684; deja libres los últimos ~240 px.
- **Derecha:** deja ~120 px libres en la mitad inferior; ahí van los botones de me gusta y compartir.
- El contenido principal va entre y ≈ 250 y 1600.
- Verifica con una captura del video ya publicado cuando cambies el diseño.

## Imagen y ritmo

- **Video real de Mixkit** (`scripts/clips_mixkit.py`), con licencia libre y crédito en pantalla. Sin logotipos ni figuras públicas, y sin personas reconocibles al inicio o al cierre.
- **Cortes al ritmo:** listas de 2–4 clips por escena en `SC` (el motor cambia cada `BEAT`).
- **Gradación cálida** y gráficas con datos reales en tarjeta oscura.
- **Música con licencia** debajo de la voz (`MUSIC=` al hacer `join`). Pistas revisadas en el MANUAL.

## Antes de entregar

- [ ] Una hoja de stills; contraste y zonas seguras revisados.
- [ ] Cada cifra con su fuente en pantalla; "Información, no asesoría financiera".
- [ ] Nada se publica sin el ✅ del dueño en Telegram.

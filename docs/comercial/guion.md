# Comercial HSTLRS de 8 segundos (ElevenLabs)

Formato: vertical 9:16, 1080×1920, para Reels, TikTok y Historias.
Prendas: los 3 diseños más llamativos de la tienda. Ajolote astronauta (playera negra), Jaguar (playera negra) y La ola (playera hueso).

## Archivos de esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `cuadro-1-ajolote-9x16.jpg` | Imagen inicial de la toma 1 |
| `cuadro-2-jaguar-9x16.jpg` | Imagen inicial de la toma 2 |
| `cuadro-3-ola-9x16.jpg` | Imagen inicial de la toma 3 |
| `cierre-9x16.png` / `cierre-2s.mp4` | Cierre con logo, página y código. No lo generes con IA: la IA deforma las letras |
| `diseno-ajolote.jpg`, `diseno-jaguar.jpg`, `diseno-ola.jpg` | Referencia del diseño. Súbela junto con la imagen inicial si el modelo acepta varias imágenes |
| `maqueta-8s.mp4` | Maqueta del ritmo y los cortes. No es el comercial final |
| `cuadro-*.jpg` (sin 9x16) | Las mismas tomas en formato original, por si las quieres en 4:5 |

Los cuadros son tus fotos de modelos, con el estampado de la espalda cambiado por los diseños originales de la página.
Para volver a generarlos: `python3 scripts/arte/comercial.py <carpeta-de-fuentes>`.

## Guion (8 s)

| Tiempo | Toma | Qué pasa |
|---|---|---|
| 0.0–2.5 s | 1 · Ajolote | Atardecer. Él está de espaldas junto al auto negro. La cámara se acerca despacio al diseño de la espalda. El viento mueve la tela |
| 2.5–4.5 s | 2 · Jaguar | Ella voltea hacia el sol. El cabello se mueve con el viento y el jaguar queda a la vista. Cámara lateral suave |
| 4.5–6.3 s | 3 · La ola | Él camina un paso hacia el horizonte. La cámara lo sigue a la altura de la espalda |
| 6.3–8.0 s | Cierre | Logo HSTLRS, "Arte que se usa", página y HSTLR10. Usa `cierre-2s.mp4` |

## Paso a paso en ElevenLabs

1. Entra a **ElevenLabs → Image & Video** y elige **Video**.
2. Escoge el modelo de video de mayor calidad que tengas. Elige la versión Pro o la de más resolución, en 1080p y 9:16.
3. Genera **una toma a la vez**:
   - Sube el cuadro inicial como *start frame* o imagen inicial.
   - Si el modelo acepta más imágenes de referencia, agrega el `diseno-*.jpg` de esa toma.
   - Pega el prompt de abajo.
   - Pide la duración más corta (4–5 s). Del resultado usarás solo los mejores 2 segundos.
4. Genera 2 o 3 versiones de cada toma y quédate con la que mejor conserve el diseño de la playera.
5. Une las tomas y el cierre en el editor de ElevenLabs o en CapCut con los tiempos del guion. Usa cortes directos, sin transiciones lentas.
6. Agrega la voz y la música (más abajo) y exporta en 1080×1920.

## Prompts

Los prompts están en inglés porque así los modelos de video siguen mejor las instrucciones. Debajo de cada uno va la traducción para que sepas qué pide.

**Toma 1 · Ajolote** (imagen inicial: `cuadro-1-ajolote-9x16.jpg`)
```
Cinematic fashion commercial, golden hour. A young man stands with his back to the camera beside a black sports car, wearing an oversized black heavyweight t-shirt with a large full-color back print of a pink axolotl astronaut surrounded by orange marigold flowers. Slow push-in toward the back print, a light breeze ripples the fabric, warm sunset rim light, shallow depth of field, subtle film grain. Keep the back print exactly as in the reference image: same colors, same position, sharp and undistorted. No text, no logos, no car badges. 9:16 vertical, 1080p, smooth, realistic motion.
```
> Comercial de moda al atardecer. Un hombre de espaldas junto a un auto negro, con la playera negra del ajolote astronauta. La cámara se acerca despacio al diseño y el viento mueve la tela. El diseño se conserva igual, sin letras ni logos de autos.

**Toma 2 · Jaguar** (imagen inicial: `cuadro-2-jaguar-9x16.jpg`)
```
Cinematic fashion commercial at sunset. A young woman seen from behind wears an oversized black t-shirt with a realistic jaguar face printed on the back, a red sun circle and black smoke behind it. She slowly turns her head toward the sun, her long hair moves in the wind and reveals the jaguar print. Gentle lateral camera move, warm backlight, shallow depth of field, premium streetwear look. Keep the jaguar print identical to the reference: same red sun, same details, not warped. No text, no logos, no car badges. 9:16 vertical, 1080p, realistic motion.
```
> Ella de espaldas con la playera negra del jaguar. Voltea hacia el sol, el cabello se mueve y deja ver el jaguar. Cámara lateral suave. El diseño se conserva igual.

**Toma 3 · La ola** (imagen inicial: `cuadro-3-ola-9x16.jpg`)
```
Cinematic fashion commercial, dusk. A young man seen from behind wears an oversized bone-white t-shirt with a circular back print of a great ocean wave in navy blue with a red sun. He takes one slow step toward the horizon while the camera follows at shoulder height, soft wind on the fabric, warm sky, mountains out of focus. Keep the wave print exactly as in the reference: perfect circle, same colors, sharp. No text, no logos, no car badges. 9:16 vertical, 1080p, realistic motion.
```
> Él de espaldas con la playera hueso de La ola. Da un paso hacia el horizonte y la cámara lo sigue. El círculo del diseño se conserva igual.

**Negative prompt** (si el modelo tiene ese campo)
```
distorted print, changed design, melted graphics, extra text, letters, watermark, brand logos, car emblems, extra fingers, deformed hands, flicker, low resolution
```

## Voz en off (ElevenLabs → Text to Speech)

- **Voz:** masculina o femenina, grave y tranquila, con acento mexicano neutro. Usa el modelo de voz más alto que tengas.
- **Ajustes:** estabilidad media (~45%), estilo bajo. Velocidad normal.
- **Texto** (dura unos 6 s y termina sobre el cierre):

```
No es solo una playera… es arte que se usa. HSTLRS. Diez por ciento con HSTLR10.
```

Si prefieres sin voz, usa solo música y pon el texto en pantalla.

## Música y efectos (ElevenLabs → Music / Sound Effects)

- **Música (8 s):** `Dark cinematic trap beat with deep 808 bass, slow build, a hard hit at 2.5 seconds, ends with a clean stop at 8 seconds, premium streetwear ad, 90 BPM`
- **Efectos:**
  - Viento suave en las tomas 1–3: `soft wind gust on fabric, outdoor dusk`
  - Golpe en el cierre: `deep cinematic boom impact with short reverb tail`

## Detalles que cuidar

- Revisa cada toma cuadro por cuadro. Si el diseño se deforma o cambia de color, desecha esa versión: el comercial vende el diseño.
- No dejes logotipos de marcas de autos a la vista. Las tomas elegidas ya los evitan, y los prompts los prohíben.
- Usa siempre el cierre fijo. Así la página y el código salen legibles.
- Para anuncios pagados, sube el video final con los textos y enlaces de `docs/anuncios/README.md`.

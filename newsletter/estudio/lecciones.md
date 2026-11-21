# Lecciones técnicas y decisiones (hasta el 20 nov 2026)

## Pedidos del administrador
- 13 nov: nivel "ultra profesional", elementos reales, que enganche.
- 16 nov: que NO parezca hecho con IA → se quitaron objetos 3D; fotos reales + gráficas con datos reales. No fotos de mujeres en inicio/cierre.
- 19 nov: subir siempre a Drive el Reel, cada lámina y el meme. Memes "reales" tipo web pero con diseño propio y dato real.
- 20 nov: actualizaciones a media jornada en formato Reel con fotos reales. Captions sin "@lanaconcafe": solo "el link está en la bio".

## Técnicas
- PIL: dibujar con alfa 0 en ImageDraw RGBA sobrescribe el píxel; saltar el dibujo si alfa < 0.01.
- La fuente no trae ✓ ni ✕: dibujarlos con líneas.
- Commons: 429 casi siempre; pausas de 7 s y reintentos de 15/30/45 s. Fotos con logotipos grandes (p. ej. la torre Nasdaq MarketSite) se descartan.
- Voz Valeria a speed 1.1 va lenta (~2.3 palabras/s): silenceremove (−45 dB, 0.32 s) + atempo 1.11 total. Escena = voz + 0.55 s (+1.35 s la última). ~165 palabras ≈ 75 s.
- 720x1280 crf 34: ~2.8 MB para 75 s; ~2.2 MB para 57 s.
- Speko: el resultado (cientos de miles de caracteres) se guarda en tool-results; extraer la ruta del wav con regex.
- vidIQ: Instagram rechaza PNG; máximo 5 links de subida abiertos; un post publicado no se edita desde vidIQ.
- Si la cifra intradía puede cambiar, cada lámina/escena lleva la hora del dato ("11:13 a. m. de Nueva York").
- Cuando dos fuentes no coinciden (p. ej. cierre 19.08 vs FIX 19.03 del peso), mostrar ambas con su etiqueta.

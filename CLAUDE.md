# CLAUDE.md

Reglas para crear **shorts verticales informativos** (gaming, cultura pop, curiosidades) en este repo.

## 1. Flujo de trabajo (siempre en este orden)

1. **Investigar** cada tema en la web.
2. **Enseñar la lista de datos** con su enlace y su nivel de fuente (ver §2). Incluir lo descartado y por qué.
3. **Esperar el visto bueno** del usuario. No escribir guiones antes.
4. **Escribir los guiones** solo con datos aprobados.
5. Guardar en el repo solo cuando el usuario lo pida (ver §7).

## 2. Verificación de datos

- **Cada dato lleva su enlace.** Sin fuente, no entra en el guion.
- Etiquetar cada dato:
  - **Oficial**: fuente primaria (web del estudio o editor, Guinness World Records, comunicados).
  - **Prensa**: medio reconocido (Washington Post, CNN, CNBC, NPR, Variety, Kotaku, Game Informer, VGC…).
  - **Dudoso**: una sola fuente, webs de fans, wikis, agregadores o filtraciones. **No se usa** como hecho.
- Si dos fuentes dan cifras distintas, se usa la **oficial** y se avisa de la diferencia.
- No mezclar cifras que no se pueden comparar (una plataforma frente a varias, un tráiler frente a otro).
- Revisar si el tema ha cambiado hace poco (lanzamientos, retrasos) y decir la fecha de la información.

## 3. Cómo se cuentan los datos

- Lo que el estudio **no confirma** se presenta como "inspirado en", "recuerda a" o "la prensa lo describe como". Nunca como hecho.
- Comparaciones de prensa (p. ej. "tipo Bonnie y Clyde") se atribuyen: "como lo describe la prensa".
- Matizar los récords: decir exactamente qué récord es (p. ej. "sin contar música") para no exagerar.
- **Nombres oficiales** tal como los escribe el estudio (p. ej. "Lucia", sin tilde). Si hay duda, preguntar.
- Citas oficiales traducidas con fidelidad, sin inventar detalles.

## 4. Formato del guion

- **Duración:** 45–55 s. **Voz en off:** 130–150 palabras.
- **Estructura:**
  - **0–3 s, gancho:** una frase con un dato fuerte o una pregunta. Sin saludos ni presentaciones.
  - **Desarrollo:** un dato por bloque, de 6 a 12 s cada uno.
  - **Cierre (últimos 5–8 s):** remate más pregunta a la audiencia ("Comenta 👇").
- **Tabla con 4 columnas:** `Tiempo | Voz en off | Texto en pantalla | Visual`.
- **Texto en pantalla:** máximo unas 6 palabras, en MAYÚSCULAS para la idea clave, cifras exactas y emojis con moderación.
- Frases cortas, fáciles de decir en voz alta. Español neutro, tuteo.
- Un tema por short. Si sobran datos, se guardan para otro.

## 5. Spoilers y actualidad

- Sin spoilers del argumento más allá del material oficial previo al lanzamiento.
- Si el producto acaba de salir, mencionarlo en el cierre ("ya disponible").

## 6. Derechos e imágenes

- Recordar al usuario que revise la política de contenido del estudio antes de usar su material (tráileres, capturas), sobre todo si va a monetizar.
- No copiar logos ni material oficial en el repo.

## 7. Archivos y git

- Investigación: `research/<proyecto>.md`. Guiones: `shorts/<proyecto>-guiones.md`.
- Commits en la rama de trabajo de la sesión. No hacer push a `main` ni abrir PRs sin permiso.
- Nada de datos personales del usuario en archivos, commits ni peticiones externas.

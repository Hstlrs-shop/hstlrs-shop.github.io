# Operación diaria (flujo de trabajo)

El sistema funciona solo; tu trabajo es **editorial y de crecimiento**. Unos 45–60 min al día.

## Rutina

| Hora (CDMX) | Qué pasa | Qué haces tú |
|-------------|----------|--------------|
| 24/7, cada minuto | El Worker lee ~15 fuentes, deduplica, puntúa, la IA clasifica y alerta al canal Pro | Nada. Revisa el canal 2–3 veces al día |
| 05:17 (lun–vie) | Se genera la edición diaria y se anuncia en Telegram | 10 min: léela, corrige si hace falta y programa el envío en tu plataforma de email |
| 07:00–08:30 | Pre-apertura | Publica 2–3 alertas (con retraso) en X/Threads con enlace al newsletter |
| Eventos clave | Fed, Banxico, IPC, empleo EE.UU. | Avisa antes en el canal público: "hoy los Pro lo reciben al segundo" |
| Tarde | | 15 min: vídeo corto con las 3 noticias del día |
| Viernes | | Revisa 20 alertas de la semana: ¿impacto bien clasificado? Ajusta reglas o umbrales |

## Ajustes finos (sin tocar código)

En `wrangler.toml → [vars]`:

- **Demasiadas alertas Pro** → sube `PRO_MIN_IMPACT` a `5` o `AI_MIN_SCORE` a `55`.
- **Se escapan noticias** → baja `AI_MIN_SCORE` a `35` (más llamadas a la IA = más coste).
- **Más presión de venta** → sube `FREE_DELAY_MIN` (15 → 30). Con cuidado: si el gratis no aporta valor, deja de crecer la lista.
- **Coste de IA** → `CLAUDE_MODEL` controla el modelo; los análisis van en lotes de 10 con esfuerzo bajo.

## Añadir fuentes

Edita `worker/src/sources.ts`. Prioriza en este orden:

1. **Oficiales nacionales**: banco central, regulador de valores, bolsa local, ministerio de hacienda, instituto de estadística. Busca su feed RSS (suele estar en "Sala de prensa"). Si no tienen RSS, puede leerse la página de comunicados (fase 2).
2. **Agencias** con RSS público.
3. **Medios** económicos locales.

Prueba un feed antes de añadirlo:

```bash
curl -s -A "Mozilla/5.0 (compatible; LanaConCafeBot/1.0)" "URL_DEL_FEED" | grep -c "<item\|<entry"
```

Evita feeds de un único item fijo (como `bls_latest.rss`): el enlace nunca cambia y no generan alertas.

## Ventaja de velocidad: el calendario

Los datos macro salen a hora exacta (p. ej. IPC de EE.UU. a las 8:30 ET). Fase 2: un Durable Object con alarmas que, en esos minutos, consulte la fuente oficial cada 5–10 s en lugar de cada minuto. Ahí es donde se gana de verdad a los medios.

## Calidad editorial

- Titulares factuales, sin clickbait. La credibilidad es lo que se vende.
- Si una alerta fue errónea, corrígela en el canal ("✏️ Corrección: …"). Nunca la borres sin explicar.
- Nunca "compra/vende". Siempre "impacto probable".

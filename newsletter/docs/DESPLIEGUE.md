# Despliegue paso a paso

Tiempo estimado: 45–60 minutos. Necesitas: cuenta de Cloudflare (plan Workers Paid de $5 recomendado por el cron cada minuto), tu bot de Telegram, cuenta de Stripe y una API key de Anthropic.

## 1. Telegram

1. Crea **dos canales**:
   - Público, p. ej. `@pulsomercados` → será `TELEGRAM_FREE_CHAT`.
   - Privado (Pro) → obtén su id `-100…` (reenvía un mensaje del canal a `@userinfobot` o mira el `chat.id` en los updates de tu bot) → `TELEGRAM_PRO_CHAT`.
2. Añade **tu bot actual** como administrador en ambos, con permisos para *publicar mensajes*, *invitar usuarios mediante enlace* y *banear usuarios*.
3. Este Worker usa el **mismo token** solo para *enviar* (`sendMessage`, `createChatInviteLink`…). No toca el webhook de tu bot, así que tu automatización actual sigue igual.
4. (Recomendado) Para que la expulsión automática al cancelar funcione, tu bot debe reenviar los updates `chat_member` del canal Pro a este Worker. En el código de tu bot actual:

   ```js
   // dentro del handler del webhook de tu bot
   if (update.chat_member && String(update.chat_member.chat.id) === env.TELEGRAM_PRO_CHAT) {
     ctx.waitUntil(fetch("https://pulso-news.TU-SUBDOMINIO.workers.dev/telegram/chat-member", {
       method: "POST",
       headers: { "content-type": "application/json", "x-forward-secret": env.TELEGRAM_FORWARD_SECRET },
       body: JSON.stringify(update),
     }));
   }
   ```

   Y asegúrate de que tu `setWebhook` incluye `"chat_member"` en `allowed_updates`.

## 2. Cloudflare

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create pulso-db              # copia el database_id a wrangler.toml
npx wrangler kv namespace create CACHE       # copia el id a wrangler.toml
npm run db:init                              # crea las tablas

npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET   # después del paso 3
npx wrangler secret put ADMIN_TOKEN             # cualquier cadena larga aleatoria
npx wrangler secret put TELEGRAM_FORWARD_SECRET # otra cadena aleatoria (la misma en tu bot)
npx wrangler secret put DIGEST_WEBHOOK_URL      # opcional, paso 4
```

Edita `[vars]` en `wrangler.toml` (`BRAND`, `SITE_URL`, `COUNTRY`, canales, enlaces de Stripe) y despliega:

```bash
npm run deploy
curl -X POST -H "authorization: Bearer $ADMIN_TOKEN" "https://pulso-news.TU-SUBDOMINIO.workers.dev/admin/run?task=ingest"
```

La **primera** lectura de cada fuente se guarda sin alertar (para no inundar el canal con noticias viejas). A partir del minuto siguiente solo se alerta lo nuevo.

Tareas manuales disponibles en `/admin/run?task=`: `ingest`, `free`, `digest`, `stats`.

## 3. Stripe

1. Crea los productos: **Pro mensual** ($12), **Pro anual** ($99), **API** ($79).
2. Crea un **Payment Link** para cada uno:
   - En *Después del pago* → redirigir a `https://TU-SITIO/gracias.html?session_id={CHECKOUT_SESSION_ID}`.
   - En *Metadatos* añade `plan = pro` (o `plan = api`).
3. Webhook: *Desarrolladores → Webhooks → Añadir endpoint* `https://pulso-news.TU-SUBDOMINIO.workers.dev/stripe/webhook` con los eventos `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copia el *signing secret* (`whsec_…`) a `STRIPE_WEBHOOK_SECRET`.
4. Activa el **portal de clientes** para que puedan cancelar solos.

Flujo resultante: paga → Stripe llama al webhook → el Worker crea un enlace de invitación de **un solo uso** (caduca en 7 días) y una API key → la página `gracias.html` los muestra. Al cancelar → se revoca el enlace y se expulsa al usuario del canal.

## 4. Email (newsletter)

El Worker genera la edición cada día laborable (cron `17 11 * * 1-5` UTC) y la publica en la web y en Telegram. Para enviarla por email elige una plataforma y conéctala a `DIGEST_WEBHOOK_URL`, que recibe `{ id, subject, markdown, html, url }`:

- **Beehiiv** (recomendado para monetizar: referidos, red de anuncios y suscripciones de pago integradas) — vía su API o un escenario de Make/Zapier que cree el post.
- **Buttondown / Kit (ConvertKit)** — igual, vía API o Make/Zapier.

Los emails que capta la web quedan en la tabla `leads`; impórtalos periódicamente a tu plataforma (o añade el envío en `/api/subscribe`).

## 5. Web (GitHub Pages)

1. Edita `site/config.js` con la URL de tu Worker, canal y enlaces de Stripe.
2. Si este proyecto vive en su propio repositorio, el workflow `.github/workflows/pages.yml` publica `site/` automáticamente. Activa *Settings → Pages → Source: GitHub Actions*.
3. Para desplegar el Worker desde GitHub, añade los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (workflow `deploy-worker.yml`).

## 6. Comprobación final

- [ ] `GET /health` responde `ok`.
- [ ] `task=stats` muestra noticias de las últimas 24 h.
- [ ] Llega una alerta al canal Pro cuando hay noticia de impacto ≥ 4.
- [ ] El canal público la recibe ~15 min después con el CTA a Pro.
- [ ] `task=digest` genera la edición y aparece en la web.
- [ ] Un pago de prueba (modo test de Stripe) muestra el enlace en `gracias.html`.

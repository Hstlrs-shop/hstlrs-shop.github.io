# Filtro de correos HSTLRS: spam y fraude

Buzón: fragaaitss@icloud.com. Cada correo cae en una de 4 categorías.

| Categoría | Qué hacer |
|---|---|
| 🟢 **Cliente real** | Responder en menos de 24 h (plantillas abajo) |
| 🔵 **Operación** (Shopify, Printful, PayPal, banco) | Leer; verificar en la app, nunca en el enlace del correo |
| 🟡 **Spam** (vendedores, agencias, "socios") | Archivar sin responder |
| 🔴 **Fraude / phishing** | No abrir enlaces ni adjuntos. Marcar como basura y borrar |

## 🔴 Señales de fraude (basta UNA)

1. **Remitente falso:** dice "Shopify", "Printful", "Meta", "Instagram", "PayPal" o "SAT", pero el dominio real no es el oficial. Toca el nombre del remitente para ver la dirección completa.
   - Dominios oficiales: `@shopify.com`, `@printful.com`, `@paypal.com`, `@facebookmail.com`, `@sat.gob.mx`.
   - Ejemplos falsos: `shopify-support@gmail.com`, `@shopify-billing.net`, `meta-copyright@outlook.com`.
2. **Amenaza con urgencia:**
   - "tu tienda será suspendida en 24 h"
   - "infracción de copyright, apela aquí"
   - "pago rechazado, actualiza tu tarjeta"
3. **Pide datos sensibles:** contraseña, código de verificación (2FA), datos de tarjeta, CLABE, INE o "verificar tu cuenta" con un enlace.
4. **Cliente que paga de más:** pide que le devuelvas la diferencia por transferencia, o que mandes el pedido a otra dirección o país "para un familiar".
5. **Adjuntos raros:** `.zip`, `.html`, `.exe`, o un "comprobante de pago" en PDF que pide habilitar contenido.
6. **Pedido sospechoso en Shopify:**
   - Shopify lo marca con **riesgo alto** de fraude.
   - O el nombre o la dirección de facturación no coinciden con los de envío y además son varias piezas caras.
   - **No se envía**: se cancela y se reembolsa desde Shopify.

> Regla de oro: si un correo te pide hacer algo con tu cuenta, **no uses su enlace**. Abre la app de Shopify, Printful o PayPal tú mismo y revisa ahí. Si no aparece nada en la app, era falso.

## 🟡 Señales de spam

- Ofrecen "subir tus ventas", SEO, apps, diseño web, reseñas, influencers o dropshipping "con ganancias garantizadas".
- Saludo genérico ("Hi store owner", "Dear Sir") y en inglés para una tienda mexicana.
- Dicen haber "revisado tu tienda" y encontrado "errores críticos".
- Te pidieron responder y luego mandan 3–4 seguimientos.

## 🟢 Cliente real: cómo reconocerlo

- Menciona un **número de pedido** (#1001…), un producto o una talla concreta.
- Escribe en español, desde Gmail, Hotmail o iCloud, sin enlaces raros.
- Verifícalo en Shopify → **Pedidos** → buscar el correo del cliente.

### Plantillas de respuesta

**¿Dónde está mi pedido?**
> ¡Hola! Gracias por tu compra. Cada pieza se hace bajo pedido: la producimos en 2–5 días hábiles y el envío tarda 3–10 días hábiles. En cuanto sale te llega el número de guía por correo. Tu pedido #____ está en: ____. Cualquier duda, por aquí o por WhatsApp al 55 8014 9227. — HSTLRS

**Cambio de talla**
> ¡Hola! Claro. Tienes 30 días desde que lo recibes, sin uso y con etiquetas. Mándanos tu número de pedido y la talla que necesitas, y te enviamos las instrucciones. — HSTLRS

**Llegó con defecto**
> ¡Hola! Lamentamos mucho esto. Mándanos 2–3 fotos del defecto y tu número de pedido, y te reponemos la pieza sin costo. — HSTLRS

## Configurar el filtro automático en iCloud (5 min, una sola vez)

En una computadora entra a **icloud.com/mail**, abre ⚙️ **Configuración → Reglas** y crea:

1. **Remitente contiene** `@shopify.com` → mover a carpeta **"Shopify"**.
2. **Remitente contiene** `@printful.com` → mover a carpeta **"Printful"**.
3. **Asunto contiene** `suspend` → mover a **"Revisar fraude"**. Haz una regla igual para cada una de estas palabras:
   - `suspendida`
   - `copyright`
   - `verify your account`
   - `verifica tu cuenta`
   - `unusual activity`
4. **Asunto contiene** `SEO` → mover a **"Spam tienda"**. Haz una regla igual para cada una de estas palabras:
   - `collaboration`
   - `partnership`
   - `boost your sales`
   - `store audit`

Y en el iPhone: **Configuración → Apps → Mail → Proteger actividad en Mail** (actívalo, bloquea rastreadores).

## Revisión automática con IA

Apple no deja que ninguna IA lea un buzón de iCloud directamente. Para que el asistente revise, clasifique y te prepare respuestas solo:

1. Crea un Gmail para la tienda (ej. `hstlrs.soporte@gmail.com`).
2. En icloud.com/mail → Configuración → **Reenviar** todo a ese Gmail (y conservar copia en iCloud).
3. Conecta Gmail en claude.ai → Configuración → Conectores.

Con eso la revisión diaria puede leer los correos nuevos, etiquetarlos (Cliente / Operación / Spam / Fraude) y dejarte borradores de respuesta para que solo pulses *Enviar*.

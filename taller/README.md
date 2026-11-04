# Nau

SaaS de gestión logística para talleres mecánicos en México. Incluye órdenes de trabajo, refacciones, compras a proveedores, planificación de mecánicos y bahías, y un asistente con IA que responde dudas usando los datos de cada taller. Se cobra como suscripción mensual con Mercado Pago.

## Qué incluye

| Parte | Ruta | Para qué |
|---|---|---|
| Web de ventas | `/` | Funciones, asistente IA, precios (salen de la configuración), preguntas frecuentes, prueba gratis y botón de WhatsApp |
| Demo | `/demo/` | La app con datos de ejemplo guardados en el navegador, sin registrarse |
| Registro / acceso | `/cuenta.html` | Crear un taller (prueba gratis) o iniciar sesión |
| App | `/app/` | La herramienta del taller, con los datos en el servidor y compartidos por todo el equipo |
| Administración | `/admin.html` | Para ti: talleres, quién paga, ingreso mensual estimado, uso de la IA y activación manual |

### Funciones de la app

- **Órdenes de trabajo** en un tablero por etapas. Al pasar a reparación se descuentan las refacciones; si falta stock, la orden pasa a "Esperando refacciones".
- **Inventario** con stock reservado, disponible, en camino y ubicación en el estante.
- **Compras sugeridas** por proveedor. Al recibirlas se actualiza el stock y se avisa qué órdenes pueden seguir.
- **Planificación**: bahías, carga de cada mecánico, cola por prioridad y auto-asignación.
- **Asistente IA** (botón "Asistente", abajo a la derecha). Responde sobre los datos del taller ("¿qué está atrasado?", "¿qué refacciones pido hoy?") y sobre cómo usar Nau. Solo consulta información: no modifica datos.
- **Cuenta**: usuarios del taller (dueño y equipo), suscripción, cambio de plan y cancelación.

### Planes (configurables en `.env`)

| Plan | Usuarios | Bahías | Consultas IA al mes | Precio por defecto (MXN, IVA incluido) |
|---|---|---|---|---|
| Básico | 2 | 3 | 100 | $499 |
| Profesional | 6 | 10 | 400 | $899 |
| Taller+ | 20 | sin límite | 1,500 | $1,599 |

Cada taller nuevo tiene 14 días de prueba con los límites del plan Profesional y 50 consultas de IA. Cuando la prueba o la suscripción vencen, la cuenta queda en **solo lectura**: no se borran datos.

## Ponerlo en marcha en tu computadora

Requiere Node.js 22.5 o superior.

```bash
cd taller
npm install
cp .env.example .env
npm start            # http://localhost:3000
npm test             # pruebas automáticas
```

- Sin `MP_ACCESS_TOKEN`, y fuera de producción, **los pagos se simulan**, así puedes probar todo el recorrido.
- Sin `ANTHROPIC_API_KEY`, el asistente aparece como "no disponible" y el resto funciona igual.

## Asistente de IA

Funciona con Claude (modelo `claude-opus-5-5`) a través de la API de Anthropic.

1. Crea una cuenta en <https://platform.claude.com>, carga saldo y genera una clave en **Settings → API keys**.
2. Ponla en `ANTHROPIC_API_KEY`.
3. Ajusta las consultas por plan con `AI_MESSAGES_*` y `AI_TRIAL_MESSAGES`.

Cómo trabaja:

- En cada consulta, el servidor arma un resumen del taller: órdenes activas, refacciones faltantes y bajo mínimo, compras, carga de mecánicos y bahías. Lo envía junto con unas instrucciones fijas sobre cómo funciona Nau.
- La respuesta aparece en vivo. Si los filtros de seguridad rechazan una consulta, la API la reintenta con otro modelo (*fallback* del servidor de Anthropic).
- Las instrucciones y la conversación se **cachean**: dentro de una misma conversación, las preguntas siguientes cuestan bastante menos que la primera.
- El esfuerzo de razonamiento va en `low` (rápido y económico). Súbelo a `medium` con `AI_EFFORT` si las respuestas se quedan cortas.
- Cada taller tiene un tope mensual de consultas y cada usuario un máximo por minuto. En `/admin.html` ves cuántas consultas usó cada taller en el mes, y en la base (`ai_usage`) los tokens consumidos.

**Costo estimado.** Calculado con los precios públicos del modelo (USD 4 por millón de tokens de entrada y USD 20 por millón de salida), una consulta de un taller pequeño debería costar entre USD 0.01 y 0.04. Las preguntas siguientes de la misma conversación cuestan menos por la caché. Es una estimación: mídelo con tu uso real antes de fijar precios definitivos. Si un taller del plan Profesional usara las 400 consultas, el costo rondaría USD 4–16 al mes.

## Cobrar con Mercado Pago (México)

1. Entra a <https://www.mercadopago.com.mx/developers/panel/app> y crea una aplicación (tipo "Pagos online", producto "Suscripciones").
2. En **Credenciales de producción**, copia el *Access Token* en `MP_ACCESS_TOKEN`. Para ensayar, usa las credenciales y [cuentas de prueba](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/test/accounts).
3. En **Webhooks**, configura la URL `https://TU-DOMINIO/api/webhooks/mercadopago`, marca los eventos de **Planes y suscripciones** (`subscription_preapproval` y `subscription_authorized_payment`) y copia la *clave secreta* en `MP_WEBHOOK_SECRET`.
4. Deja `CURRENCY=MXN` y ajusta los precios `PRICE_*`.

Cómo funciona el cobro:

- El dueño del taller elige un plan y lo llevamos a Mercado Pago para autorizar el cobro mensual. El email que indica debe ser el de su cuenta de Mercado Pago.
- Mercado Pago avisa por webhook, que se valida con firma, y la cuenta se activa. También se sincroniza al volver a la app.
- Si un cobro falla y Mercado Pago pausa la suscripción, el taller tiene `GRACE_DAYS` días para regularizar.
- Cambiar de plan modifica el importe de la misma suscripción. Si el dueño cancela, se cancela en Mercado Pago y conserva el acceso hasta el fin del período pagado.
- Si un cliente te paga por transferencia (SPEI), actívalo desde `/admin.html` por los días que corresponda. Tu email debe estar en `ADMIN_EMAILS`.

## Publicarlo en internet

Cualquier servicio que ejecute Docker o Node sirve (Railway, Render, Fly.io, un VPS). Lo importante:

- `NODE_ENV=production` y `APP_URL` con tu dominio en **https**. Las cookies se marcan `Secure` automáticamente.
- Un **disco persistente** montado en `DATA_DIR`, donde vive la base SQLite `nau.db`. Haz copias de ese archivo con regularidad.

```bash
docker build -t nau .
docker run -d -p 3000:3000 -v nau-data:/data --env-file .env nau
```

## Antes de vender en México: pendientes que no son de código

- **Alta en el SAT** con RFC y un régimen que permita facturar (por ejemplo, RESICO o actividad empresarial). Confírmalo con tu contador.
- **Facturas CFDI 4.0**: muchos talleres te pedirán factura de la suscripción. Mercado Pago cobra, pero no factura por ti. Puedes emitirlas desde el portal del SAT o con un PAC (Facturama, Facturapi, etc.). Los precios por defecto se plantean con IVA incluido.
- **Aviso de privacidad y términos y condiciones**, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Vas a guardar datos de clientes de los talleres y los envías a un proveedor de IA (Anthropic) para responder consultas: menciónalo en el aviso.
- **Correo saliente**: no hay envío de emails. Para recuperar una contraseña, el dueño la cambia desde Ajustes; si el dueño la olvida, cámbiala tú.

## Detalles técnicos

- `server/`: servidor HTTP con Node (`node:http`, `node:sqlite`, `node:crypto`). La única dependencia es el SDK oficial de Anthropic (`@anthropic-ai/sdk`).
  - Contraseñas con scrypt, sesiones con cookie HttpOnly, protección CSRF por encabezado y límite de intentos de acceso.
  - Cada taller tiene sus datos separados y el servidor aplica los límites de cada plan.
  - El asistente está en `server/assistant.js`: instrucciones, resumen de datos y transmisión de la respuesta (SSE).
- Los datos de cada taller se guardan como un documento con número de versión. Si dos personas guardan a la vez, la segunda recibe la versión más reciente y debe repetir su último cambio. La app consulta cambios cada 15 segundos.
- `test/`: pruebas del API, del flujo de suscripción contra un Mercado Pago simulado y del asistente contra una API de Anthropic simulada.

# TallerFlow

SaaS de gestión logística para talleres mecánicos: órdenes de trabajo, repuestos, compras a proveedores y planificación de mecánicos y bahías. Se cobra como suscripción mensual con Mercado Pago.

## Qué incluye

| Parte | Ruta | Para qué |
|---|---|---|
| Web de ventas | `/` | Funciones, precios (salen de la configuración), preguntas frecuentes y botón de prueba gratis |
| Demo | `/demo/` | La app con datos de ejemplo guardados en el navegador, sin registrarse |
| Registro / acceso | `/cuenta.html` | Crear un taller (prueba gratis) o iniciar sesión |
| App | `/app/` | La herramienta del taller, con los datos en el servidor y compartidos por todo el equipo |
| Administración | `/admin.html` | Para ti: lista de talleres, quién paga, ingreso mensual estimado y activación manual |

### Funciones de la app

- **Órdenes de trabajo** en un tablero por etapas. Al pasar a reparación se descuentan los repuestos; si falta stock, la orden pasa a "Esperando repuestos".
- **Inventario** con stock reservado, disponible, en camino y ubicación en el estante.
- **Compras sugeridas** por proveedor. Al recibirlas se actualiza el stock y se avisa qué órdenes pueden seguir.
- **Planificación**: bahías, carga de cada mecánico, cola por prioridad y auto-asignación.
- **Cuenta**: usuarios del taller (dueño y equipo), suscripción, cambio de plan y cancelación.

### Planes (configurables en `.env`)

| Plan | Usuarios | Bahías | Precio por defecto |
|---|---|---|---|
| Básico | 2 | 3 | 29.000 |
| Profesional | 6 | 10 | 49.000 |
| Taller+ | 20 | sin límite | 89.000 |

Cada taller nuevo tiene 14 días de prueba con los límites del plan Profesional. Cuando la prueba o la suscripción vencen, la cuenta queda en **solo lectura**: no se borran datos.

## Ponerlo en marcha en tu computadora

Requiere Node.js 22.5 o superior. No hay dependencias que instalar.

```bash
cd taller
cp .env.example .env
npm start            # http://localhost:3000
npm test             # pruebas automáticas
```

Sin `MP_ACCESS_TOKEN`, y fuera de producción, **los pagos se simulan**, así puedes probar todo el recorrido.

## Cobrar con Mercado Pago

1. Entra a <https://www.mercadopago.com/developers/panel/app> y crea una aplicación (tipo "Pagos online", producto "Suscripciones").
2. En **Credenciales de producción**, copia el *Access Token* en `MP_ACCESS_TOKEN`. Para ensayar, usa las credenciales de prueba y [usuarios de prueba](https://www.mercadopago.com/developers/es/docs/your-integrations/test/accounts).
3. En **Webhooks**, configura la URL `https://TU-DOMINIO/api/webhooks/mercadopago`, marca los eventos **Planes y suscripciones** (`subscription_preapproval` y `subscription_authorized_payment`) y copia la *clave secreta* en `MP_WEBHOOK_SECRET`.
4. Pon en `CURRENCY` la moneda de tu cuenta (ARS, MXN, CLP, COP, PEN, UYU o BRL) y ajusta los precios `PRICE_*`.

Cómo funciona el cobro:

- El dueño del taller elige un plan y lo llevamos a Mercado Pago para autorizar el cobro mensual. El email que indica debe ser el de su cuenta de Mercado Pago.
- Mercado Pago avisa por webhook, que se valida con firma, y la cuenta se activa. También se sincroniza al volver a la app.
- Si un cobro falla y Mercado Pago pausa la suscripción, el taller tiene `GRACE_DAYS` días para regularizar.
- Cambiar de plan modifica el importe de la misma suscripción. Si el dueño cancela, se cancela en Mercado Pago y conserva el acceso hasta el fin del período pagado.
- Si un cliente te paga por transferencia, actívalo desde `/admin.html` por la cantidad de días que corresponda. Tu email debe estar en `ADMIN_EMAILS`.

## Publicarlo en internet

Cualquier servicio que ejecute Docker o Node sirve (Railway, Render, Fly.io, un VPS). Lo importante:

- `NODE_ENV=production` y `APP_URL` con tu dominio en **https**. Las cookies se marcan `Secure` automáticamente.
- Un **disco persistente** montado en `DATA_DIR`, donde vive la base SQLite `tallerflow.db`. Haz copias de ese archivo con regularidad.

```bash
docker build -t tallerflow .
docker run -d -p 3000:3000 -v tallerflow-data:/data --env-file .env tallerflow
```

## Antes de vender: pendientes que no son de código

- **Términos y condiciones y política de privacidad**: vas a guardar datos de clientes de los talleres; redáctalos con asesoría legal de tu país y enlázalos en el pie de la web.
- **Facturación fiscal**: Mercado Pago cobra, pero no emite tus facturas (por ejemplo, la factura electrónica de AFIP/ARCA en Argentina o el CFDI en México).
- **Correo saliente**: no hay envío de emails. Para recuperar una contraseña, el dueño la cambia desde Ajustes; si el dueño la olvida, cámbiala tú.

## Detalles técnicos

- `server/`: servidor HTTP con Node (`node:http`, `node:sqlite`, `node:crypto`), sin dependencias externas.
  - Contraseñas con scrypt, sesiones con cookie HttpOnly, protección CSRF por encabezado y límite de intentos de acceso.
  - Cada taller tiene sus datos separados y el servidor aplica los límites de cada plan.
- Los datos de cada taller se guardan como un documento con número de versión. Si dos personas guardan a la vez, la segunda recibe la versión más reciente y debe repetir su último cambio. La app consulta cambios cada 15 segundos.
- `test/`: pruebas del API y del flujo completo de suscripción contra un Mercado Pago simulado.

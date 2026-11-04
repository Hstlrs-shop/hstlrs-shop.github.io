/**
 * Configuración de la tienda HSTLRS.
 * Cambia estos valores para adaptar la tienda a tu negocio de dropshipping.
 */
window.STORE_CONFIG = {
  name: "HSTLRS",
  currency: "EUR",            // EUR, USD, MXN, COP, ARS...
  locale: "es-ES",
  contactEmail: "hola@hstlrs.com",
  whatsapp: "34600000000",    // Número con prefijo de país, sin "+" ni espacios

  shipping: {
    cost: 4.95,               // Coste del envío estándar
    freeFrom: 50,             // Envío gratis a partir de este importe
    processingDays: [1, 3],   // Días que tarda el proveedor en preparar el pedido
    deliveryDays: [5, 10],    // Días de tránsito del envío
  },

  // Códigos de descuento: tipo "percent" (porcentaje) o "fixed" (importe fijo)
  coupons: {
    HSTLR10: { type: "percent", value: 10, label: "10% de bienvenida" },
    DROP5:   { type: "fixed",   value: 5,  label: "5 € de descuento", minSubtotal: 40 },
  },

  /**
   * Cómo se procesa el pago:
   *  - "whatsapp": envía el resumen del pedido por WhatsApp (ideal para empezar).
   *  - "email":    abre el cliente de correo con el resumen del pedido.
   *  - "shopify":  redirige al checkout de Shopify (rellena shopifyDomain y
   *                el campo shopifyVariantId de cada producto en products.js).
   */
  checkoutMode: "whatsapp",
  shopifyDomain: "",          // p. ej. "hstlrs.myshopify.com"
};

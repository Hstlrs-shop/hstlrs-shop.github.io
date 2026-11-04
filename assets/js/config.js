/**
 * Configuración de la tienda HSTLRS.
 * Cambia estos valores para adaptar la tienda a tu negocio de dropshipping.
 */
window.STORE_CONFIG = {
  name: "HSTLRS",
  currency: "MXN",            // Debe coincidir con la moneda de tu tienda Shopify
  locale: "es-MX",
  contactEmail: "hola@hstlrs.com",
  whatsapp: "520000000000",    // Número con prefijo de país, sin "+" ni espacios

  shipping: {
    cost: 149,                // Coste del envío estándar
    freeFrom: 999,            // Envío gratis a partir de este importe
    processingDays: [1, 3],   // Días que tarda el proveedor en preparar el pedido
    deliveryDays: [5, 10],    // Días de tránsito del envío
  },

  // Códigos de descuento. En modo "shopify" el código también debe existir en
  // Shopify (Descuentos), que es quien lo aplica de verdad al cobrar.
  // tipo "percent" (porcentaje) o "fixed" (importe fijo)
  coupons: {
    HSTLR10: { type: "percent", value: 10, label: "10% de bienvenida" },
  },

  /**
   * Cómo se procesa el pago:
   *  - "whatsapp": envía el resumen del pedido por WhatsApp (ideal para empezar).
   *  - "email":    abre el cliente de correo con el resumen del pedido.
   *  - "shopify":  redirige al checkout de Shopify (rellena shopifyDomain y
   *                el campo shopifyVariants de cada producto en products.js).
   */
  checkoutMode: "shopify",
  shopifyDomain: "0n1xxz-jc.myshopify.com",
};

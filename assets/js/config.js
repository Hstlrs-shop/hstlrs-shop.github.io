/**
 * Configuración de la tienda HSTLRS.
 * Cambia estos valores para adaptar la tienda a tu negocio de dropshipping.
 */
window.STORE_CONFIG = {
  name: "HSTLRS",
  currency: "MXN",            // Debe coincidir con la moneda de tu tienda Shopify
  locale: "es-MX",
  contactEmail: "fragaaitss@icloud.com",
  whatsapp: "520000000000",  // Tu WhatsApp: 52 + 10 dígitos. Mientras sea 52000... el botón flotante no aparece

  shipping: {
    cost: 150,                // Igual que la tarifa "Estándar" de Shopify
    freeFrom: 1050,           // Igual que el envío gratis configurado en Shopify
    processingDays: [2, 5],   // Producción bajo pedido en Printful (impresión/bordado)
    deliveryDays: [3, 10],    // Tránsito dentro de México (confírmalo con tus pedidos de prueba)
  },

  // Códigos de descuento. En modo "shopify" el código también debe existir en
  // Shopify (Descuentos), que es quien lo aplica de verdad al cobrar.
  // tipo "percent" (porcentaje) o "fixed" (importe fijo)
  coupons: {
    HSTLR10: { type: "percent", value: 10, label: "10% de bienvenida" },
  },

  // Descuento automático por cantidad. Debe coincidir con el descuento automático
  // "Lleva 3 o más: 15% de descuento" creado en Shopify (no se combina con cupones).
  multiBuy: { minQty: 3, percent: 15 },

  /**
   * Cómo se procesa el pago:
   *  - "whatsapp": envía el resumen del pedido por WhatsApp (ideal para empezar).
   *  - "email":    abre el cliente de correo con el resumen del pedido.
   *  - "shopify":  redirige al checkout de Shopify (rellena shopifyDomain y
   *                el campo shopifyVariants de cada producto en products.js).
   */
  checkoutMode: "shopify",
  shopifyDomain: "hsltrs.myshopify.com",
};

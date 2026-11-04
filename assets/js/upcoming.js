/**
 * Drop 01 — Próximamente.
 * Playeras propias de HSTLRS que están en borrador en Shopify (sin fotos ni precio final).
 * Se muestran como anticipo. Cuando estén listas: actívalas en Shopify, copia los IDs
 * de sus variantes y muévelas a products.js para que se puedan comprar.
 *
 *  - image: pon aquí la foto real cuando la tengas (si no, se dibuja una ilustración).
 */
window.UPCOMING = [
  {
    id: "core-01-negra-relieve",
    name: "CORE 01 — Negra relieve",
    line: "CORE",
    color: { name: "Negro", hex: "#111114" },
    teaser: "La base de todo, en negro. HSTLRS en relieve tono sobre tono en la manga.",
  },
  {
    id: "core-02-deslavada-monograma",
    name: "CORE 02 — Deslavada monograma",
    line: "CORE",
    color: { name: "Gris carbón", hex: "#4a4b4f" },
    teaser: "Gris carbón con lavado vintage y monograma bordado en el pecho.",
  },
  {
    id: "core-03-hueso-etiqueta",
    name: "CORE 03 — Hueso etiqueta",
    line: "CORE",
    color: { name: "Hueso", hex: "#ece5d6" },
    teaser: "Lo esencial, en hueso. Etiqueta tejida negra en el costado.",
  },
  {
    id: "studio-01-acueducto",
    name: "STUDIO 01 — Acueducto",
    line: "STUDIO",
    color: { name: "Negro", hex: "#111114" },
    teaser: "Un acueducto de piedra trazado como plano de arquitecto, bajo un sol rojo.",
    featured: true,
  },
  {
    id: "studio-02-beyond-borders",
    name: "STUDIO 02 — Beyond Borders",
    line: "STUDIO",
    color: { name: "Negro", hex: "#111114" },
    teaser: "Un globo de líneas finas y una ruta en rojo de México a España.",
  },
  {
    id: "studio-03-the-climb",
    name: "STUDIO 03 — The Climb",
    line: "STUDIO",
    color: { name: "Hueso", hex: "#ece5d6" },
    teaser: "Una cordillera dibujada a línea fina. Nadie sube por ti.",
  },
];
window.UPCOMING_PRICE_FROM = 799;

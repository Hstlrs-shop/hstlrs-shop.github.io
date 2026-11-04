/**
 * Drop 01 — Próximamente.
 * Playeras propias de HSTLRS. Las 6 primeras existen en Shopify como borrador;
 * las 3 últimas son diseños nuevos que aún no están en Shopify.
 * Cuando estén listas: actívalas en Shopify, copia los IDs de sus variantes
 * y muévelas a products.js para que se puedan comprar.
 */
window.UPCOMING = [
  {
    id: "core-01-negra-relieve",
    name: "CORE 01 — Negra relieve",
    line: "CORE",
    color: { name: "Negro", hex: "#111114" },
    image: "assets/img/drop/core-01-negra-relieve.jpg",
    teaser: "La base de todo, en negro. HSTLRS en relieve tono sobre tono en la manga.",
  },
  {
    id: "core-02-deslavada-monograma",
    name: "CORE 02 — Deslavada monograma",
    line: "CORE",
    color: { name: "Gris carbón", hex: "#4a4b4f" },
    image: "assets/img/drop/core-02-deslavada-monograma.jpg",
    teaser: "Gris carbón con lavado vintage y monograma bordado en el pecho.",
  },
  {
    id: "core-03-hueso-etiqueta",
    name: "CORE 03 — Hueso etiqueta",
    line: "CORE",
    color: { name: "Hueso", hex: "#ece5d6" },
    image: "assets/img/drop/core-03-hueso-etiqueta.jpg",
    teaser: "Lo esencial, en hueso. Etiqueta tejida negra en el costado.",
  },
  {
    id: "studio-01-acueducto",
    name: "STUDIO 01 — Acueducto",
    line: "STUDIO",
    color: { name: "Negro", hex: "#111114" },
    image: "assets/img/drop/studio-01-acueducto.jpg",
    teaser: "Un acueducto de piedra trazado como plano de arquitecto, bajo un sol rojo.",
    featured: true,
  },
  {
    id: "studio-02-beyond-borders",
    name: "STUDIO 02 — Beyond Borders",
    line: "STUDIO",
    color: { name: "Negro", hex: "#111114" },
    image: "assets/img/drop/studio-02-beyond-borders.jpg",
    teaser: "Un globo de líneas finas y una ruta en rojo de México a España.",
  },
  {
    id: "studio-03-the-climb",
    name: "STUDIO 03 — The Climb",
    line: "STUDIO",
    color: { name: "Hueso", hex: "#ece5d6" },
    image: "assets/img/drop/studio-03-the-climb.jpg",
    teaser: "Una cordillera dibujada a línea fina. Nadie sube por ti.",
  },
  {
    id: "follow-the-unknown",
    name: "Follow the Unknown",
    line: "STUDIO · NUEVO",
    color: { name: "Carbón deslavado", hex: "#3a3a3c" },
    image: "assets/img/drop/follow-the-unknown.jpg",
    teaser: "Costa en relieve topográfico sobre carbón deslavado.",
  },
  {
    id: "hecho-a-pulso",
    name: "Hecho a pulso",
    line: "STUDIO · NUEVO",
    color: { name: "Arena", hex: "#d9c9ae" },
    image: "assets/img/drop/hecho-a-pulso.jpg",
    teaser: "El trazo de una ciudad construida a mano, en arena deslavada.",
  },
  {
    id: "tu-ritmo-tu-camino",
    name: "Tu ritmo, tu camino",
    line: "STUDIO · NUEVO",
    color: { name: "Carbón deslavado", hex: "#3a3a3c" },
    image: "assets/img/drop/tu-ritmo-tu-camino.jpg",
    teaser: "Un arco y una escalera que solo sube quien la camina.",
  },
];
window.UPCOMING_PRICE_FROM = 799;

// Fotos de la colección completa (galería bajo el Drop 01)
window.LOOKBOOK = [
  { src: "assets/img/drop/lookbook-1.jpg", alt: "Colección CORE: negra relieve, deslavada monograma y hueso etiqueta" },
  { src: "assets/img/drop/lookbook-2.jpg", alt: "Colección STUDIO: Built by Hand, Acueducto y Your Pace" },
  { src: "assets/img/drop/lookbook-3.jpg", alt: "Colección STUDIO: The Climb, Beyond Borders y Follow the Unknown" },
  { src: "assets/img/drop/lookbook-4.jpg", alt: "Colección STUDIO: Hecho a pulso, Acueducto y Tu ritmo tu camino" },
];

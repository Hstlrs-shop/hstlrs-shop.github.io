/**
 * Catálogo HSTLRS.
 *
 * Cada producto:
 *  - published: true cuando el producto está ACTIVO en Shopify y se puede comprar.
 *               Mientras sea false, la web muestra "Avísame" en lugar de "Agregar al carrito".
 *  - shopify:   { "Talla" o "Talla/Color": idDeVarianteShopify } para mandar el carrito al checkout.
 *  - sizePrice: precio distinto para alguna talla (p. ej. 2XL).
 *  - colors[].image: foto principal de ese color.
 *
 * Para lanzar un producto: actívalo en Shopify, rellena "shopify" y pon published: true.
 */
(() => {
  const D = "assets/img/drop/";
  const C = "assets/img/concept/";
  const A = "assets/img/arte/";
  const TEE_SIZES = ["S", "M", "L", "XL", "2XL"];
  const teeDetails = [
    "Playera oversize de algodón pesado, hombro caído",
    "Cuello acanalado reforzado",
    "Hecha bajo pedido para ti",
    "Lavar en frío del revés, no usar secadora",
  ];
  const variants = (ids) => Object.fromEntries(TEE_SIZES.map((s, i) => [s, ids[i]]));

  window.CATALOG = [
    // ---------- CORE ----------
    {
      id: "core-01-negra-relieve", name: "CORE 01 — Negra relieve", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Drop 01",
      colors: [{ name: "Negro", hex: "#141414", image: D + "core-01-negra-relieve.jpg" }],
      gallery: [D + "lookbook-1.jpg"], sizes: TEE_SIZES,
      description: "Hecho a pulso. La base de todo, en negro: HSTLRS discreto al frente y el nombre tono sobre tono a lo largo de la manga. Corte oversize, hombro caído. Sin ruido: se nota de cerca.",
      details: teeDetails, published: true,
      shopify: variants([67954952110353, 67954952143121, 67954952175889, 67954952208657, 67954952241425]),
    },
    {
      id: "core-02-deslavada-monograma", name: "CORE 02 — Deslavada monograma", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Drop 01",
      colors: [{ name: "Carbón deslavado", hex: "#3c3b3a", image: D + "core-02-deslavada-monograma.jpg" }],
      gallery: [D + "lookbook-1.jpg"], sizes: TEE_SIZES,
      description: "El desgaste que no se finge. Gris carbón con lavado vintage y el monograma HR bordado tono sobre tono en el pecho.",
      details: ["Monograma bordado", ...teeDetails], published: true,
      shopify: variants([67954952339729, 67954952372497, 67954952405265, 67954952438033, 67954952470801]),
    },
    {
      id: "core-03-hueso-etiqueta", name: "CORE 03 — Hueso etiqueta", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Drop 01",
      colors: [{ name: "Hueso", hex: "#e9e1d1", image: D + "core-03-hueso-etiqueta.jpg" }],
      gallery: [D + "lookbook-1.jpg"], sizes: TEE_SIZES,
      description: "Lo esencial, en hueso. HSTLRS discreto al frente y etiqueta en el costado. La pieza que combina con todo tu clóset.",
      details: teeDetails, published: true,
      shopify: variants([67954952536337, 67954952569105, 67954952601873, 67954952634641, 67954952667409]),
    },
    {
      id: "pack-core-x3", name: "Pack CORE ×3", collection: "CORE", category: "packs",
      price: 1999, compareAt: 2397, badge: "Ahorra $398",
      colors: [{ name: "Negro + carbón + hueso", hex: "#6b6560", image: D + "lookbook-1.jpg" }],
      gallery: [D + "core-01-negra-relieve.jpg", D + "core-02-deslavada-monograma.jpg", D + "core-03-hueso-etiqueta.jpg"],
      sizes: TEE_SIZES,
      description: "Las tres CORE en tu talla: negra relieve, deslavada monograma y hueso etiqueta. El pack más pedido en playeras es el de tres, y aquí te ahorras casi una playera.",
      details: ["3 playeras CORE de la misma talla", ...teeDetails], published: false, shopify: null,
    },

    // ---------- STUDIO ----------
    {
      id: "studio-01-acueducto", name: "STUDIO 01 — Acueducto", collection: "STUDIO", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Pieza insignia", featured: true,
      colors: [{ name: "Negro", hex: "#141414", image: D + "studio-01-acueducto.jpg" }],
      gallery: [D + "studio-01-acueducto-alt.jpg", D + "lookbook-2.jpg"], sizes: TEE_SIZES,
      description: "Lo que se construye a pulso, dura siglos. Playera negra con HSTLRS discreto al frente y, en la espalda, un acueducto de piedra trazado como plano de arquitecto bajo un sol rojo.",
      details: ["Gráfico de gran formato en la espalda", ...teeDetails], published: false,
      shopify: variants([67954952765713, 67954952798481, 67954952831249, 67954952864017, 67954952896785]),
    },
    {
      id: "studio-02-beyond-borders", name: "STUDIO 02 — Beyond Borders", collection: "STUDIO", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Drop 01",
      colors: [{ name: "Negro", hex: "#141414", image: D + "studio-02-beyond-borders.jpg" }],
      gallery: [D + "lookbook-3.jpg"], sizes: TEE_SIZES,
      description: "Beyond borders. Un globo de líneas finas y una ruta en rojo de México a España, en la espalda.",
      details: ["Gráfico de gran formato en la espalda", ...teeDetails], published: false,
      shopify: variants([67954961416465, 67954961449233, 67954961482001, 67954961514769, 67954961547537]),
    },
    {
      id: "studio-03-the-climb", name: "STUDIO 03 — The Climb", collection: "STUDIO", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Drop 01",
      colors: [{ name: "Hueso", hex: "#e9e1d1", image: D + "studio-03-the-climb.jpg" }],
      gallery: [D + "lookbook-3.jpg"], sizes: TEE_SIZES,
      description: "The climb is yours. Una cordillera dibujada a línea fina en la espalda. Nadie sube por ti.",
      details: ["Gráfico de gran formato en la espalda", ...teeDetails], published: false,
      shopify: variants([67954963972369, 67954964005137, 67954964037905, 67954964070673, 67954964103441]),
    },
    {
      id: "follow-the-unknown", name: "Follow the Unknown", collection: "STUDIO", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Nuevo",
      colors: [{ name: "Carbón deslavado", hex: "#3c3b3a", image: D + "follow-the-unknown.jpg" }],
      gallery: [D + "lookbook-3.jpg"], sizes: TEE_SIZES,
      description: "Una costa en relieve topográfico sobre carbón deslavado. Para los que eligen el camino sin mapa.",
      details: ["Gráfico de gran formato en la espalda", ...teeDetails], published: false, shopify: null,
    },
    {
      id: "hecho-a-pulso", name: "Hecho a pulso", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Arena deslavada", hex: "#d6c6a9", image: D + "hecho-a-pulso.jpg" }],
      gallery: [D + "lookbook-4.jpg"], sizes: TEE_SIZES,
      description: "El trazo de una ciudad construida a mano, con HSTLRS en tipografía condensada a lo grande. La declaración de la marca, en la espalda.",
      details: ["Gráfico de espalda completa", ...teeDetails], published: false, shopify: null,
    },
    {
      id: "tu-ritmo-tu-camino", name: "Tu ritmo, tu camino", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Carbón deslavado", hex: "#3c3b3a", image: D + "tu-ritmo-tu-camino.jpg" }],
      gallery: [D + "lookbook-4.jpg"], sizes: TEE_SIZES,
      description: "Un arco y una escalera que solo sube quien la camina. Tu ritmo, tu camino.",
      details: ["Gráfico de espalda completa", ...teeDetails], published: false, shopify: null,
    },

    // ---------- ESSENTIALS (nuevos) ----------
    {
      id: "hoodie-heavyweight", name: "Hoodie Heavyweight HSTLRS", collection: "ESSENTIALS", category: "sudaderas",
      price: 1299, badge: "Temporada", featured: true,
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: C + "hoodie-negro.jpg" },
        { name: "Carbón", hex: "#4a4846", image: C + "hoodie-carbon.jpg" },
        { name: "Hueso", hex: "#e7ddcb", image: C + "hoodie-hueso.jpg" },
      ],
      sizes: TEE_SIZES,
      description: "Sudadera con capucha de felpa gruesa, corte relajado y logotipo HSTLRS al frente. La pieza que más se busca de agosto a febrero.",
      details: ["Felpa pesada, interior cepillado", "Bolsillo canguro y capucha doble", "Logo bordado al frente", "Hecha bajo pedido para ti"],
      published: false, shopify: null,
    },
    {
      id: "crewneck-monograma", name: "Crewneck Monograma HR", collection: "ESSENTIALS", category: "sudaderas",
      price: 1099, badge: "Nuevo",
      colors: [
        { name: "Hueso", hex: "#e7ddcb", image: C + "crewneck-hueso.jpg" },
        { name: "Carbón", hex: "#4a4846", image: C + "crewneck-carbon.jpg" },
      ],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el monograma HR bordado tono sobre tono. Discreta, pesada y fácil de combinar.",
      details: ["Felpa pesada", "Monograma bordado en el pecho", "Puños y dobladillo acanalados", "Hecha bajo pedido para ti"],
      published: false, shopify: null,
    },
    {
      id: "jogger-fleece", name: "Jogger Fleece HSTLRS", collection: "ESSENTIALS", category: "pantalones",
      price: 999,
      colors: [
        { name: "Carbón", hex: "#3d3c3a", image: C + "jogger-carbon.jpg" },
        { name: "Negro", hex: "#1d1c1b", image: C + "jogger-negro.jpg" },
      ],
      sizes: ["S", "M", "L", "XL"],
      description: "Jogger de felpa con cintura elástica y cordón, a juego con el hoodie. Para el día a día y para el viaje.",
      details: ["Felpa pesada", "Bolsillos laterales", "Puños elásticos", "Hecho bajo pedido para ti"],
      published: false, shopify: null,
    },
    {
      id: "dad-hat", name: "Gorra Dad Hat HSTLRS", collection: "ESSENTIALS", category: "gorras",
      price: 499, badge: "Tendencia", featured: true,
      colors: [
        { name: "Café", hex: "#5b4637", image: C + "gorra-cafe.jpg" },
        { name: "Arena", hex: "#cdbb9c", image: C + "gorra-arena.jpg" },
        { name: "Negro", hex: "#1d1c1b", image: C + "gorra-negra.jpg" },
      ],
      sizes: ["Única"],
      description: "Gorra sin estructura de perfil bajo, en colores tierra, con HSTLRS bordado. El estilo de gorra que más se está usando este año.",
      details: ["Algodón lavado", "Sin estructura, perfil bajo", "Cierre ajustable", "Bordado al frente"],
      published: false, shopify: null,
    },
    {
      id: "beanie-hstlrs", name: "Beanie HSTLRS", collection: "ESSENTIALS", category: "gorras",
      price: 399, badge: "Temporada",
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: C + "beanie-negro.jpg" },
        { name: "Café", hex: "#5b4637", image: C + "beanie-cafe.jpg" },
      ],
      sizes: ["Única"],
      description: "Gorro de punto acanalado con doblez y etiqueta HSTLRS. Para las mañanas frías.",
      details: ["Punto acanalado doble", "Etiqueta al frente", "Talla única"],
      published: false, shopify: null,
    },
    {
      id: "tote-acueducto", name: "Tote Bag Acueducto", collection: "STUDIO", category: "accesorios",
      price: 449,
      colors: [{ name: "Crudo", hex: "#e9dfcc", image: C + "tote-crudo.jpg" }],
      sizes: ["Única"],
      description: "Bolsa de lona gruesa con el acueducto y el sol rojo de STUDIO. Cabe la laptop, el gym y el súper.",
      details: ["Lona de algodón gruesa", "Asas largas para el hombro", "Estampado al frente"],
      published: false, shopify: null,
    },

    // ---------- ARTE ----------
    {
      id: "lamina-acueducto", name: "Lámina STUDIO — Acueducto", collection: "STUDIO", category: "arte",
      price: 349, badge: "Arte",
      colors: [{ name: "Sin marco", hex: "#f3efe6", image: A + "lamina-acueducto.jpg" }],
      sizes: ["30 × 40 cm", "45 × 60 cm"], sizePrice: { "45 × 60 cm": 549 },
      description: "El arte de STUDIO 01 para tu pared. Impresión en papel mate grueso.",
      details: ["Papel mate de alto gramaje", "Marco no incluido", "Envío en tubo protector"],
      published: false, shopify: null,
    },
    {
      id: "lamina-beyond-borders", name: "Lámina STUDIO — Beyond Borders", collection: "STUDIO", category: "arte",
      price: 349, badge: "Arte",
      colors: [{ name: "Sin marco", hex: "#f3efe6", image: A + "lamina-beyond-borders.jpg" }],
      sizes: ["30 × 40 cm", "45 × 60 cm"], sizePrice: { "45 × 60 cm": 549 },
      description: "La ruta de México a España, en lámina. Impresión en papel mate grueso.",
      details: ["Papel mate de alto gramaje", "Marco no incluido", "Envío en tubo protector"],
      published: false, shopify: null,
    },
    {
      id: "lamina-the-climb", name: "Lámina STUDIO — The Climb", collection: "STUDIO", category: "arte",
      price: 349, badge: "Arte",
      colors: [{ name: "Sin marco", hex: "#f3efe6", image: A + "lamina-the-climb.jpg" }],
      sizes: ["30 × 40 cm", "45 × 60 cm"], sizePrice: { "45 × 60 cm": 549 },
      description: "La cordillera de STUDIO 03, en lámina. Impresión en papel mate grueso.",
      details: ["Papel mate de alto gramaje", "Marco no incluido", "Envío en tubo protector"],
      published: false, shopify: null,
    },
  ];

  window.CATEGORIES = [
    { id: "playeras", name: "Playeras", image: D + "studio-01-acueducto.jpg" },
    { id: "sudaderas", name: "Sudaderas", image: C + "hoodie-negro.jpg" },
    { id: "gorras", name: "Gorras", image: C + "gorra-cafe.jpg" },
    { id: "arte", name: "Arte", image: A + "lamina-acueducto.jpg" },
    { id: "packs", name: "Packs", image: D + "lookbook-1.jpg", hidden: true },
    { id: "pantalones", name: "Pantalones", image: C + "jogger-carbon.jpg", hidden: true },
    { id: "accesorios", name: "Accesorios", image: C + "tote-crudo.jpg", hidden: true },
  ];

  window.LOOKBOOK = [
    { src: D + "lookbook-4.jpg", alt: "STUDIO: Hecho a pulso, Acueducto y Tu ritmo tu camino" },
    { src: D + "lookbook-1.jpg", alt: "CORE: negra relieve, deslavada monograma y hueso etiqueta" },
    { src: D + "lookbook-3.jpg", alt: "STUDIO: The Climb, Beyond Borders y Follow the Unknown" },
    { src: D + "lookbook-2.jpg", alt: "STUDIO: Built by Hand, Acueducto y Your Pace" },
  ];
})();

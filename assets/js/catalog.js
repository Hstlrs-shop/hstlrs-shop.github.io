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
  const P = "assets/img/printful/"; // fotos reales del producto (generador de Printful)
  const TEE_SIZES = ["S", "M", "L", "XL", "2XL"];
  const teeDetails = [
    "Playera oversize de algodón pesado, hombro caído",
    "Cuello acanalado reforzado",
    "Hecha bajo pedido para ti",
    "Lavar en frío del revés, no usar secadora",
  ];
  const coreDetails = [
    "Comfort Colors 1717: algodón 100 % pesado, teñido en prenda",
    "Corte relajado: para un look oversize pide una talla más",
    "Hecha bajo pedido para ti",
    "Lavar en frío del revés, no usar secadora",
  ];
  const variants = (ids) => Object.fromEntries(TEE_SIZES.map((s, i) => [s, ids[i]]));

  window.CATALOG = [
    // ---------- CORE ----------
    {
      id: "core-01-negra-relieve", name: "CORE 01 — Negra manga", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Disponible",
      colors: [{ name: "Negro", hex: "#141414", image: P + "core01-front.jpg" }],
      gallery: [P + "core01-manga.jpg"], sizes: TEE_SIZES,
      description: "Hecho a pulso. La base de todo, en negro: HSTLRS discreto al frente y el nombre en vertical, estampado tono sobre tono, a lo largo de la manga izquierda. Sin ruido: se nota de cerca.",
      details: coreDetails, published: true,
      shopify: variants([67954952110353, 67954952143121, 67954952175889, 67954952208657, 67954952241425]),
    },
    {
      id: "core-02-deslavada-monograma", name: "CORE 02 — Deslavada monograma", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Disponible",
      colors: [{ name: "Carbón deslavado", hex: "#3c3b3a", image: P + "core02-front.jpg" }],
      gallery: [P + "core02-back.jpg"], sizes: TEE_SIZES,
      description: "El desgaste que no se finge. Carbón teñido en prenda con aspecto vintage y el monograma HR bordado en gris en el pecho.",
      details: ["Monograma bordado en el pecho izquierdo", ...coreDetails], published: true,
      shopify: variants([67954952339729, 67954952372497, 67954952405265, 67954952438033, 67954952470801]),
    },
    {
      id: "core-03-hueso-etiqueta", name: "CORE 03 — Hueso", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Disponible",
      colors: [{ name: "Hueso", hex: "#e9e1d1", image: P + "core03-front.jpg" }],
      gallery: [P + "core03-back.jpg"], sizes: TEE_SIZES,
      description: "Lo esencial, en hueso. HSTLRS discreto al frente, en negro. La pieza que combina con todo tu clóset.",
      details: coreDetails, published: true,
      shopify: variants([67954952536337, 67954952569105, 67954952601873, 67954952634641, 67954952667409]),
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

    // ---------- ESSENTIALS (Printful, vinculados a Shopify) ----------
    {
      id: "hoodie-heavyweight", name: "Hoodie Heavyweight HSTLRS", collection: "ESSENTIALS", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Temporada", featured: true,
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "hoodie-negro.jpg" },
        { name: "Carbón", hex: "#4a4846", image: P + "hoodie-carbon.jpg" },
        { name: "Hueso", hex: "#e7ddcb", image: P + "hoodie-hueso.jpg" },
      ],
      sizes: TEE_SIZES,
      description: "La sudadera con capucha que vas a usar todo el invierno. Felpa premium, interior cepillado y HSTLRS discreto al frente.",
      details: ["Cotton Heritage M2580: felpa premium 80 % algodón, 20 % poliéster", "Capucha forrada y bolsillo canguro", "Corte unisex regular: para un look oversize pide una talla más", "Hecha bajo pedido para ti"],
      published: false,
      shopify: {
        "S/Negro": 68026208715025, "S/Carbón": 68026208747793, "S/Hueso": 68026208780561,
        "M/Negro": 68026208813329, "M/Carbón": 68026208846097, "M/Hueso": 68026208878865,
        "L/Negro": 68026208911633, "L/Carbón": 68026208944401, "L/Hueso": 68026208977169,
        "XL/Negro": 68026209009937, "XL/Carbón": 68026209042705, "XL/Hueso": 68026209075473,
        "2XL/Negro": 68026209108241, "2XL/Carbón": 68026209141009, "2XL/Hueso": 68026209173777,
      },
    },
    {
      id: "crewneck-monograma", name: "Crewneck Monograma HR", collection: "ESSENTIALS", category: "sudaderas",
      price: 1099, sizePrice: { "2XL": 1149 }, badge: "Nuevo",
      colors: [
        { name: "Hueso", hex: "#e7ddcb", image: P + "crewneck-hueso.jpg" },
        { name: "Carbón", hex: "#4a4846", image: P + "crewneck-carbon.jpg" },
      ],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el monograma HR bordado en el pecho. Discreta, cómoda y fácil de combinar.",
      details: ["Cotton Heritage M2480: felpa premium, interior cepillado", "Monograma HR bordado en el pecho izquierdo", "Puños y dobladillo acanalados", "Hecha bajo pedido para ti"],
      published: false,
      shopify: {
        "S/Hueso": 68026209272081, "S/Carbón": 68026209304849, "M/Hueso": 68026209337617, "M/Carbón": 68026209370385,
        "L/Hueso": 68026209403153, "L/Carbón": 68026209435921, "XL/Hueso": 68026209468689, "XL/Carbón": 68026209501457,
        "2XL/Hueso": 68026209534225, "2XL/Carbón": 68026209566993,
      },
    },
    {
      id: "jogger-fleece", name: "Jogger Fleece HSTLRS", collection: "ESSENTIALS", category: "pantalones",
      price: 1099, sizePrice: { "2XL": 1149 },
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "jogger-negro.jpg" },
        { name: "Carbón", hex: "#3d3c3a", image: P + "jogger-carbon.jpg" },
      ],
      sizes: TEE_SIZES,
      description: "Jogger de felpa con cintura elástica y cordón, a juego con el hoodie. HSTLRS bordado.",
      details: ["Cotton Heritage M7580: felpa premium, interior cepillado", "Bolsillos laterales y puños elásticos", "Logo bordado", "Hecho bajo pedido para ti"],
      published: false,
      shopify: {
        "S/Negro": 68026209632529, "S/Carbón": 68026209665297, "M/Negro": 68026209698065, "M/Carbón": 68026209730833,
        "L/Negro": 68026209763601, "L/Carbón": 68026209796369, "XL/Negro": 68026209829137, "XL/Carbón": 68026209861905,
        "2XL/Negro": 68026209894673, "2XL/Carbón": 68026209927441,
      },
    },
    {
      id: "dad-hat", name: "Gorra Dad Hat HSTLRS", collection: "ESSENTIALS", category: "gorras",
      price: 549, badge: "Tendencia", featured: true,
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "gorra-negro.jpg" },
        { name: "Khaki", hex: "#b9a77f", image: P + "gorra-khaki.jpg" },
        { name: "Piedra", hex: "#d6cdb8", image: P + "gorra-piedra.jpg" },
      ],
      sizes: ["Única"],
      description: "Gorra sin estructura de perfil bajo con HSTLRS bordado al frente. El estilo de gorra que más se usa este año.",
      details: ["Yupoong 6245CM: 100 % algodón sarga", "Sin estructura, visera curva", "Cierre ajustable con hebilla metálica", "Bordado al frente"],
      published: false,
      shopify: { "Única/Negro": 68026209992977, "Única/Khaki": 68026210025745, "Única/Piedra": 68026210058513 },
    },
    {
      id: "beanie-hstlrs", name: "Beanie HSTLRS", collection: "ESSENTIALS", category: "gorras",
      price: 449, badge: "Temporada",
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "beanie-negro.jpg" },
        { name: "Café", hex: "#5b4637", image: P + "beanie-cafe.jpg" },
      ],
      sizes: ["Única"],
      description: "Gorro de punto con doblez y HSTLRS bordado. Para las mañanas frías.",
      details: ["Yupoong 1501KC: acrílico suave, punto acanalado", "Doblez con logo bordado", "Talla única"],
      published: false,
      shopify: { "Única/Negro": 68026210124049, "Única/Café": 68026210156817 },
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

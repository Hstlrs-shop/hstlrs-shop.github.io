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
  const STUDIO_DETAILS = ["Arte original HSTLRS de gran formato en la espalda", ...coreDetails];
  const HOODIE_ART_DETAILS = ["Arte original HSTLRS de gran formato en la espalda", "Cotton Heritage M2580: felpa premium 80 % algodón, 20 % poliéster", "Capucha forrada y bolsillo canguro", "Corte unisex regular: para un look oversize pide una talla más", "Hecha bajo pedido para ti"];
  const CREW_ART_DETAILS = ["Arte de gran formato en la espalda", "Cotton Heritage M2480: felpa premium con interior cepillado", "Cuello, puños y dobladillo acanalados", "Corte unisex regular: para un look oversize pide una talla más", "Hecha bajo pedido para ti"];
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
      price: 849, sizePrice: { "2XL": 899 }, badge: "Pieza insignia", featured: true,
      colors: [{ name: "Negro", hex: "#141414", image: P + "studio01-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Lo que se construye a pulso, dura siglos. Playera negra con un acueducto de piedra trazado como plano de arquitecto bajo un sol rojo, en la espalda.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([67954952765713, 67954952798481, 67954952831249, 67954952864017, 67954952896785]),
    },
    {
      id: "studio-02-beyond-borders", name: "STUDIO 02 — Beyond Borders", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Drop 01",
      colors: [{ name: "Negro", hex: "#141414", image: P + "studio02-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Beyond borders. Un globo terráqueo a línea fina con la ruta México–España trazada en rojo, en la espalda. Para los que no conocen fronteras.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([67954961416465, 67954961449233, 67954961482001, 67954961514769, 67954961547537]),
    },
    {
      id: "studio-03-the-climb", name: "STUDIO 03 — The Climb", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Drop 01",
      colors: [{ name: "Hueso", hex: "#efe6cf", image: P + "studio03-back.jpg" }],
      sizes: TEE_SIZES,
      description: "The climb is yours. Una cordillera dibujada a línea fina sobre playera hueso. Nadie sube por ti.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([67954963972369, 67954964005137, 67954964037905, 67954964070673, 67954964103441]),
    },
    {
      id: "studio-04-topografia", name: "STUDIO 04 — Topografía", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Carbón deslavado", hex: "#3c3b3a", image: P + "studio04-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Un mapa topográfico a línea fina y una ruta en rojo hacia la cumbre, en la espalda. Para los que eligen el camino sin mapa.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026383597841, 68026383630609, 68026383663377, 68026383696145, 68026383728913]),
    },
    {
      id: "studio-05-escalera", name: "STUDIO 05 — Escalera al sol", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#141414", image: P + "studio05-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Un arco de piedra, una escalera que solo sube quien la camina y un sol rojo al final. Tu ritmo, tu camino.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026383859985, 68026383892753, 68026383925521, 68026383958289, 68026383991057]),
    },
    {
      id: "studio-06-ciudad", name: "STUDIO 06 — Ciudad a pulso", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Marfil", hex: "#efe6cf", image: P + "studio06-back.jpg" }],
      sizes: TEE_SIZES,
      description: "El plano de una ciudad construida a mano, en blanco y negro, con un punto rojo donde empezó todo.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026384023825, 68026384056593, 68026384089361, 68026384122129, 68026384154897]),
    },
    {
      id: "hoodie-topografia", name: "Hoodie Topografía", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Carbón", hex: "#4a4846", image: P + "hoodie-topografia-back.jpg" }],
      sizes: TEE_SIZES,
      description: "El mapa topográfico HSTLRS en la espalda de una sudadera con capucha de felpa premium.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: variants([68026384187665, 68026384220433, 68026384253201, 68026384285969, 68026384318737]),
    },
    {
      id: "hoodie-escalera", name: "Hoodie Escalera al sol", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "hoodie-escalera-back.jpg" }],
      sizes: TEE_SIZES,
      description: "El arco, la escalera y el sol rojo en la espalda de una sudadera con capucha negra de felpa premium.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: variants([68026384417041, 68026384449809, 68026384482577, 68026384515345, 68026384548113]),
    },
    {
      id: "hoodie-ciudad", name: "Hoodie Ciudad a pulso", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#e7ddcb", image: P + "hoodie-ciudad-back.jpg" }],
      sizes: TEE_SIZES,
      description: "El plano de la ciudad a pulso en la espalda de una sudadera con capucha color hueso de felpa premium.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: variants([68026385039633, 68026385072401, 68026385105169, 68026385137937, 68026385170705]),
    },

    // ---------- STUDIO · arte realista ----------
    {
      id: "studio-07-ajolote", name: "STUDIO 07 — Ajolote astronauta", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#141414", image: P + "studio07-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Un ajolote mexicano con casco de astronauta flotando entre flores de cempasúchil. Arte realista a todo color en la espalda.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026612351249, 68026612384017, 68026612416785, 68026612449553, 68026612482321]),
    },
    {
      id: "studio-08-jaguar", name: "STUDIO 08 — Jaguar", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#141414", image: P + "studio08-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Un jaguar que emerge del humo y la obsidiana frente a un sol rojo. Arte realista a todo color en la espalda.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026612515089, 68026612547857, 68026612580625, 68026612613393, 68026612646161]),
    },
    {
      id: "studio-09-rinoceronte", name: "STUDIO 09 — Rinoceronte", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#141414", image: P + "studio09-back.jpg" }],
      sizes: TEE_SIZES,
      description: "El rinoceronte de Alberto Durero (grabado de 1515) en trazo crema sobre negro, con el sol rojo HSTLRS.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026612711697, 68026612744465, 68026612777233, 68026612810001, 68026612842769]),
    },
    {
      id: "studio-10-ola", name: "STUDIO 10 — La ola", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Marfil", hex: "#efe6cf", image: P + "studio10-back.jpg" }],
      sizes: TEE_SIZES,
      description: "La gran ola de Hokusai dentro de un círculo, con un sol rojo en lugar del cielo. Grabado clásico, reinterpretado.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026612875537, 68026612908305, 68026612941073, 68026612973841, 68026613006609]),
    },
    {
      id: "studio-11-calavera", name: "STUDIO 11 — Calavera", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Marfil", hex: "#efe6cf", image: P + "studio11-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Una calavera del grabador mexicano José Guadalupe Posada, tallada en madera, con un sol rojo detrás.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026613039377, 68026613072145, 68026613104913, 68026613137681, 68026613170449]),
    },
    {
      id: "studio-12-caballero", name: "STUDIO 12 — El caballero", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Marfil", hex: "#efe6cf", image: P + "studio12-back.jpg" }],
      sizes: TEE_SIZES,
      description: "El caballero, la muerte y el diablo, grabado de Alberto Durero (1513), en arco y con el sol rojo HSTLRS.",
      details: STUDIO_DETAILS, published: true,
      shopify: variants([68026613235985, 68026613268753, 68026613301521, 68026613334289, 68026613367057]),
    },
    {
      id: "hoodie-ajolote", name: "Hoodie Ajolote astronauta", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "hoodie-ajolote-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera con capucha negra con el ajolote astronauta a todo color en la espalda. Felpa premium con interior cepillado.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: variants([68026613399825, 68026613432593, 68026613465361, 68026613498129, 68026613530897]),
    },
    {
      id: "hoodie-jaguar", name: "Hoodie Jaguar", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "hoodie-jaguar-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera con capucha negra con el jaguar de obsidiana y sol rojo en la espalda. Felpa premium con interior cepillado.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: variants([68026613563665, 68026613596433, 68026613629201, 68026613661969, 68026613694737]),
    },
    {
      id: "hoodie-ola", name: "Hoodie La ola", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#e7ddcb", image: P + "hoodie-ola-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera con capucha color hueso con la gran ola y el sol rojo en la espalda. Felpa premium con interior cepillado.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: variants([68026613727505, 68026613760273, 68026613793041, 68026613825809, 68026613858577]),
    },
    {
      id: "crew-rinoceronte", name: "Crewneck Rinoceronte", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "crew-rinoceronte-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo negra con el rinoceronte de Durero y el sol rojo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: variants([68026614907153, 68026614939921, 68026614972689, 68026615005457, 68026615038225]),
    },
    {
      id: "crew-calavera", name: "Crewneck Calavera", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Hueso", hex: "#e7ddcb", image: P + "crew-calavera-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo color hueso con la calavera de Posada y el sol rojo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: variants([68026615070993, 68026615103761, 68026615136529, 68026615169297, 68026615202065]),
    },
    {
      id: "crew-caballero", name: "Crewneck El caballero", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#e7ddcb", image: P + "crew-caballero-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo color hueso con el grabado del caballero de Durero en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: variants([68026615234833, 68026615267601, 68026615300369, 68026615333137, 68026615365905]),
    },
    {
      id: "crew-topografia", name: "Crewneck Topografía", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Carbón", hex: "#4a4846", image: P + "crew-topografia-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo gris carbón con el mapa topográfico HSTLRS en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: variants([68026615496977, 68026615529745, 68026615562513, 68026615595281, 68026615628049]),
    },
    {
      id: "crew-escalera", name: "Crewneck Escalera al sol", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "crew-escalera-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo negra con el arco, la escalera y el sol rojo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: variants([68026615660817, 68026615693585, 68026615726353, 68026615759121, 68026615791889]),
    },
    {
      id: "crew-ciudad", name: "Crewneck Ciudad a pulso", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#e7ddcb", image: P + "crew-ciudad-back.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo color hueso con el plano de la ciudad en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: variants([68026615824657, 68026615857425, 68026615890193, 68026615922961, 68026615955729]),
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
      published: true,
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
      published: true,
      shopify: {
        "S/Hueso": 68026209272081, "S/Carbón": 68026209304849, "M/Hueso": 68026209337617, "M/Carbón": 68026209370385,
        "L/Hueso": 68026209403153, "L/Carbón": 68026209435921, "XL/Hueso": 68026209468689, "XL/Carbón": 68026209501457,
        "2XL/Hueso": 68026209534225, "2XL/Carbón": 68026209566993,
      },
    },
    {
      id: "jogger-fleece", name: "Jogger Fleece HSTLRS", collection: "ESSENTIALS", category: "pantalones",
      price: 1199, sizePrice: { "2XL": 1249 },
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "jogger-negro.jpg" },
        { name: "Carbón", hex: "#3d3c3a", image: P + "jogger-carbon.jpg" },
      ],
      sizes: TEE_SIZES,
      description: "Jogger de felpa con cintura elástica y cordón, a juego con el hoodie. HSTLRS bordado.",
      details: ["Cotton Heritage M7580: felpa premium, interior cepillado", "Bolsillos laterales y puños elásticos", "Logo bordado", "Hecho bajo pedido para ti"],
      published: true,
      shopify: {
        "S/Negro": 68026209632529, "S/Carbón": 68026209665297, "M/Negro": 68026209698065, "M/Carbón": 68026209730833,
        "L/Negro": 68026209763601, "L/Carbón": 68026209796369, "XL/Negro": 68026209829137, "XL/Carbón": 68026209861905,
        "2XL/Negro": 68026209894673, "2XL/Carbón": 68026209927441,
      },
    },
    {
      id: "dad-hat", name: "Gorra Dad Hat HSTLRS", collection: "ESSENTIALS", category: "gorras",
      price: 599, badge: "Tendencia", featured: true,
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "gorra-negro.jpg" },
        { name: "Khaki", hex: "#b9a77f", image: P + "gorra-khaki.jpg" },
        { name: "Piedra", hex: "#d6cdb8", image: P + "gorra-piedra.jpg" },
      ],
      sizes: ["Única"],
      description: "Gorra sin estructura de perfil bajo con HSTLRS bordado al frente. El estilo de gorra que más se usa este año.",
      details: ["Yupoong 6245CM: 100 % algodón sarga", "Sin estructura, visera curva", "Cierre ajustable con hebilla metálica", "Bordado al frente"],
      published: true,
      shopify: { "Única/Negro": 68026209992977, "Única/Khaki": 68026210025745, "Única/Piedra": 68026210058513 },
    },
    {
      id: "beanie-hstlrs", name: "Beanie HSTLRS", collection: "ESSENTIALS", category: "gorras",
      price: 499, badge: "Temporada",
      colors: [
        { name: "Negro", hex: "#1d1c1b", image: P + "beanie-negro.jpg" },
        { name: "Café", hex: "#5b4637", image: P + "beanie-cafe.jpg" },
      ],
      sizes: ["Única"],
      description: "Gorro de punto con doblez y HSTLRS bordado. Para las mañanas frías.",
      details: ["Yupoong 1501KC: acrílico suave, punto acanalado", "Doblez con logo bordado", "Talla única"],
      published: true,
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
    { id: "playeras", name: "Playeras", image: P + "studio08-back.jpg" },
    { id: "sudaderas", name: "Sudaderas", image: P + "hoodie-ajolote-back.jpg" },
    { id: "gorras", name: "Gorras", image: P + "gorra-negro.jpg" },
    { id: "arte", name: "Arte", image: A + "lamina-acueducto.jpg" },
    { id: "packs", name: "Packs", image: D + "lookbook-1.jpg", hidden: true },
    { id: "pantalones", name: "Pantalones", image: C + "jogger-carbon.jpg", hidden: true },
    { id: "accesorios", name: "Accesorios", image: C + "tote-crudo.jpg", hidden: true },
  ];

  window.LOOKBOOK = [
    { src: P + "hoodie-escalera-back.jpg", alt: "Hoodie Escalera al sol" },
    { src: P + "studio04-back.jpg", alt: "STUDIO 04 Topografía" },
    { src: P + "studio02-back.jpg", alt: "STUDIO 02 Beyond Borders" },
    { src: P + "hoodie-ciudad-back.jpg", alt: "Hoodie Ciudad a pulso" },
  ];
})();

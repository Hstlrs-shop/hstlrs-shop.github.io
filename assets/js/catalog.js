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
      id: "core-01-negra-relieve", name: "CORE 01 — Logo y manga", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Disponible",
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "core01-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "core01-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "core01-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "core01-arena.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "core01-blanco.jpg" }],
      gallery: [P + "core01-manga.jpg"], sizes: TEE_SIZES,
      description: "Hecho a pulso. La base de todo: HSTLRS discreto al frente y el nombre en vertical a lo largo de la manga izquierda.",
      details: coreDetails, published: true,
      shopify: { "S/Negro": 67954952110353, "M/Negro": 67954952143121, "L/Negro": 67954952175889, "XL/Negro": 67954952208657, "2XL/Negro": 67954952241425, "S/Carbón": 68026872168721, "M/Carbón": 68026872299793, "L/Carbón": 68026872430865, "XL/Carbón": 68026872561937, "2XL/Carbón": 68026872693009, "S/Hueso": 68026872201489, "M/Hueso": 68026872332561, "L/Hueso": 68026872463633, "XL/Hueso": 68026872594705, "2XL/Hueso": 68026872725777, "S/Arena": 68026872234257, "M/Arena": 68026872365329, "L/Arena": 68026872496401, "XL/Arena": 68026872627473, "2XL/Arena": 68026872758545, "S/Blanco": 68026872267025, "M/Blanco": 68026872398097, "L/Blanco": 68026872529169, "XL/Blanco": 68026872660241, "2XL/Blanco": 68026872791313 },
    },
    {
      id: "core-02-deslavada-monograma", name: "CORE 02 — Monograma", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Disponible",
      colors: [{ name: "Carbón", hex: "#514f4c", image: P + "core02-carbon.jpg" }, { name: "Negro", hex: "#1b1b1c", image: P + "core02-negro.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "core02-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "core02-arena.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "core02-blanco.jpg" }],
      gallery: [P + "core02-back.jpg"], sizes: TEE_SIZES,
      description: "El monograma HR bordado en el pecho, en hilo gris. Discreta y fácil de combinar.",
      details: ["Monograma bordado en el pecho izquierdo", ...coreDetails], published: true,
      shopify: { "S/Carbón": 67954952339729, "M/Carbón": 67954952372497, "L/Carbón": 67954952405265, "XL/Carbón": 67954952438033, "2XL/Carbón": 67954952470801, "S/Negro": 68026872856849, "M/Negro": 68026872987921, "L/Negro": 68026873118993, "XL/Negro": 68026873250065, "2XL/Negro": 68026873381137, "S/Hueso": 68026872889617, "M/Hueso": 68026873020689, "L/Hueso": 68026873151761, "XL/Hueso": 68026873282833, "2XL/Hueso": 68026873413905, "S/Arena": 68026872922385, "M/Arena": 68026873053457, "L/Arena": 68026873184529, "XL/Arena": 68026873315601, "2XL/Arena": 68026873446673, "S/Blanco": 68026872955153, "M/Blanco": 68026873086225, "L/Blanco": 68026873217297, "XL/Blanco": 68026873348369, "2XL/Blanco": 68026873479441 },
    },
    {
      id: "core-03-hueso-etiqueta", name: "CORE 03 — Logo frente", collection: "CORE", category: "playeras",
      price: 799, sizePrice: { "2XL": 849 }, badge: "Disponible",
      colors: [{ name: "Hueso", hex: "#f3ead6", image: P + "core03-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "core03-arena.jpg" }, { name: "Gris", hex: "#a6abaa", image: P + "core03-gris.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "core03-blanco.jpg" }],
      gallery: [P + "core03-back.jpg"], sizes: TEE_SIZES,
      description: "Lo esencial: HSTLRS discreto al frente, en negro. La pieza que combina con todo tu clóset.",
      details: coreDetails, published: true,
      shopify: { "S/Hueso": 67954952536337, "M/Hueso": 67954952569105, "L/Hueso": 67954952601873, "XL/Hueso": 67954952634641, "2XL/Hueso": 67954952667409, "S/Arena": 68026873544977, "M/Arena": 68026873643281, "L/Arena": 68026873741585, "XL/Arena": 68026873839889, "2XL/Arena": 68026873938193, "S/Gris": 68026873577745, "M/Gris": 68026873676049, "L/Gris": 68026873774353, "XL/Gris": 68026873872657, "2XL/Gris": 68026873970961, "S/Blanco": 68026873610513, "M/Blanco": 68026873708817, "L/Blanco": 68026873807121, "XL/Blanco": 68026873905425, "2XL/Blanco": 68026874003729 },
    },

    // ---------- STUDIO ----------
    {
      id: "studio-01-acueducto", name: "STUDIO 01 — Acueducto", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Pieza insignia", featured: true,
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "studio01-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio01-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio01-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio01-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "Lo que se construye a pulso, dura siglos. Un acueducto de piedra trazado como plano de arquitecto bajo un sol rojo, en la espalda.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Negro": 67954952765713, "M/Negro": 67954952798481, "L/Negro": 67954952831249, "XL/Negro": 67954952864017, "2XL/Negro": 67954952896785, "S/Carbón": 68026789265681, "M/Carbón": 68026789363985, "L/Carbón": 68026789462289, "XL/Carbón": 68026789560593, "2XL/Carbón": 68026789658897, "S/Hueso": 68026789298449, "M/Hueso": 68026789396753, "L/Hueso": 68026789495057, "XL/Hueso": 68026789593361, "2XL/Hueso": 68026789691665, "S/Arena": 68026789331217, "M/Arena": 68026789429521, "L/Arena": 68026789527825, "XL/Arena": 68026789626129, "2XL/Arena": 68026789724433 },
    },
    {
      id: "studio-02-beyond-borders", name: "STUDIO 02 — Beyond Borders", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Drop 01",
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "studio02-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio02-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio02-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio02-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "Beyond borders. Un globo terráqueo a línea fina con la ruta México–España trazada en rojo, en la espalda. Para los que no conocen fronteras.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Negro": 67954961416465, "M/Negro": 67954961449233, "L/Negro": 67954961482001, "XL/Negro": 67954961514769, "2XL/Negro": 67954961547537, "S/Carbón": 68026794672401, "M/Carbón": 68026794770705, "L/Carbón": 68026794869009, "XL/Carbón": 68026794967313, "2XL/Carbón": 68026795065617, "S/Hueso": 68026794705169, "M/Hueso": 68026794803473, "L/Hueso": 68026794901777, "XL/Hueso": 68026795000081, "2XL/Hueso": 68026795098385, "S/Arena": 68026794737937, "M/Arena": 68026794836241, "L/Arena": 68026794934545, "XL/Arena": 68026795032849, "2XL/Arena": 68026795131153 },
    },
    {
      id: "studio-03-the-climb", name: "STUDIO 03 — The Climb", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Drop 01",
      colors: [{ name: "Hueso", hex: "#f3ead6", image: P + "studio03-hueso.jpg" }, { name: "Negro", hex: "#1b1b1c", image: P + "studio03-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio03-carbon.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio03-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "The climb is yours. Una cordillera dibujada a línea fina sobre playera hueso. Nadie sube por ti.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Hueso": 67954963972369, "M/Hueso": 67954964005137, "L/Hueso": 67954964037905, "XL/Hueso": 67954964070673, "2XL/Hueso": 67954964103441, "S/Negro": 68026795196689, "M/Negro": 68026795294993, "L/Negro": 68026795393297, "XL/Negro": 68026795491601, "2XL/Negro": 68026795589905, "S/Carbón": 68026795229457, "M/Carbón": 68026795327761, "L/Carbón": 68026795426065, "XL/Carbón": 68026795524369, "2XL/Carbón": 68026795622673, "S/Arena": 68026795262225, "M/Arena": 68026795360529, "L/Arena": 68026795458833, "XL/Arena": 68026795557137, "2XL/Arena": 68026795655441 },
    },
    {
      id: "studio-04-topografia", name: "STUDIO 04 — Topografía", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Carbón", hex: "#514f4c", image: P + "studio04-carbon.jpg" }, { name: "Negro", hex: "#1b1b1c", image: P + "studio04-negro.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio04-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio04-arena.jpg" }],
      gallery: ["assets/img/modelos/studio04-modelo.jpg"], sizes: TEE_SIZES,
      description: "Un mapa topográfico a línea fina y una ruta en rojo hacia la cumbre, en la espalda. Para los que eligen el camino sin mapa.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Carbón": 68026383597841, "M/Carbón": 68026383630609, "L/Carbón": 68026383663377, "XL/Carbón": 68026383696145, "2XL/Carbón": 68026383728913, "S/Negro": 68026795852049, "M/Negro": 68026795950353, "L/Negro": 68026796048657, "XL/Negro": 68026796146961, "2XL/Negro": 68026796245265, "S/Hueso": 68026795884817, "M/Hueso": 68026795983121, "L/Hueso": 68026796081425, "XL/Hueso": 68026796179729, "2XL/Hueso": 68026796278033, "S/Arena": 68026795917585, "M/Arena": 68026796015889, "L/Arena": 68026796114193, "XL/Arena": 68026796212497, "2XL/Arena": 68026796310801 },
    },
    {
      id: "studio-05-escalera", name: "STUDIO 05 — Escalera al sol", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "studio05-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio05-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio05-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio05-arena.jpg" }],
      gallery: ["assets/img/modelos/studio05-modelo.jpg"], sizes: TEE_SIZES,
      description: "Un arco de piedra, una escalera que solo sube quien la camina y un sol rojo al final. Tu ritmo, tu camino.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Negro": 68026383859985, "M/Negro": 68026383892753, "L/Negro": 68026383925521, "XL/Negro": 68026383958289, "2XL/Negro": 68026383991057, "S/Carbón": 68026796507409, "M/Carbón": 68026796605713, "L/Carbón": 68026796704017, "XL/Carbón": 68026796802321, "2XL/Carbón": 68026796900625, "S/Hueso": 68026796540177, "M/Hueso": 68026796638481, "L/Hueso": 68026796736785, "XL/Hueso": 68026796835089, "2XL/Hueso": 68026796933393, "S/Arena": 68026796572945, "M/Arena": 68026796671249, "L/Arena": 68026796769553, "XL/Arena": 68026796867857, "2XL/Arena": 68026796966161 },
    },
    {
      id: "studio-06-ciudad", name: "STUDIO 06 — Ciudad a pulso", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f3ead6", image: P + "studio06-hueso.jpg" }, { name: "Negro", hex: "#1b1b1c", image: P + "studio06-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio06-carbon.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio06-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "El plano de una ciudad construida a mano, en blanco y negro, con un punto rojo donde empezó todo.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Hueso": 68026384023825, "M/Hueso": 68026384056593, "L/Hueso": 68026384089361, "XL/Hueso": 68026384122129, "2XL/Hueso": 68026384154897, "S/Negro": 68026797097233, "M/Negro": 68026797195537, "L/Negro": 68026797293841, "XL/Negro": 68026797392145, "2XL/Negro": 68026797490449, "S/Carbón": 68026797130001, "M/Carbón": 68026797228305, "L/Carbón": 68026797326609, "XL/Carbón": 68026797424913, "2XL/Carbón": 68026797523217, "S/Arena": 68026797162769, "M/Arena": 68026797261073, "L/Arena": 68026797359377, "XL/Arena": 68026797457681, "2XL/Arena": 68026797555985 },
    },
    {
      id: "hoodie-topografia", name: "Hoodie Topografía", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Carbón", hex: "#463e3d", image: P + "hoodie-topografia-carbon.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "hoodie-topografia-negro.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "hoodie-topografia-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "hoodie-topografia-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "El mapa topográfico HSTLRS en la espalda de una sudadera con capucha de felpa premium.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: { "S/Carbón": 68026384187665, "M/Carbón": 68026384220433, "L/Carbón": 68026384253201, "XL/Carbón": 68026384285969, "2XL/Carbón": 68026384318737, "S/Negro": 68026797588753, "M/Negro": 68026797687057, "L/Negro": 68026797785361, "XL/Negro": 68026797883665, "2XL/Negro": 68026797981969, "S/Hueso": 68026797621521, "M/Hueso": 68026797719825, "L/Hueso": 68026797818129, "XL/Hueso": 68026797916433, "2XL/Hueso": 68026798014737, "S/Arena": 68026797654289, "M/Arena": 68026797752593, "L/Arena": 68026797850897, "XL/Arena": 68026797949201, "2XL/Arena": 68026798047505 },
    },
    {
      id: "hoodie-escalera", name: "Hoodie Escalera al sol", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "hoodie-escalera-negro.jpg" }, { name: "Carbón", hex: "#463e3d", image: P + "hoodie-escalera-carbon.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "hoodie-escalera-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "hoodie-escalera-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "El arco, la escalera y el sol rojo en la espalda de una sudadera con capucha de felpa premium.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68026384417041, "M/Negro": 68026384449809, "L/Negro": 68026384482577, "XL/Negro": 68026384515345, "2XL/Negro": 68026384548113, "S/Carbón": 68026798113041, "M/Carbón": 68026798211345, "L/Carbón": 68026798309649, "XL/Carbón": 68026798407953, "2XL/Carbón": 68026798506257, "S/Hueso": 68026798145809, "M/Hueso": 68026798244113, "L/Hueso": 68026798342417, "XL/Hueso": 68026798440721, "2XL/Hueso": 68026798539025, "S/Arena": 68026798178577, "M/Arena": 68026798276881, "L/Arena": 68026798375185, "XL/Arena": 68026798473489, "2XL/Arena": 68026798571793 },
    },
    {
      id: "hoodie-ciudad", name: "Hoodie Ciudad a pulso", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "hoodie-ciudad-hueso.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "hoodie-ciudad-negro.jpg" }, { name: "Carbón", hex: "#463e3d", image: P + "hoodie-ciudad-carbon.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "hoodie-ciudad-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "El plano de la ciudad a pulso en la espalda de una sudadera con capucha de felpa premium.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: { "S/Hueso": 68026385039633, "M/Hueso": 68026385072401, "L/Hueso": 68026385105169, "XL/Hueso": 68026385137937, "2XL/Hueso": 68026385170705, "S/Negro": 68026798604561, "M/Negro": 68026798702865, "L/Negro": 68026798801169, "XL/Negro": 68026798899473, "2XL/Negro": 68026798997777, "S/Carbón": 68026798637329, "M/Carbón": 68026798735633, "L/Carbón": 68026798833937, "XL/Carbón": 68026798932241, "2XL/Carbón": 68026799030545, "S/Arena": 68026798670097, "M/Arena": 68026798768401, "L/Arena": 68026798866705, "XL/Arena": 68026798965009, "2XL/Arena": 68026799063313 },
    },

    // ---------- STUDIO · arte realista ----------
    {
      id: "studio-07-ajolote", name: "STUDIO 07 — Ajolote astronauta", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "studio07-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio07-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio07-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio07-arena.jpg" }],
      gallery: ["assets/img/modelos/studio07-modelo.jpg"], sizes: TEE_SIZES,
      description: "Un ajolote mexicano con casco de astronauta flotando entre flores de cempasúchil. Arte realista a todo color en la espalda.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Negro": 68026612351249, "M/Negro": 68026612384017, "L/Negro": 68026612416785, "XL/Negro": 68026612449553, "2XL/Negro": 68026612482321, "S/Carbón": 68026799423761, "M/Carbón": 68026799522065, "L/Carbón": 68026799620369, "XL/Carbón": 68026799718673, "2XL/Carbón": 68026799816977, "S/Hueso": 68026799456529, "M/Hueso": 68026799554833, "L/Hueso": 68026799653137, "XL/Hueso": 68026799751441, "2XL/Hueso": 68026799849745, "S/Arena": 68026799489297, "M/Arena": 68026799587601, "L/Arena": 68026799685905, "XL/Arena": 68026799784209, "2XL/Arena": 68026799882513 },
    },
    {
      id: "studio-08-jaguar", name: "STUDIO 08 — Jaguar", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "studio08-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio08-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio08-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio08-arena.jpg" }],
      gallery: ["assets/img/modelos/studio08-modelo.jpg"], sizes: TEE_SIZES,
      description: "Un jaguar que emerge del humo y la obsidiana frente a un sol rojo. Arte realista a todo color en la espalda.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Negro": 68026612515089, "M/Negro": 68026612547857, "L/Negro": 68026612580625, "XL/Negro": 68026612613393, "2XL/Negro": 68026612646161, "S/Carbón": 68026800537873, "M/Carbón": 68026800636177, "L/Carbón": 68026800734481, "XL/Carbón": 68026800832785, "2XL/Carbón": 68026800931089, "S/Hueso": 68026800570641, "M/Hueso": 68026800668945, "L/Hueso": 68026800767249, "XL/Hueso": 68026800865553, "2XL/Hueso": 68026800963857, "S/Arena": 68026800603409, "M/Arena": 68026800701713, "L/Arena": 68026800800017, "XL/Arena": 68026800898321, "2XL/Arena": 68026800996625 },
    },
    {
      id: "studio-09-rinoceronte", name: "STUDIO 09 — Rinoceronte", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1b1b1c", image: P + "studio09-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio09-carbon.jpg" }, { name: "Hueso", hex: "#f3ead6", image: P + "studio09-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio09-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "El rinoceronte de Alberto Durero (grabado de 1515), con el sol rojo HSTLRS.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Negro": 68026612711697, "M/Negro": 68026612744465, "L/Negro": 68026612777233, "XL/Negro": 68026612810001, "2XL/Negro": 68026612842769, "S/Carbón": 68026801127697, "M/Carbón": 68026801226001, "L/Carbón": 68026801324305, "XL/Carbón": 68026801422609, "2XL/Carbón": 68026801520913, "S/Hueso": 68026801160465, "M/Hueso": 68026801258769, "L/Hueso": 68026801357073, "XL/Hueso": 68026801455377, "2XL/Hueso": 68026801553681, "S/Arena": 68026801193233, "M/Arena": 68026801291537, "L/Arena": 68026801389841, "XL/Arena": 68026801488145, "2XL/Arena": 68026801586449 },
    },
    {
      id: "studio-10-ola", name: "STUDIO 10 — La ola", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f3ead6", image: P + "studio10-hueso.jpg" }, { name: "Negro", hex: "#1b1b1c", image: P + "studio10-negro.jpg" }, { name: "Carbón", hex: "#514f4c", image: P + "studio10-carbon.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio10-arena.jpg" }],
      gallery: ["assets/img/modelos/studio10-modelo.jpg"], sizes: TEE_SIZES,
      description: "La gran ola de Hokusai dentro de un círculo, con un sol rojo en lugar del cielo. Grabado clásico, reinterpretado.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Hueso": 68026612875537, "M/Hueso": 68026612908305, "L/Hueso": 68026612941073, "XL/Hueso": 68026612973841, "2XL/Hueso": 68026613006609, "S/Negro": 68026801651985, "M/Negro": 68026801750289, "L/Negro": 68026801848593, "XL/Negro": 68026801946897, "2XL/Negro": 68026802045201, "S/Carbón": 68026801684753, "M/Carbón": 68026801783057, "L/Carbón": 68026801881361, "XL/Carbón": 68026801979665, "2XL/Carbón": 68026802077969, "S/Arena": 68026801717521, "M/Arena": 68026801815825, "L/Arena": 68026801914129, "XL/Arena": 68026802012433, "2XL/Arena": 68026802110737 },
    },
    {
      id: "studio-11-calavera", name: "STUDIO 11 — Calavera", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f3ead6", image: P + "studio11-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio11-arena.jpg" }, { name: "Gris", hex: "#a6abaa", image: P + "studio11-gris.jpg" }],
      gallery: ["assets/img/modelos/studio11-modelo.jpg"], sizes: TEE_SIZES,
      description: "Una calavera del grabador mexicano José Guadalupe Posada, tallada en madera, con un sol rojo detrás.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Hueso": 68026613039377, "M/Hueso": 68026613072145, "L/Hueso": 68026613104913, "XL/Hueso": 68026613137681, "2XL/Hueso": 68026613170449, "S/Arena": 68026802176273, "M/Arena": 68026802241809, "L/Arena": 68026802307345, "XL/Arena": 68026802372881, "2XL/Arena": 68026802438417, "S/Gris": 68026802209041, "M/Gris": 68026802274577, "L/Gris": 68026802340113, "XL/Gris": 68026802405649, "2XL/Gris": 68026802471185 },
    },
    {
      id: "studio-12-caballero", name: "STUDIO 12 — El caballero", collection: "STUDIO", category: "playeras",
      price: 849, sizePrice: { "2XL": 899 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f3ead6", image: P + "studio12-hueso.jpg" }, { name: "Arena", hex: "#b3ab8b", image: P + "studio12-arena.jpg" }, { name: "Gris", hex: "#a6abaa", image: P + "studio12-gris.jpg" }],
      sizes: TEE_SIZES,
      description: "El caballero, la muerte y el diablo, grabado de Alberto Durero (1513), en arco y con el sol rojo HSTLRS.",
      details: STUDIO_DETAILS, published: true,
      shopify: { "S/Hueso": 68026613235985, "M/Hueso": 68026613268753, "L/Hueso": 68026613301521, "XL/Hueso": 68026613334289, "2XL/Hueso": 68026613367057, "S/Arena": 68026802503953, "M/Arena": 68026802569489, "L/Arena": 68026802635025, "XL/Arena": 68026802700561, "2XL/Arena": 68026802766097, "S/Gris": 68026802536721, "M/Gris": 68026802602257, "L/Gris": 68026802667793, "XL/Gris": 68026802733329, "2XL/Gris": 68026802798865 },
    },
    {
      id: "hoodie-ajolote", name: "Hoodie Ajolote astronauta", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "hoodie-ajolote-negro.jpg" }, { name: "Carbón", hex: "#463e3d", image: P + "hoodie-ajolote-carbon.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "hoodie-ajolote-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "hoodie-ajolote-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera con capucha con el ajolote astronauta a todo color en la espalda. Felpa premium con interior cepillado.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68026613399825, "M/Negro": 68026613432593, "L/Negro": 68026613465361, "XL/Negro": 68026613498129, "2XL/Negro": 68026613530897, "S/Carbón": 68026802897169, "M/Carbón": 68026802995473, "L/Carbón": 68026803093777, "XL/Carbón": 68026803192081, "2XL/Carbón": 68026803290385, "S/Hueso": 68026802929937, "M/Hueso": 68026803028241, "L/Hueso": 68026803126545, "XL/Hueso": 68026803224849, "2XL/Hueso": 68026803323153, "S/Arena": 68026802962705, "M/Arena": 68026803061009, "L/Arena": 68026803159313, "XL/Arena": 68026803257617, "2XL/Arena": 68026803355921 },
    },
    {
      id: "hoodie-jaguar", name: "Hoodie Jaguar", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "hoodie-jaguar-negro.jpg" }, { name: "Carbón", hex: "#463e3d", image: P + "hoodie-jaguar-carbon.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "hoodie-jaguar-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "hoodie-jaguar-arena.jpg" }],
      gallery: ["assets/img/modelos/hoodie-jaguar-modelo-1.jpg", "assets/img/modelos/hoodie-jaguar-modelo-2.jpg"], sizes: TEE_SIZES,
      description: "Sudadera con capucha con el jaguar de obsidiana y sol rojo en la espalda. Felpa premium con interior cepillado.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68026613563665, "M/Negro": 68026613596433, "L/Negro": 68026613629201, "XL/Negro": 68026613661969, "2XL/Negro": 68026613694737, "S/Carbón": 68026803388689, "M/Carbón": 68026803486993, "L/Carbón": 68026803585297, "XL/Carbón": 68026803683601, "2XL/Carbón": 68026803781905, "S/Hueso": 68026803421457, "M/Hueso": 68026803519761, "L/Hueso": 68026803618065, "XL/Hueso": 68026803716369, "2XL/Hueso": 68026803814673, "S/Arena": 68026803454225, "M/Arena": 68026803552529, "L/Arena": 68026803650833, "XL/Arena": 68026803749137, "2XL/Arena": 68026803847441 },
    },
    {
      id: "hoodie-ola", name: "Hoodie La ola", collection: "STUDIO", category: "sudaderas",
      price: 1299, sizePrice: { "2XL": 1349 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "hoodie-ola-hueso.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "hoodie-ola-negro.jpg" }, { name: "Carbón", hex: "#463e3d", image: P + "hoodie-ola-carbon.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "hoodie-ola-arena.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera con capucha con la gran ola y el sol rojo en la espalda. Felpa premium con interior cepillado.",
      details: HOODIE_ART_DETAILS, published: true,
      shopify: { "S/Hueso": 68026613727505, "M/Hueso": 68026613760273, "L/Hueso": 68026613793041, "XL/Hueso": 68026613825809, "2XL/Hueso": 68026613858577, "S/Negro": 68026803912977, "M/Negro": 68026804011281, "L/Negro": 68026804109585, "XL/Negro": 68026804207889, "2XL/Negro": 68026804306193, "S/Carbón": 68026803945745, "M/Carbón": 68026804044049, "L/Carbón": 68026804142353, "XL/Carbón": 68026804240657, "2XL/Carbón": 68026804338961, "S/Arena": 68026803978513, "M/Arena": 68026804076817, "L/Arena": 68026804175121, "XL/Arena": 68026804273425, "2XL/Arena": 68026804371729 },
    },
    {
      id: "crew-rinoceronte", name: "Crewneck Rinoceronte", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "crew-rinoceronte-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-rinoceronte-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-rinoceronte-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-rinoceronte-gris.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "crew-rinoceronte-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-rinoceronte-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-rinoceronte-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-rinoceronte-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el rinoceronte de Durero y el sol rojo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68026614907153, "M/Negro": 68026614939921, "L/Negro": 68026614972689, "XL/Negro": 68026615005457, "2XL/Negro": 68026615038225, "S/Carbón": 68026804404497, "M/Carbón": 68026804502801, "L/Carbón": 68026804601105, "XL/Carbón": 68026804699409, "2XL/Carbón": 68026804797713, "S/Marino": 68030993694993, "M/Marino": 68030993727761, "L/Marino": 68030993760529, "XL/Marino": 68030993793297, "2XL/Marino": 68030993826065, "S/Gris": 68030993858833, "M/Gris": 68030993891601, "L/Gris": 68030993924369, "XL/Gris": 68030993957137, "2XL/Gris": 68030993989905, "S/Hueso": 68026804437265, "M/Hueso": 68026804535569, "L/Hueso": 68026804633873, "XL/Hueso": 68026804732177, "2XL/Hueso": 68026804830481, "S/Arena": 68026804470033, "M/Arena": 68026804568337, "L/Arena": 68026804666641, "XL/Arena": 68026804764945, "2XL/Arena": 68026804863249, "S/Latte": 68030994022673, "M/Latte": 68030994055441, "L/Latte": 68030994088209, "XL/Latte": 68030994120977, "2XL/Latte": 68030994153745, "S/Blanco": 68030994186513, "M/Blanco": 68030994219281, "L/Blanco": 68030994252049, "XL/Blanco": 68030994284817, "2XL/Blanco": 68030994317585 },
    },
    {
      id: "crew-calavera", name: "Crewneck Calavera", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "crew-calavera-hueso.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "crew-calavera-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-calavera-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-calavera-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-calavera-gris.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-calavera-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-calavera-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-calavera-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con la calavera de Posada y el sol rojo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Hueso": 68026615070993, "M/Hueso": 68026615103761, "L/Hueso": 68026615136529, "XL/Hueso": 68026615169297, "2XL/Hueso": 68026615202065, "S/Negro": 68030994350353, "M/Negro": 68030994383121, "L/Negro": 68030994415889, "XL/Negro": 68030994448657, "2XL/Negro": 68030994481425, "S/Carbón": 68030994514193, "M/Carbón": 68030994546961, "L/Carbón": 68030994579729, "XL/Carbón": 68030994612497, "2XL/Carbón": 68030994645265, "S/Marino": 68030994678033, "M/Marino": 68030994710801, "L/Marino": 68030994743569, "XL/Marino": 68030994776337, "2XL/Marino": 68030994809105, "S/Gris": 68026805125393, "M/Gris": 68026805190929, "L/Gris": 68026805256465, "XL/Gris": 68026805322001, "2XL/Gris": 68026805387537, "S/Arena": 68026805092625, "M/Arena": 68026805158161, "L/Arena": 68026805223697, "XL/Arena": 68026805289233, "2XL/Arena": 68026805354769, "S/Latte": 68030994841873, "M/Latte": 68030994874641, "L/Latte": 68030994907409, "XL/Latte": 68030994940177, "2XL/Latte": 68030994972945, "S/Blanco": 68030995005713, "M/Blanco": 68030995038481, "L/Blanco": 68030995071249, "XL/Blanco": 68030995104017, "2XL/Blanco": 68030995136785 },
    },
    {
      id: "crew-caballero", name: "Crewneck El caballero", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "crew-caballero-hueso.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "crew-caballero-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-caballero-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-caballero-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-caballero-gris.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-caballero-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-caballero-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-caballero-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el grabado del caballero de Durero en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Hueso": 68026615234833, "M/Hueso": 68026615267601, "L/Hueso": 68026615300369, "XL/Hueso": 68026615333137, "2XL/Hueso": 68026615365905, "S/Negro": 68030995169553, "M/Negro": 68030995202321, "L/Negro": 68030995235089, "XL/Negro": 68030995267857, "2XL/Negro": 68030995300625, "S/Carbón": 68030995333393, "M/Carbón": 68030995366161, "L/Carbón": 68030995398929, "XL/Carbón": 68030995431697, "2XL/Carbón": 68030995464465, "S/Marino": 68030995497233, "M/Marino": 68030995530001, "L/Marino": 68030995562769, "XL/Marino": 68030995595537, "2XL/Marino": 68030995628305, "S/Gris": 68026805453073, "M/Gris": 68026805518609, "L/Gris": 68026805584145, "XL/Gris": 68026805649681, "2XL/Gris": 68026805715217, "S/Arena": 68026805420305, "M/Arena": 68026805485841, "L/Arena": 68026805551377, "XL/Arena": 68026805616913, "2XL/Arena": 68026805682449, "S/Latte": 68030995661073, "M/Latte": 68030995693841, "L/Latte": 68030995726609, "XL/Latte": 68030995759377, "2XL/Latte": 68030995792145, "S/Blanco": 68030995824913, "M/Blanco": 68030995857681, "L/Blanco": 68030995890449, "XL/Blanco": 68030995923217, "2XL/Blanco": 68030995955985 },
    },
    {
      id: "crew-topografia", name: "Crewneck Topografía", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Carbón", hex: "#3a3a38", image: P + "crew-topografia-carbon.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "crew-topografia-negro.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-topografia-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-topografia-gris.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "crew-topografia-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-topografia-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-topografia-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-topografia-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el mapa topográfico HSTLRS en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Carbón": 68026615496977, "M/Carbón": 68026615529745, "L/Carbón": 68026615562513, "XL/Carbón": 68026615595281, "2XL/Carbón": 68026615628049, "S/Negro": 68026805780753, "M/Negro": 68026805879057, "L/Negro": 68026805977361, "XL/Negro": 68026806075665, "2XL/Negro": 68026806173969, "S/Marino": 68030995988753, "M/Marino": 68030996021521, "L/Marino": 68030996054289, "XL/Marino": 68030996087057, "2XL/Marino": 68030996119825, "S/Gris": 68030996152593, "M/Gris": 68030996185361, "L/Gris": 68030996218129, "XL/Gris": 68030996250897, "2XL/Gris": 68030996283665, "S/Hueso": 68026805813521, "M/Hueso": 68026805911825, "L/Hueso": 68026806010129, "XL/Hueso": 68026806108433, "2XL/Hueso": 68026806206737, "S/Arena": 68026805846289, "M/Arena": 68026805944593, "L/Arena": 68026806042897, "XL/Arena": 68026806141201, "2XL/Arena": 68026806239505, "S/Latte": 68030996316433, "M/Latte": 68030996349201, "L/Latte": 68030996381969, "XL/Latte": 68030996414737, "2XL/Latte": 68030996447505, "S/Blanco": 68030996480273, "M/Blanco": 68030996513041, "L/Blanco": 68030996545809, "XL/Blanco": 68030996578577, "2XL/Blanco": 68030996611345 },
    },
    {
      id: "crew-escalera", name: "Crewneck Escalera al sol", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "crew-escalera-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-escalera-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-escalera-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-escalera-gris.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "crew-escalera-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-escalera-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-escalera-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-escalera-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el arco, la escalera y el sol rojo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68026615660817, "M/Negro": 68026615693585, "L/Negro": 68026615726353, "XL/Negro": 68026615759121, "2XL/Negro": 68026615791889, "S/Carbón": 68026806272273, "M/Carbón": 68026806370577, "L/Carbón": 68026806468881, "XL/Carbón": 68026806567185, "2XL/Carbón": 68026806665489, "S/Marino": 68030996742417, "M/Marino": 68030996775185, "L/Marino": 68030996807953, "XL/Marino": 68030996840721, "2XL/Marino": 68030996873489, "S/Gris": 68030996906257, "M/Gris": 68030996939025, "L/Gris": 68030996971793, "XL/Gris": 68030997004561, "2XL/Gris": 68030997037329, "S/Hueso": 68026806305041, "M/Hueso": 68026806403345, "L/Hueso": 68026806501649, "XL/Hueso": 68026806599953, "2XL/Hueso": 68026806698257, "S/Arena": 68026806337809, "M/Arena": 68026806436113, "L/Arena": 68026806534417, "XL/Arena": 68026806632721, "2XL/Arena": 68026806731025, "S/Latte": 68030997070097, "M/Latte": 68030997102865, "L/Latte": 68030997135633, "XL/Latte": 68030997168401, "2XL/Latte": 68030997201169, "S/Blanco": 68030997233937, "M/Blanco": 68030997266705, "L/Blanco": 68030997299473, "XL/Blanco": 68030997332241, "2XL/Blanco": 68030997365009 },
    },
    {
      id: "crew-ciudad", name: "Crewneck Ciudad a pulso", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo",
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "crew-ciudad-hueso.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "crew-ciudad-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-ciudad-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-ciudad-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-ciudad-gris.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-ciudad-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-ciudad-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-ciudad-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el plano de la ciudad en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Hueso": 68026615824657, "M/Hueso": 68026615857425, "L/Hueso": 68026615890193, "XL/Hueso": 68026615922961, "2XL/Hueso": 68026615955729, "S/Negro": 68026806829329, "M/Negro": 68026806927633, "L/Negro": 68026807025937, "XL/Negro": 68026807124241, "2XL/Negro": 68026807222545, "S/Carbón": 68026806862097, "M/Carbón": 68026806960401, "L/Carbón": 68026807058705, "XL/Carbón": 68026807157009, "2XL/Carbón": 68026807255313, "S/Marino": 68030997397777, "M/Marino": 68030997430545, "L/Marino": 68030997463313, "XL/Marino": 68030997496081, "2XL/Marino": 68030997528849, "S/Gris": 68030997561617, "M/Gris": 68030997594385, "L/Gris": 68030997627153, "XL/Gris": 68030997659921, "2XL/Gris": 68030997692689, "S/Arena": 68026806894865, "M/Arena": 68026806993169, "L/Arena": 68026807091473, "XL/Arena": 68026807189777, "2XL/Arena": 68026807288081, "S/Latte": 68030997725457, "M/Latte": 68030997758225, "L/Latte": 68030997790993, "XL/Latte": 68030997823761, "2XL/Latte": 68030997856529, "S/Blanco": 68030997889297, "M/Blanco": 68030997922065, "L/Blanco": 68030997954833, "XL/Blanco": 68030997987601, "2XL/Blanco": 68030998020369 },
    },
    {
      id: "crew-ajolote", name: "Crewneck Ajolote astronauta", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "crew-ajolote-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-ajolote-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-ajolote-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-ajolote-gris.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "crew-ajolote-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-ajolote-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-ajolote-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-ajolote-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el ajolote astronauta entre flores de cempasúchil, a todo color en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68030999101713, "M/Negro": 68030999134481, "L/Negro": 68030999167249, "XL/Negro": 68030999200017, "2XL/Negro": 68030999232785, "S/Carbón": 68031000445201, "M/Carbón": 68031000477969, "L/Carbón": 68031000510737, "XL/Carbón": 68031000543505, "2XL/Carbón": 68031000576273, "S/Marino": 68031000609041, "M/Marino": 68031000641809, "L/Marino": 68031000674577, "XL/Marino": 68031000707345, "2XL/Marino": 68031000740113, "S/Gris": 68031000772881, "M/Gris": 68031000805649, "L/Gris": 68031000838417, "XL/Gris": 68031000871185, "2XL/Gris": 68031000903953, "S/Hueso": 68031000936721, "M/Hueso": 68031000969489, "L/Hueso": 68031001002257, "XL/Hueso": 68031001035025, "2XL/Hueso": 68031001067793, "S/Arena": 68031001100561, "M/Arena": 68031001133329, "L/Arena": 68031001166097, "XL/Arena": 68031001198865, "2XL/Arena": 68031001231633, "S/Latte": 68031001264401, "M/Latte": 68031001297169, "L/Latte": 68031001329937, "XL/Latte": 68031001362705, "2XL/Latte": 68031001395473, "S/Blanco": 68031001428241, "M/Blanco": 68031001461009, "L/Blanco": 68031001493777, "XL/Blanco": 68031001526545, "2XL/Blanco": 68031001559313 },
    },
    {
      id: "crew-jaguar", name: "Crewneck Jaguar", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Negro", hex: "#1d1c1b", image: P + "crew-jaguar-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-jaguar-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-jaguar-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-jaguar-gris.jpg" }, { name: "Hueso", hex: "#f0e4cb", image: P + "crew-jaguar-hueso.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-jaguar-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-jaguar-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-jaguar-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el jaguar de obsidiana frente al sol rojo, a todo color en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Negro": 68030999265553, "M/Negro": 68030999298321, "L/Negro": 68030999331089, "XL/Negro": 68030999363857, "2XL/Negro": 68030999396625, "S/Carbón": 68031001723153, "M/Carbón": 68031001755921, "L/Carbón": 68031001788689, "XL/Carbón": 68031001821457, "2XL/Carbón": 68031001854225, "S/Marino": 68031001886993, "M/Marino": 68031001919761, "L/Marino": 68031001952529, "XL/Marino": 68031001985297, "2XL/Marino": 68031002018065, "S/Gris": 68031002050833, "M/Gris": 68031002083601, "L/Gris": 68031002116369, "XL/Gris": 68031002149137, "2XL/Gris": 68031002181905, "S/Hueso": 68031002214673, "M/Hueso": 68031002247441, "L/Hueso": 68031002280209, "XL/Hueso": 68031002312977, "2XL/Hueso": 68031002345745, "S/Arena": 68031002378513, "M/Arena": 68031002411281, "L/Arena": 68031002444049, "XL/Arena": 68031002476817, "2XL/Arena": 68031002509585, "S/Latte": 68031002542353, "M/Latte": 68031002575121, "L/Latte": 68031002607889, "XL/Latte": 68031002640657, "2XL/Latte": 68031002673425, "S/Blanco": 68031002706193, "M/Blanco": 68031002738961, "L/Blanco": 68031002771729, "XL/Blanco": 68031002804497, "2XL/Blanco": 68031002837265 },
    },
    {
      id: "crew-ola", name: "Crewneck La ola", collection: "STUDIO", category: "sudaderas",
      price: 1199, sizePrice: { "2XL": 1249 }, badge: "Nuevo", featured: true,
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "crew-ola-hueso.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "crew-ola-negro.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crew-ola-carbon.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crew-ola-marino.jpg" }, { name: "Gris", hex: "#b2afaa", image: P + "crew-ola-gris.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crew-ola-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crew-ola-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crew-ola-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con la gran ola y el sol rojo dentro de un círculo en la espalda. Felpa premium.",
      details: CREW_ART_DETAILS, published: true,
      shopify: { "S/Hueso": 68030999429393, "M/Hueso": 68030999462161, "L/Hueso": 68030999494929, "XL/Hueso": 68030999527697, "2XL/Hueso": 68030999560465, "S/Negro": 68031003001105, "M/Negro": 68031003033873, "L/Negro": 68031003066641, "XL/Negro": 68031003099409, "2XL/Negro": 68031003132177, "S/Carbón": 68031003164945, "M/Carbón": 68031003197713, "L/Carbón": 68031003230481, "XL/Carbón": 68031003263249, "2XL/Carbón": 68031003296017, "S/Marino": 68031003328785, "M/Marino": 68031003361553, "L/Marino": 68031003394321, "XL/Marino": 68031003427089, "2XL/Marino": 68031003459857, "S/Gris": 68031003492625, "M/Gris": 68031003525393, "L/Gris": 68031003558161, "XL/Gris": 68031003590929, "2XL/Gris": 68031003623697, "S/Arena": 68031003656465, "M/Arena": 68031003689233, "L/Arena": 68031003722001, "XL/Arena": 68031003754769, "2XL/Arena": 68031003787537, "S/Latte": 68031003820305, "M/Latte": 68031003853073, "L/Latte": 68031003885841, "XL/Latte": 68031003918609, "2XL/Latte": 68031003951377, "S/Blanco": 68031003984145, "M/Blanco": 68031004016913, "L/Blanco": 68031004049681, "XL/Blanco": 68031004082449, "2XL/Blanco": 68031004115217 },
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
      colors: [{ name: "Hueso", hex: "#f0e4cb", image: P + "crewneck-hueso.jpg" }, { name: "Carbón", hex: "#3a3a38", image: P + "crewneck-carbon.jpg" }, { name: "Negro", hex: "#1d1c1b", image: P + "crewneck-negro.jpg" }, { name: "Marino", hex: "#1f2633", image: P + "crewneck-marino.jpg" }, { name: "Arena", hex: "#c9a072", image: P + "crewneck-arena.jpg" }, { name: "Latte", hex: "#b28a68", image: P + "crewneck-latte.jpg" }, { name: "Blanco", hex: "#ffffff", image: P + "crewneck-blanco.jpg" }],
      sizes: TEE_SIZES,
      description: "Sudadera cuello redondo con el monograma HR bordado en el pecho. Discreta, cómoda y fácil de combinar.",
      details: ["Cotton Heritage M2480: felpa premium, interior cepillado", "Monograma HR bordado en el pecho izquierdo", "Puños y dobladillo acanalados", "Hecha bajo pedido para ti"],
      published: true,
      shopify: { "S/Hueso": 68026209272081, "M/Hueso": 68026209337617, "L/Hueso": 68026209403153, "XL/Hueso": 68026209468689, "2XL/Hueso": 68026209534225, "S/Carbón": 68026209304849, "M/Carbón": 68026209370385, "L/Carbón": 68026209435921, "XL/Carbón": 68026209501457, "2XL/Carbón": 68026209566993, "S/Negro": 68030998118673, "M/Negro": 68030998151441, "L/Negro": 68030998184209, "XL/Negro": 68030998216977, "2XL/Negro": 68030998249745, "S/Marino": 68030998282513, "M/Marino": 68030998315281, "L/Marino": 68030998348049, "XL/Marino": 68030998380817, "2XL/Marino": 68030998413585, "S/Arena": 68030998446353, "M/Arena": 68030998479121, "L/Arena": 68030998511889, "XL/Arena": 68030998544657, "2XL/Arena": 68030998577425, "S/Latte": 68030998610193, "M/Latte": 68030998642961, "L/Latte": 68030998675729, "XL/Latte": 68030998708497, "2XL/Latte": 68030998741265, "S/Blanco": 68030998774033, "M/Blanco": 68030998806801, "L/Blanco": 68030998839569, "XL/Blanco": 68030998872337, "2XL/Blanco": 68030998905105 },
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
    { src: "assets/img/modelos/hoodie-jaguar-azotea.jpg", alt: "Hoodie Jaguar en una azotea de la Ciudad de México" },
    { src: "assets/img/modelos/studio07-modelo-cuadrada.jpg", alt: "Playera Ajolote astronauta con modelo" },
    { src: "assets/img/modelos/studio08-modelo-cuadrada.jpg", alt: "Playera Jaguar con modelo" },
    { src: "assets/img/modelos/studio10-modelo-cuadrada.jpg", alt: "Playera La ola con modelo" },
    { src: "assets/img/modelos/studio11-modelo-cuadrada.jpg", alt: "Playera Calavera con modelo" },
    { src: P + "hoodie-escalera-back.jpg", alt: "Hoodie Escalera al sol" },
    { src: P + "studio04-back.jpg", alt: "STUDIO 04 Topografía" },
    { src: P + "studio02-back.jpg", alt: "STUDIO 02 Beyond Borders" },
    { src: P + "hoodie-ciudad-back.jpg", alt: "Hoodie Ciudad a pulso" },
  ];
})();

# Genera las páginas estáticas de site/ con la cabecera y el pie de la marca.
# Uso: python3 worker/scripts/build-pages.py
import os
SITE="https://lanaconcafe-news.gt2hf24n6t.workers.dev"
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "site")  # newsletter/site
def page(fname, title, desc, body, path=""):
    html=f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}/{path}">
<meta property="og:site_name" content="Lana con Café">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/og-home.jpg">
<meta property="og:url" content="{SITE}/{path}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2B1A12">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="Lana con Café" href="/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script src="/config.js"></script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/"><img src="/assets/logo-mark.svg" alt="" width="34" height="34"><span>Lana <em>con</em> Café</span></a>
  <nav><a href="/#noticias" class="hide-sm">Noticias</a><a href="/mercados.html">Mercados</a><a href="/#ediciones" class="hide-sm">Newsletter</a><a class="btn sm" href="/precios.html">Pro</a></nav>
</div></header>
<div class="ticker" id="ticker"></div>
{body}
<footer><div class="wrap foot">
  <div><a class="logo" href="/"><img src="/assets/logo-mark-light.svg" alt="" width="30" height="30"><span>Lana <em>con</em> Café</span></a>
  <p>Las noticias que mueven tu dinero, con el primer café.</p></div>
  <div class="links"><a data-link="TELEGRAM_FREE">Telegram</a><a href="/precios.html">Pro</a><a href="/mercados.html">Mercados</a><a href="/marca.html">Marca</a><a href="/rss.xml">RSS</a></div>
  <p class="legal">Información, no asesoría de inversión. Titulares y fotos enlazan a sus fuentes originales; resúmenes de redacción propia. Datos de mercado: TradingView.</p>
</div></footer>
<script src="/app.js"></script>
</body>
</html>
'''
    open(os.path.join(OUT,fname),"w").write(html)

page("index.html","Lana con Café · Las noticias que mueven tu dinero","Noticias de economía y mercados de México y el mundo, explicadas en 1 minuto. Dólar, Banxico, bolsas y cripto en vivo, alertas en Telegram y newsletter diario.",'''<main class="wrap">
  <section class="hero" id="noticias">
    <a class="lead" id="lead" href="#"><div class="shade"></div><div class="txt"><h2>Cargando lo que mueve el mercado…</h2></div></a>
    <div class="side" id="side"></div>
  </section>

  <section>
    <div class="section-title"><h2>Mercados <span>en vivo</span></h2><a class="note" href="/mercados.html">Ver gráficas completas →</a></div>
    <div class="markets">
      <div class="panel tv-box" id="tv-overview"></div>
      <div class="panel thermo">
        <h3>🌡️ Termómetro del mercado</h3>
        <div class="level" id="level">…</div>
        <div class="note" id="hot"></div>
        <div class="bars" id="bars"></div>
        <div class="axis"><span>hace 24 h</span><span>ahora</span></div>
        <p class="legend"><span>▮ noticias relevantes</span><span style="color:var(--down)">▮ impacto alto</span></p>
        <div id="sent-wrap"><strong style="font-size:14px">Sesgo de las noticias</strong><div class="sentiment" id="sent"></div><div class="legend" id="sent-legend"></div></div>
        <div id="cats" style="margin-top:12px"></div>
      </div>
    </div>
  </section>

  <div class="section-title"><h2>Lo que mueve <span>tu dinero</span></h2>
    <div class="tabs" id="scope"><button data-scope="" aria-pressed="true">Todo</button><button data-scope="global" aria-pressed="false">Mundo</button><button data-scope="nacional" aria-pressed="false">México</button></div>
  </div>
  <p class="note" id="delay"></p>
  <div class="grid">
    <section><div class="cards" id="cards"></div><p class="more"><button class="btn ghost" id="more" hidden>Ver más noticias</button></p></section>
    <aside class="stack">
      <div class="cta-box">
        <img src="/assets/logo-mark-light.svg" alt="" width="48" height="48">
        <h3>Entérate antes que nadie</h3>
        <p>Alertas en Telegram en cuanto sale la noticia, y un resumen de 5 minutos cada mañana con tu café.</p>
        <a class="btn" data-link="TELEGRAM_FREE">Unirme gratis en Telegram</a>
        <form class="sub"><input type="email" required placeholder="tu@email.com" aria-label="Email"><button class="btn ghost">Newsletter</button></form>
      </div>
      <div class="panel"><h3>🔥 Lo más leído</h3><ol class="rank" id="top"><li class="note">Cargando…</li></ol></div>
      <div class="panel" id="ediciones"><h3>☕ Ediciones del newsletter</h3><ul class="editions" id="archive"><li class="note">Cargando…</li></ul></div>
      <div class="panel"><h3>⭐ Lana con Café Pro</h3><p class="note">Alertas al instante, radar personal, IA que responde tus dudas y briefing a las 7:00.</p><a class="btn accent" href="/precios.html">Ver Pro · 500 ⭐/mes</a></div>
    </aside>
  </div>
</main>''')

page("mercados.html","Mercados en vivo · Lana con Café","Dólar, peso, bolsa mexicana, S&P 500, Nasdaq, bitcoin, petróleo y oro en tiempo real, con gráficas interactivas y calendario económico.",'''<main class="wrap">
  <section class="page-hero"><h1>Mercados en vivo</h1><p>El dólar, la bolsa mexicana, Wall Street, cripto y materias primas en una sola página. Toca un activo para ver su gráfica.</p></section>
  <div class="tabs" style="margin-bottom:12px">
    <button data-chart="FX_IDC:USDMXN" aria-pressed="true">Dólar / Peso</button><button data-chart="AMEX:EWW" aria-pressed="false">Bolsa México</button>
    <button data-chart="FOREXCOM:SPXUSD" aria-pressed="false">S&amp;P 500</button><button data-chart="FOREXCOM:NSXUSD" aria-pressed="false">Nasdaq</button>
    <button data-chart="BITSTAMP:BTCUSD" aria-pressed="false">Bitcoin</button><button data-chart="TVC:USOIL" aria-pressed="false">Petróleo</button><button data-chart="TVC:GOLD" aria-pressed="false">Oro</button>
  </div>
  <div class="panel tv-box tall" id="tv-chart" data-symbol="FX_IDC:USDMXN"></div>
  <div class="section-title"><h2>De un vistazo</h2></div>
  <div class="cards">
    <div class="panel tv-box" style="height:220px" data-tv-mini="FX_IDC:USDMXN"></div>
    <div class="panel tv-box" style="height:220px" data-tv-mini="AMEX:EWW"></div>
    <div class="panel tv-box" style="height:220px" data-tv-mini="FOREXCOM:SPXUSD"></div>
    <div class="panel tv-box" style="height:220px" data-tv-mini="BITSTAMP:BTCUSD"></div>
  </div>
  <div class="markets" style="margin-top:20px">
    <div><div class="section-title"><h2>Mapa de Wall Street</h2></div><div class="panel tv-box" id="tv-heatmap"></div></div>
    <div><div class="section-title"><h2>Agenda económica</h2></div><div class="panel tv-box" id="tv-calendar"></div></div>
  </div>
  <div class="section-title"><h2>Panorama por región</h2></div>
  <div class="panel tv-box" id="tv-overview"></div>
  <p class="note">Datos y gráficas de TradingView. Pueden tener retraso según el mercado.</p>
</main>''',"mercados.html")

page("precios.html","Lana con Café Pro · Precios","Alertas al instante en Telegram, radar personal, IA que responde tus dudas y briefing diario. Desde 500 Stars al mes en Telegram.",'''<main class="wrap">
<section class="page-hero"><h1>Entérate primero.</h1><p>El plan gratis te cuenta qué pasó. Pro te avisa mientras está pasando, y te explica qué significa para tu dinero.</p></section>
<div class="plans">
  <section class="panel plan">
    <h3>Gratis</h3>
    <div class="price">$0 <small>MXN</small></div>
    <ul><li>Newsletter diario (lun–vie)</li><li>Canal de Telegram con 15 min de retraso</li><li>Radar de 1 tema (con retraso) y 3 preguntas al día a la IA</li><li>Mercados en vivo en la web</li><li>3 días de Pro gratis con /prueba en el bot</li></ul>
    <a class="btn ghost" data-link="TELEGRAM_FREE">Unirme gratis</a>
  </section>
  <section class="panel plan featured">
    <h3>Pro <span class="chip">Más popular</span></h3>
    <div class="price">500 ⭐ <small>Stars / mes · ≈ $199 MXN</small></div>
    <ul><li><b>Alertas instantáneas</b> en canal privado de Telegram</li><li>🎯 <b>Radar personal</b>: 10 temas (peso, Banxico, Nvidia…) con aviso al momento</li><li>🤖 <b>Pregúntale a Lana</b>: 30 preguntas al día a la IA con las noticias de hoy</li><li>☀️ <b>Briefing personal</b> a las 7:00 con tu radar y la agenda</li><li>⏰ Recordatorio 15 min antes de cada dato clave</li><li>Activos afectados y sesgo probable en cada alerta</li><li>Cancela cuando quieras</li></ul>
    <a class="btn accent" data-link="PRO_LINK">⭐ Suscribirme en Telegram</a>
    <p class="note">Se paga dentro de Telegram con Stars (tarjeta, Apple Pay o Google Pay). Entras directo al canal Pro.</p>
    <p class="note">¿Primero quieres probar? <a data-link="BOT">3 días gratis en el bot</a> con /prueba.</p>
  </section>
  <section class="panel plan">
    <h3>API / Equipos</h3>
    <div class="price">$1,490 <small>MXN / mes</small></div>
    <ul><li>Todo lo de Pro</li><li>API JSON en tiempo real con clasificación de impacto</li><li>Ideal para traders, mesas, bots y medios</li><li>Soporte prioritario</li></ul>
    <a class="btn ghost" data-link="BOT">Pídela en el bot</a>
  </section>
</div>
<section class="faq">
  <details><summary>¿Qué tan rápido llegan las alertas Pro?</summary><p>Revisamos bancos centrales, reguladores y medios cada minuto. Las fuentes oficiales llegan en cuanto se publican, normalmente antes que la cobertura de los medios.</p></details>
  <details><summary>¿Me dicen qué comprar o vender?</summary><p>No. Damos información y contexto sobre el posible impacto. No es asesoría de inversión.</p></details>
  <details><summary>¿Cómo pago y entro al canal?</summary><p>Toca “Suscribirme en Telegram”: Telegram te muestra el precio en Stars, pagas ahí mismo y entras directo al canal Pro. En el bot se te activan solas las funciones Pro (radar, IA y briefing).</p></details>
  <details><summary>¿Qué son las Stars?</summary><p>Es la moneda de Telegram para pagar contenido digital. Se compran dentro de la app con tarjeta, Apple Pay o Google Pay.</p></details>
  <details><summary>¿Puedo cancelar?</summary><p>Sí, cuando quieras, desde los ajustes de Telegram (Stars → suscripciones). Al terminar el mes pagado sales del canal y Pro se desactiva.</p></details>
</section>
</main>''',"precios.html")

page("gracias.html","Bienvenido a Lana con Café Pro","Tu acceso a Lana con Café Pro.",'''<main class="wrap"><article class="ed"><h1>¡Bienvenido a Lana con Café Pro! ☕</h1><div id="access"><p>Preparando tu acceso…</p></div></article></main>''',"gracias.html")

page("edicion.html","Edición · Lana con Café","El resumen diario de lo que mueve el mercado.",'''<main class="wrap"><article class="ed" id="edition"><p>Cargando…</p></article>
<section class="cta-box" style="max-width:760px;margin-bottom:48px"><h3>¿Te la reenviaron?</h3><p>Recíbela gratis cada mañana con tu café.</p><form class="sub"><input type="email" required placeholder="tu@email.com" aria-label="Email"><button class="btn ghost">Suscribirme</button></form></section></main>''',"edicion.html")

page("marca.html","Marca · Lana con Café","Guía de marca de Lana con Café: logo, colores, tipografía y tono.",'''<main class="wrap">
<section class="page-hero"><h1>Lana con Café</h1><p>Las noticias que mueven tu dinero, con el primer café. Esta es la guía para que todo lo que publiquemos se vea y suene igual.</p></section>

<div class="section-title"><h2>Idea</h2></div>
<div class="panel"><p><b>Lana</b> es como se le dice al dinero en México; el <b>café</b> es el momento del día en que nos enteramos de las cosas. La marca es eso: un amigo que sabe de mercados y te lo cuenta claro mientras desayunas. La taza tiene adentro una gráfica al alza: el dinero que entiende lo que pasa.</p></div>

<div class="section-title"><h2>Logo</h2></div>
<div class="brand-grid">
  <div class="logo-tile" style="background:#F6EFE6"><div class="logo" style="color:#2B1A12"><img src="/assets/logo-mark.svg" width="64" height="64" alt=""><span style="font-size:28px">Lana <em>con</em> Café</span></div></div>
  <div class="logo-tile" style="background:#2B1A12"><div class="logo" style="color:#F6EFE6"><img src="/assets/logo-mark-light.svg" width="64" height="64" alt=""><span style="font-size:28px">Lana <em>con</em> Café</span></div></div>
  <div class="logo-tile" style="background:#C8742B"><img src="/assets/favicon.svg" width="96" height="96" alt="Icono"></div>
</div>
<p class="note">Archivos: <a href="/assets/logo-mark.svg">logo-mark.svg</a> · <a href="/assets/logo-mark-light.svg">logo-mark-light.svg</a> · <a href="/assets/favicon.svg">favicon.svg</a> (sirve como foto de perfil del bot y del canal).</p>

<div class="section-title"><h2>Colores</h2></div>
<div class="swatches">
  <div class="swatch"><div style="background:#2B1A12"></div><p><b>Espresso</b><br>#2B1A12 · texto y fondos oscuros</p></div>
  <div class="swatch"><div style="background:#F6EFE6"></div><p><b>Crema</b><br>#F6EFE6 · fondo principal</p></div>
  <div class="swatch"><div style="background:#6F4E37"></div><p><b>Café</b><br>#6F4E37 · secundario</p></div>
  <div class="swatch"><div style="background:#C8742B"></div><p><b>Canela</b><br>#C8742B · acento, botones</p></div>
  <div class="swatch"><div style="background:#1F9D55"></div><p><b>Verde lana</b><br>#1F9D55 · sube</p></div>
  <div class="swatch"><div style="background:#D64545"></div><p><b>Rojo</b><br>#D64545 · baja / urgente</p></div>
  <div class="swatch"><div style="background:#E2B33C"></div><p><b>Oro</b><br>#E2B33C · bancos centrales</p></div>
</div>

<div class="section-title"><h2>Tipografía</h2></div>
<div class="brand-grid">
  <div class="panel"><p class="note">Titulares</p><p style="font:800 40px/1.1 var(--serif);margin:0">Fraunces</p><p class="note">Serif editorial, cálida, de cafetería.</p></div>
  <div class="panel"><p class="note">Texto</p><p style="font:600 36px/1.1 var(--sans);margin:0">Inter</p><p class="note">Clara en pantallas y en tamaños pequeños.</p></div>
</div>

<div class="section-title"><h2>Tono</h2></div>
<div class="brand-grid">
  <div class="panel"><h3>Así sí ✅</h3><ul><li>“El dólar sube porque Banxico bajó la tasa; tus compras en dólares salen más caras.”</li><li>Claro, cercano, de México.</li><li>Datos con fuente.</li></ul></div>
  <div class="panel"><h3>Así no ❌</h3><ul><li>“¡COMPRA YA! 🚀🚀”</li><li>Jerga sin explicar.</li><li>Prometer ganancias o decir qué comprar.</li></ul></div>
</div>

<div class="section-title"><h2>Imágenes por categoría</h2></div>
<p class="note">Cuando una noticia no trae foto, se usa la de su categoría. También sirven para redes sociales (1200×630).</p>
<div class="cards">
  <img src="/assets/cat-bancos-centrales.jpg" alt="Bancos centrales" style="border-radius:12px"><img src="/assets/cat-inflacion.jpg" alt="Inflación" style="border-radius:12px">
  <img src="/assets/cat-divisas.jpg" alt="Divisas" style="border-radius:12px"><img src="/assets/cat-empresas.jpg" alt="Empresas" style="border-radius:12px">
  <img src="/assets/cat-geopolitica.jpg" alt="Geopolítica" style="border-radius:12px"><img src="/assets/cat-energia.jpg" alt="Energía" style="border-radius:12px">
  <img src="/assets/cat-cripto.jpg" alt="Cripto" style="border-radius:12px"><img src="/assets/cat-empleo.jpg" alt="Empleo" style="border-radius:12px">
  <img src="/assets/cat-general.jpg" alt="Mercados" style="border-radius:12px">
</div>
</main>''',"marca.html")
print("ok")

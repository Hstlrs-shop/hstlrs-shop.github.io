(() => {
  "use strict";

  const CFG = window.STORE_CONFIG;
  const CATALOG = window.CATALOG;
  const CART_KEY = "hstlrs_cart_v2";
  const COUPON_KEY = "hstlrs_coupon_v2";
  const PAGE = document.body.dataset.page;

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) =>
    new Intl.NumberFormat(CFG.locale, { style: "currency", currency: CFG.currency, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  const store = {
    get(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };
  const params = new URLSearchParams(location.search);

  const byId = (id) => CATALOG.find((p) => p.id === id);
  const variantId = (p, size, color) => p.shopify?.[size] ?? p.shopify?.[`${size}/${color}`] ?? null;
  const isAvailable = (p) => Boolean(p.published && p.shopify);
  const priceFor = (p, size) => p.sizePrice?.[size] ?? p.price;
  const imagesOf = (p, ci = 0) => [p.colors[ci]?.image || p.colors[0].image, ...(p.gallery || [])];
  const productUrl = (p) => `producto.html?id=${encodeURIComponent(p.id)}`;
  const categoryName = (id) => window.CATEGORIES.find((c) => c.id === id)?.name || id;

  const businessDays = (from, n) => {
    const d = new Date(from); let k = 0;
    while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) k++; }
    return d;
  };
  const eta = () => {
    const { processingDays: p, deliveryDays: t } = CFG.shipping;
    const f = new Intl.DateTimeFormat(CFG.locale, { day: "numeric", month: "short" });
    return `${f.format(businessDays(new Date(), p[0] + t[0]))} – ${f.format(businessDays(new Date(), p[1] + t[1]))}`;
  };

  /* ---------- Tarjeta de producto ---------- */
  function cardHTML(p) {
    const imgs = imagesOf(p);
    const badge = p.badge ? `<span class="badge ${p.compareAt ? "badge--accent" : ""}">${esc(p.badge)}</span>` : "";
    return `
      <a class="card" href="${productUrl(p)}">
        <div class="card__media">${badge}
          <img src="${esc(imgs[0])}" alt="${esc(p.name)}" loading="lazy">
          ${imgs[1] ? `<img src="${esc(imgs[1])}" alt="" loading="lazy">` : ""}
        </div>
        <div class="card__info">
          <h3>${esc(p.name)}</h3>
          <div class="card__meta">
            <span class="price">${money(p.price)}${p.compareAt ? `<s>${money(p.compareAt)}</s>` : ""}</span>
            ${p.colors.length > 1 ? `<span class="swatches">${p.colors.map((c) => `<span class="swatch" style="background:${c.hex}" title="${esc(c.name)}"></span>`).join("")}</span>` : ""}
          </div>
          <span class="status">${isAvailable(p) ? "Disponible" : "Próximamente"}</span>
        </div>
      </a>`;
  }

  /* ---------- Layout común ---------- */
  const ICONS = {
    menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"/></svg>',
  };

  function renderLayout() {
    const navItems = [
      ["tienda.html", "Tienda"],
      ["tienda.html?cat=playeras", "Playeras"],
      ["tienda.html?cat=sudaderas", "Sudaderas"],
      ["tienda.html?cat=gorras", "Gorras"],
      ["tienda.html?cat=arte", "Arte"],
    ];
    const here = location.pathname.split("/").pop() + location.search;
    const header = $("[data-header]");
    if (header) {
      header.outerHTML = `
      <div class="topbar">Envío gratis desde ${money(CFG.shipping.freeFrom)} · 10% en tu primer pedido con HSTLR10</div>
      <header class="header">
        <div class="wrap header__inner">
          <button class="icon-btn menu-btn" aria-label="Abrir menú" data-menu>${ICONS.menu}</button>
          <nav class="nav" data-nav aria-label="Principal">
            ${navItems.map(([h, t]) => `<a href="${h}" ${here === h ? 'aria-current="page"' : ""}>${t}</a>`).join("")}
          </nav>
          <a href="index.html" class="logo" aria-label="HSTLRS inicio">HSTLRS</a>
          <div class="header__actions">
            <button class="icon-btn" aria-label="Buscar" data-search-toggle>${ICONS.search}</button>
            <button class="icon-btn" aria-label="Carrito" data-cart-open>${ICONS.bag}<span class="cart-count" data-cart-count hidden>0</span></button>
          </div>
        </div>
        <form class="search-bar" data-search hidden action="tienda.html">
          <div class="wrap"><input type="search" name="q" placeholder="Buscar: hoodie, acueducto, gorra…" aria-label="Buscar productos"></div>
        </form>
      </header>`;
    }

    const footer = $("[data-footer]");
    if (footer) {
      footer.outerHTML = `
      <footer class="footer">
        <div class="wrap footer__grid">
          <div>
            <a href="index.html" class="logo">HSTLRS</a>
            <p>Streetwear hecho bajo pedido en México. Hecho a pulso.</p>
          </div>
          <div><h4>Tienda</h4>
            <a href="tienda.html">Todo</a><a href="tienda.html?cat=playeras">Playeras</a><a href="tienda.html?cat=sudaderas">Sudaderas</a><a href="tienda.html?cat=gorras">Gorras</a><a href="tienda.html?cat=arte">Arte</a>
          </div>
          <div><h4>Ayuda</h4>
            <a href="index.html#faq">Preguntas frecuentes</a><a href="#" data-legal="envios">Envíos</a><a href="#" data-legal="devoluciones">Cambios y devoluciones</a><a href="mailto:${esc(CFG.contactEmail)}">${esc(CFG.contactEmail)}</a>
          </div>
          <div><h4>Legal</h4>
            <a href="#" data-legal="privacidad">Privacidad</a><a href="#" data-legal="terminos">Términos</a>
          </div>
        </div>
        <div class="wrap footer__bottom"><span>© ${new Date().getFullYear()} HSTLRS</span><span>Pago seguro con Shopify · Visa · Mastercard · Amex · PayPal</span></div>
      </footer>
      <div class="overlay" data-overlay hidden></div>
      <aside class="drawer" data-drawer aria-label="Carrito" aria-hidden="true">
        <div class="drawer__head"><h3>Carrito</h3><button class="icon-btn" aria-label="Cerrar" data-cart-close>${ICONS.close}</button></div>
        <div class="ship"><span data-ship-msg></span><div class="ship__bar"><div class="ship__fill" data-ship-fill></div></div></div>
        <div class="drawer__items" data-cart-items></div>
        <div class="drawer__foot" data-cart-foot>
          <form class="coupon" data-coupon><input placeholder="Código de descuento" aria-label="Código de descuento"><button>Aplicar</button></form>
          <p class="coupon-msg" data-coupon-msg></p>
          <div class="totals">
            <div><span>Subtotal</span><span data-subtotal></span></div>
            <div data-discount-row hidden><span data-discount-label>Descuento</span><span data-discount></span></div>
            <div><span>Envío</span><span data-shipping></span></div>
            <div class="total"><span>Total estimado</span><span data-total></span></div>
          </div>
          <button class="btn btn--block" data-checkout>Pagar de forma segura</button>
          <p class="small">Entrega estimada ${eta()} · Hecho bajo pedido</p>
        </div>
      </aside>
      <dialog class="modal" data-modal><button class="icon-btn modal__close" aria-label="Cerrar" data-modal-close>${ICONS.close}</button><div class="modal__body" data-modal-body></div></dialog>
      <div class="toast" data-toast role="status" aria-live="polite"></div>
      <a class="wa" data-wa hidden target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${ICONS.wa}</a>`;
    }

    if (CFG.whatsapp && !/^\d{2}0+$/.test(CFG.whatsapp)) {
      const wa = $("[data-wa]");
      wa.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent("Hola HSTLRS, tengo una pregunta")}`;
      wa.hidden = false;
    }
  }

  /* ---------- Toast y modal ---------- */
  let toastT;
  function toast(msg) {
    const t = $("[data-toast]"); t.textContent = msg; t.classList.add("is-visible");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("is-visible"), 2400);
  }
  function modal(title, html) {
    $("[data-modal-body]").innerHTML = `<h2>${esc(title)}</h2>${html}`;
    $("[data-modal]").showModal();
  }

  const LEGAL = {
    envios: ["Envíos", `<p>Cada prenda se hace <strong>bajo pedido</strong>: la producimos en ${CFG.shipping.processingDays.join("–")} días hábiles y el envío tarda ${CFG.shipping.deliveryDays.join("–")} días hábiles más. Envío estándar ${money(CFG.shipping.cost)}; <strong>gratis desde ${money(CFG.shipping.freeFrom)}</strong>. Recibirás el número de seguimiento por correo.</p>`],
    devoluciones: ["Cambios y devoluciones", `<p>Tienes 30 días desde que recibes tu pedido para pedir un cambio o devolución: la prenda debe estar sin usar y con etiquetas. Si llega con un defecto o no es lo que pediste, avísanos en los primeros 7 días con fotos y te enviamos otra o te devolvemos el dinero. Escríbenos a ${esc(CFG.contactEmail)}.</p>`],
    privacidad: ["Privacidad", `<p>Usamos tus datos solo para preparar y enviar tu pedido, atenderte y, si te suscribes, enviarte novedades. Puedes pedir el acceso, la corrección o el borrado de tus datos en ${esc(CFG.contactEmail)}.</p>`],
    terminos: ["Términos", `<p>Precios en pesos mexicanos con IVA incluido. El pago se hace en el checkout seguro de Shopify. Si un producto no puede producirse tras tu compra, te avisamos y te reembolsamos completo. Estos términos no limitan tus derechos bajo la Ley Federal de Protección al Consumidor.</p>`],
  };

  /* ---------- Suscripción / avisos (clientes en Shopify) ---------- */
  function subscribe(email, tags) {
    if (!CFG.shopifyDomain || !email) return;
    let frame = $("#sub-frame");
    if (!frame) { frame = document.createElement("iframe"); frame.id = frame.name = "sub-frame"; frame.hidden = true; document.body.appendChild(frame); }
    const f = document.createElement("form");
    f.method = "POST"; f.action = `https://${CFG.shopifyDomain}/contact#contact_form`; f.target = frame.name; f.hidden = true;
    const fields = { form_type: "customer", utf8: "✓", "contact[email]": email, "contact[tags]": tags, "contact[accepts_marketing]": "true" };
    for (const [n, v] of Object.entries(fields)) { const i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i); }
    document.body.appendChild(f); f.submit(); f.remove();
  }

  /* ---------- Carrito ---------- */
  let cart = store.get(CART_KEY, []).filter((l) => { const p = byId(l.id); return p && isAvailable(p); });
  let coupon = store.get(COUPON_KEY, null);

  function add(id, color, size, qty = 1) {
    const key = `${id}|${color}|${size}`;
    const ex = cart.find((l) => `${l.id}|${l.color}|${l.size}` === key);
    if (ex) ex.qty = Math.min(10, ex.qty + qty); else cart.push({ id, color, size, qty });
    save(); toast("Agregado al carrito"); openCart();
  }
  function save() { store.set(CART_KEY, cart); renderCart(); }

  function totals() {
    const subtotal = cart.reduce((s, l) => s + priceFor(byId(l.id), l.size) * l.qty, 0);
    const c = coupon && CFG.coupons[coupon];
    let discount = 0, discountLabel = "";
    if (c && subtotal >= (c.minSubtotal || 0)) { discount = c.type === "percent" ? subtotal * c.value / 100 : Math.min(c.value, subtotal); discountLabel = coupon; }
    // Descuento automático por cantidad (no se combina con cupones: se aplica el mayor)
    const units = cart.reduce((s, l) => s + l.qty, 0);
    const mb = CFG.multiBuy;
    if (mb && units >= mb.minQty && subtotal * mb.percent / 100 > discount) { discount = subtotal * mb.percent / 100; discountLabel = `${mb.percent}% por ${mb.minQty}+ piezas`; }
    discount = Math.round(discount * 100) / 100;
    const after = subtotal - discount;
    const shipping = !cart.length || after >= CFG.shipping.freeFrom ? 0 : CFG.shipping.cost;
    return { subtotal, discount, discountLabel, units, after, shipping, total: after + shipping };
  }

  function renderCart() {
    const n = cart.reduce((s, l) => s + l.qty, 0);
    const cnt = $("[data-cart-count]"); if (!cnt) return;
    cnt.textContent = n; cnt.hidden = !n;
    const items = $("[data-cart-items]");
    items.innerHTML = cart.length
      ? cart.map((l, i) => {
          const p = byId(l.id); const ci = Math.max(0, p.colors.findIndex((c) => c.name === l.color));
          return `<div class="line"><img src="${esc(imagesOf(p, ci)[0])}" alt="">
            <div><strong>${esc(p.name)}</strong><span class="muted">${esc(l.color)} · ${esc(l.size)}</span><br>
              <span class="qty"><button data-q="${i}" data-d="-1" aria-label="Menos">−</button><span>${l.qty}</span><button data-q="${i}" data-d="1" aria-label="Más">+</button></span></div>
            <div class="line__end"><span>${money(priceFor(p, l.size) * l.qty)}</span><button class="link" data-rm="${i}">Quitar</button></div></div>`;
        }).join("")
      : `<div class="empty"><p>Tu carrito está vacío.</p><a class="btn btn--ghost" href="tienda.html">Ver la tienda</a></div>`;
    $("[data-cart-foot]").hidden = !cart.length;
    const t = totals();
    $("[data-subtotal]").textContent = money(t.subtotal);
    $("[data-discount-row]").hidden = !t.discount;
    $("[data-discount]").textContent = `−${money(t.discount)}`;
    $("[data-discount-label]").textContent = t.discountLabel ? `Descuento (${t.discountLabel})` : "Descuento";
    $("[data-shipping]").textContent = t.shipping ? money(t.shipping) : "Gratis";
    $("[data-total]").textContent = money(t.total);
    const left = CFG.shipping.freeFrom - t.after;
    $("[data-ship-fill]").style.width = `${Math.min(100, (t.after / CFG.shipping.freeFrom) * 100)}%`;
    $("[data-ship-msg]").innerHTML = left > 0 ? `Te faltan <strong>${money(left)}</strong> para el envío gratis` : "Tu pedido tiene <strong>envío gratis</strong>";
    const c = coupon && CFG.coupons[coupon];
    const mb = CFG.multiBuy;
    $("[data-coupon-msg]").textContent = c && t.discountLabel === coupon ? `${coupon} aplicado: ${c.label}`
      : t.units >= (mb?.minQty || Infinity) ? `${mb.percent}% automático por llevar ${mb.minQty} o más${c ? " (mejor que tu cupón)" : ""}`
      : mb && t.units > 0 ? `Agrega ${mb.minQty - t.units} pieza${mb.minQty - t.units === 1 ? "" : "s"} más y obtén ${mb.percent}% de descuento` : "";
  }

  const drawer = () => $("[data-drawer]");
  function openCart() { drawer().classList.add("is-open"); drawer().setAttribute("aria-hidden", "false"); $("[data-overlay]").hidden = false; }
  function closeCart() { drawer().classList.remove("is-open"); drawer().setAttribute("aria-hidden", "true"); $("[data-overlay]").hidden = true; $("[data-nav]")?.classList.remove("is-open"); }

  function checkout() {
    const parts = [];
    for (const l of cart) {
      const v = variantId(byId(l.id), l.size, l.color);
      if (!v) { toast("Un producto del carrito aún no está a la venta"); return; }
      parts.push(`${v}:${l.qty}`);
    }
    let url = `https://${CFG.shopifyDomain}/cart/${parts.join(",")}`;
    if (coupon) url += `?discount=${encodeURIComponent(coupon)}`;
    location.href = url;
  }

  /* ---------- Página: inicio ---------- */
  function initHome() {
    $("[data-cats]").innerHTML = window.CATEGORIES.filter((c) => !c.hidden)
      .map((c) => `<a class="cat" href="tienda.html?cat=${c.id}"><img src="${esc(c.image)}" alt="" loading="lazy"><span>${esc(c.name)}</span></a>`).join("");
    const featured = CATALOG.filter((p) => p.featured || p.collection === "STUDIO" && p.category === "playeras").slice(0, 8);
    $("[data-featured]").innerHTML = featured.map(cardHTML).join("");
    $("[data-essentials]").innerHTML = CATALOG.filter((p) => p.collection === "ESSENTIALS").slice(0, 4).map(cardHTML).join("");
    $("[data-lookbook]").innerHTML = window.LOOKBOOK.map((l) => `<img src="${esc(l.src)}" alt="${esc(l.alt)}" loading="lazy">`).join("");
    $("[data-pack-price]").textContent = `3 playeras CORE desde ${money(Math.round(799 * 3 * (1 - CFG.multiBuy.percent / 100)))}`;
  }

  /* ---------- Página: tienda ---------- */
  function initShop() {
    const state = { cat: params.get("cat") || "todo", q: (params.get("q") || "").trim().toLowerCase(), sort: "destacados" };
    const cats = ["todo", ...new Set(CATALOG.map((p) => p.category))];
    $("[data-chips]").innerHTML = cats.map((c) => `<button class="chip" data-cat="${c}">${c === "todo" ? "Todo" : esc(categoryName(c))}</button>`).join("");
    const title = $("[data-title]");

    const draw = () => {
      let list = CATALOG.filter((p) => (state.cat === "todo" || p.category === state.cat) &&
        (!state.q || `${p.name} ${p.description} ${p.category} ${p.collection}`.toLowerCase().includes(state.q)));
      const sorters = {
        destacados: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0),
        "precio-asc": (a, b) => a.price - b.price,
        "precio-desc": (a, b) => b.price - a.price,
      };
      list = [...list].sort(sorters[state.sort]);
      $("[data-grid]").innerHTML = list.map(cardHTML).join("") || `<p class="muted">No encontramos productos con esa búsqueda.</p>`;
      $("[data-count]").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;
      $$("[data-cat]").forEach((b) => b.classList.toggle("is-active", b.dataset.cat === state.cat));
      title.textContent = state.q ? `“${state.q}”` : state.cat === "todo" ? "Tienda" : categoryName(state.cat);
      document.title = `${title.textContent} — HSTLRS`;
    };
    $("[data-chips]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      state.cat = b.dataset.cat; state.q = "";
      history.replaceState(null, "", state.cat === "todo" ? "tienda.html" : `tienda.html?cat=${state.cat}`);
      draw();
    });
    $("[data-sort]").addEventListener("change", (e) => { state.sort = e.target.value; draw(); });
    draw();
  }

  /* ---------- Página: producto ---------- */
  const SIZE_GUIDE = `<p>Medidas de la prenda extendida (playeras CORE, Comfort Colors 1717):</p>
    <table class="size-table"><thead><tr><th>Talla</th><th>Ancho de pecho (cm)</th><th>Largo (cm)</th></tr></thead><tbody>
    <tr><td>S</td><td>51</td><td>71</td></tr><tr><td>M</td><td>56</td><td>74</td></tr><tr><td>L</td><td>61</td><td>76</td></tr>
    <tr><td>XL</td><td>66</td><td>79</td></tr><tr><td>2XL</td><td>71</td><td>81</td></tr></tbody></table>
    <p class="muted">Corte relajado. Para el look oversize de las fotos, pide una talla más de la que usas normalmente.</p>`;

  function initProduct() {
    const p = byId(params.get("id"));
    const root = $("[data-pdp]");
    if (!p) { root.innerHTML = `<div class="page-head"><h1>No encontrado</h1><p><a href="tienda.html">Volver a la tienda</a></p></div>`; return; }
    document.title = `${p.name} — HSTLRS`;
    const sel = { ci: 0, size: p.sizes.length === 1 ? p.sizes[0] : null, qty: 1 };
    const avail = isAvailable(p);

    const draw = () => {
      const imgs = imagesOf(p, sel.ci);
      const price = priceFor(p, sel.size);
      root.innerHTML = `
        <div class="pdp__gallery">${imgs.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name)}${i ? "" : " — " + esc(p.colors[sel.ci].name)}" ${i ? 'loading="lazy"' : ""}>`).join("")}</div>
        <div class="pdp__info">
          <div class="crumbs"><a href="tienda.html">Tienda</a> / <a href="tienda.html?cat=${p.category}">${esc(categoryName(p.category))}</a> / ${esc(p.collection)}</div>
          <h1>${esc(p.name)}</h1>
          <div class="pdp__price">${money(price)}${p.compareAt ? `<s>${money(p.compareAt)}</s>` : ""}</div>
          <p class="pdp__desc">${esc(p.description)}</p>
          ${p.colors.length > 1 ? `<div><div class="opt__label"><span>Color: ${esc(p.colors[sel.ci].name)}</span></div>
            <div class="opt__row">${p.colors.map((c, i) => `<button class="color ${i === sel.ci ? "is-active" : ""}" style="background:${c.hex}" aria-label="${esc(c.name)}" data-ci="${i}"></button>`).join("")}</div></div>` : ""}
          <div><div class="opt__label"><span>Talla${sel.size ? `: ${esc(sel.size)}` : ""}</span>${p.category === "playeras" || p.category === "sudaderas" || p.category === "packs" ? '<button class="link" data-guide>Guía de tallas</button>' : ""}</div>
            <div class="opt__row">${p.sizes.map((s) => `<button class="size ${s === sel.size ? "is-active" : ""}" data-size="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
          ${avail
            ? `<button class="btn btn--block" data-add>Agregar al carrito — ${money(price)}</button><p class="pdp__msg" data-msg></p>`
            : `<div class="notice"><strong>Próximamente</strong><span>Estamos preparando la producción. Déjanos tu correo y te avisamos en cuanto salga, con 10% de descuento.</span>
                <form class="form-row" data-notify><input type="email" required placeholder="tu@email.com" aria-label="Correo"><button class="btn">Avísame</button></form></div>`}
          <ul class="trust"><li>Hecho bajo pedido · entrega estimada ${eta()}</li><li>Envío gratis desde ${money(CFG.shipping.freeFrom)}</li><li>Cambios y devoluciones en 30 días</li></ul>
          <div class="acc">
            <details open><summary>Detalles</summary><ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></details>
            <details><summary>Envíos y devoluciones</summary><p>${LEGAL.envios[1]} ${LEGAL.devoluciones[1]}</p></details>
          </div>
        </div>`;
    };

    root.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.ci) { sel.ci = +t.dataset.ci; draw(); }
      else if (t.dataset.size) { sel.size = t.dataset.size; draw(); }
      else if (t.hasAttribute("data-guide")) modal("Guía de tallas", SIZE_GUIDE);
      else if (t.hasAttribute("data-add")) {
        if (!sel.size) { $("[data-msg]").textContent = "Elige tu talla"; return; }
        add(p.id, p.colors[sel.ci].name, sel.size);
      }
    });
    root.addEventListener("submit", (e) => {
      if (!e.target.matches("[data-notify]")) return;
      e.preventDefault();
      const email = e.target.querySelector("input").value.trim();
      subscribe(email, `newsletter, aviso-${p.id}`);
      e.target.reset();
      modal("Te avisamos", `<p>Te escribiremos a <strong>${esc(email)}</strong> en cuanto <strong>${esc(p.name)}</strong> esté disponible. Mientras, guarda tu código de bienvenida:</p><p class="code">HSTLR10</p>`);
    });
    draw();

    // Datos estructurados para Google (resultados con precio y disponibilidad)
    const abs = (u) => new URL(u, location.href).href;
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, description: p.description, brand: { "@type": "Brand", name: "HSTLRS" },
      image: imagesOf(p).map(abs), sku: p.id, category: categoryName(p.category),
      offers: {
        "@type": "Offer", url: location.href, priceCurrency: CFG.currency, price: p.price,
        availability: avail ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        itemCondition: "https://schema.org/NewCondition",
      },
    });
    document.head.appendChild(ld);
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = location.href;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.content = `${p.name} — ${p.description}`.slice(0, 155);

    const related = CATALOG.filter((x) => x.id !== p.id && (x.category === p.category || x.collection === p.collection)).slice(0, 4);
    $("[data-related]").innerHTML = related.map(cardHTML).join("");
  }

  /* ---------- Asistente de atención 24/7 ----------
   * Con CFG.chat.endpoint (Worker de soporte-ia) responde con IA (Claude).
   * Sin él, o si falla, responde con la base de conocimiento local de abajo. */
  const CHAT_KEY = "hstlrs_chat_v1";
  const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const has = (q, words) => words.some((w) => q.includes(w));

  function localAnswer(text) {
    const q = fold(text);
    const s = CFG.shipping;
    const contact = `Si necesitas ayuda personal, escríbenos a ${CFG.contactEmail}.`;
    if (has(q, ["hola", "buenas", "que tal", "hey"]) && q.length < 25) {
      return "¡Hola! Soy el asistente de HSTLRS. Pregúntame por envíos, tallas, cambios, pagos, tu pedido o cualquier producto.";
    }
    if (has(q, ["donde esta mi pedido", "rastre", "seguimiento", "mi pedido", "mi orden", "guia", "tracking"])) {
      return `Cuando tu pedido sale del taller te llega un correo con el número de seguimiento; puedes rastrearlo en https://t.17track.net . En el correo de confirmación también está el enlace "Ver tu pedido". Si ya pasaron más de ${s.processingDays[1] + s.deliveryDays[1]} días hábiles, escríbenos a ${CFG.contactEmail} con tu número de pedido.`;
    }
    if (has(q, ["envio", "envian", "tarda", "llega", "entrega", "dias", "paqueteria", "costo de envio"])) {
      return `Cada prenda se hace bajo pedido: la producimos en ${s.processingDays.join(" a ")} días hábiles y el envío tarda ${s.deliveryDays.join(" a ")} días hábiles más. El envío cuesta ${money(s.cost)} y es gratis desde ${money(s.freeFrom)}. Entrega estimada si pides hoy: ${eta()}.`;
    }
    if (has(q, ["talla", "medida", "queda", "oversize", "grande", "chica", "size"])) {
      return "Las playeras CORE tienen corte relajado: S 51 cm de ancho de pecho, M 56, L 61, XL 66, 2XL 71. Para el look oversize de las fotos pide una talla más. Hoodie, crewneck y jogger son de corte regular (igual: una talla más para oversize). Gorra y beanie son talla única. Cada producto tiene su \"Guía de tallas\".";
    }
    if (has(q, ["devol", "cambio", "reembolso", "regres", "defect", "roto", "mal estado"])) {
      return `Tienes 30 días desde que recibes tu pedido para cambios o devoluciones (prenda sin usar y con etiquetas). Si llegó con un defecto, mándanos fotos a ${CFG.contactEmail} en los primeros 7 días y lo reponemos sin costo.`;
    }
    if (has(q, ["pago", "pagar", "tarjeta", "paypal", "oxxo", "efectivo", "meses", "apple pay"])) {
      return "Pagas en el checkout seguro de Shopify con tarjeta de crédito o débito, PayPal, Shop Pay, Apple Pay o Google Pay.";
    }
    if (has(q, ["descuento", "cupon", "codigo", "promo", "oferta"])) {
      return `Usa el cupón HSTLR10 para 10% en tu primer pedido. Y si llevas 3 o más piezas, se aplica 15% automático al pagar (no se combinan: se aplica el mayor).`;
    }
    if (has(q, ["contacto", "humano", "persona", "alguien", "hablar", "asesor", "agente", "whatsapp", "correo", "email", "telefono", "queja"])) {
      return `Escríbenos a ${CFG.contactEmail} y te responde una persona del equipo.`;
    }
    // Productos: busca coincidencias por nombre, categoría o color
    const words = q.split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2);
    const hits = CATALOG.map((p) => {
      const hay = fold(`${p.name} ${categoryName(p.category)} ${p.category} ${p.colors.map((c) => c.name).join(" ")} ${p.collection}`);
      return { p, score: words.filter((w) => hay.includes(w) || hay.includes(w.replace(/s$/, ""))).length };
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score || Number(isAvailable(b.p)) - Number(isAvailable(a.p))).slice(0, 3);
    if (hits.length) {
      const base = location.href.replace(/[^/]*$/, "");
      return "Esto es lo que tenemos:\n" + hits.map(({ p }) =>
        `• ${p.name} — ${money(p.price)} ${isAvailable(p) ? "(disponible)" : "(próximamente: deja tu correo en \"Avísame\")"}: ${base}${productUrl(p)}`).join("\n");
    }
    return `No estoy seguro de cómo ayudarte con eso. Puedo responderte sobre envíos, tallas, cambios, pagos, descuentos o productos. ${contact}`;
  }

  function initChat() {
    const root = document.createElement("div");
    root.className = "chat";
    root.innerHTML = `
      <button class="chat__fab" data-chat-toggle aria-label="Abrir chat de ayuda">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>
      </button>
      <section class="chat__panel" data-chat-panel hidden aria-label="Chat de ayuda">
        <header class="chat__head"><div><strong>Ayuda HSTLRS</strong><span>Respuesta inmediata · 24/7</span></div>
          <button class="icon-btn" data-chat-toggle aria-label="Cerrar chat">${ICONS.close}</button></header>
        <div class="chat__log" data-chat-log aria-live="polite"></div>
        <div class="chat__quick" data-chat-quick>
          ${["¿Cuánto tarda el envío?", "¿Qué talla pido?", "¿Dónde está mi pedido?", "Cambios y devoluciones"].map((t) => `<button data-chat-q="${esc(t)}">${esc(t)}</button>`).join("")}
        </div>
        <form class="chat__form" data-chat-form><input placeholder="Escribe tu pregunta…" aria-label="Tu pregunta" maxlength="600" autocomplete="off"><button class="btn" aria-label="Enviar">Enviar</button></form>
      </section>`;
    document.body.appendChild(root);

    const log = $("[data-chat-log]", root);
    let history = (() => { try { return JSON.parse(sessionStorage.getItem(CHAT_KEY)) || []; } catch { return []; } })();
    const persist = () => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(history.slice(-30))); } catch { /* sin almacenamiento */ } };
    const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, "").slice(0, 48)}${u.length > 56 ? "…" : ""}</a>`).replace(/\n/g, "<br>");
    const bubble = (role, text) => {
      const d = document.createElement("div");
      d.className = `chat__msg chat__msg--${role}`;
      d.innerHTML = linkify(text);
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    };
    const greet = "¡Hola! Soy el asistente de HSTLRS. ¿En qué te ayudo? Pregúntame por envíos, tallas, cambios, pagos, tu pedido o cualquier producto.";
    if (!history.length) history.push({ role: "assistant", content: greet });
    history.forEach((m) => bubble(m.role, m.content));

    async function ask(text) {
      text = text.trim(); if (!text) return;
      $("[data-chat-quick]", root).hidden = true;
      history.push({ role: "user", content: text }); bubble("user", text); persist();
      const typing = bubble("assistant", "Escribiendo…"); typing.classList.add("is-typing");
      let reply = "";
      if (CFG.chat?.endpoint) {
        try {
          const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 45000);
          const res = await fetch(CFG.chat.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-20) }), signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) reply = (await res.json()).reply || "";
        } catch { /* sin conexión con la IA: respuesta local */ }
      }
      if (!reply) reply = localAnswer(text);
      typing.remove();
      history.push({ role: "assistant", content: reply }); bubble("assistant", reply); persist();
    }

    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-chat-toggle],[data-chat-q]"); if (!t) return;
      if (t.matches("[data-chat-toggle]")) { const p = $("[data-chat-panel]", root); p.hidden = !p.hidden; if (!p.hidden) $("[data-chat-form] input", root).focus(); }
      else ask(t.dataset.chatQ);
    });
    $("[data-chat-form]", root).addEventListener("submit", (e) => { e.preventDefault(); const i = e.target.querySelector("input"); ask(i.value); i.value = ""; });
  }

  /* ---------- Eventos globales ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-cart-open],[data-cart-close],[data-overlay],[data-menu],[data-search-toggle],[data-legal],[data-q],[data-rm],[data-checkout],[data-modal-close]");
      if (!t) return;
      if (t.matches("[data-cart-open]")) openCart();
      else if (t.matches("[data-cart-close],[data-overlay]")) closeCart();
      else if (t.matches("[data-menu]")) { $("[data-nav]").classList.toggle("is-open"); $("[data-overlay]").hidden = !$("[data-nav]").classList.contains("is-open"); }
      else if (t.matches("[data-search-toggle]")) { const s = $("[data-search]"); s.hidden = !s.hidden; if (!s.hidden) s.querySelector("input").focus(); }
      else if (t.matches("[data-legal]")) { e.preventDefault(); modal(...LEGAL[t.dataset.legal]); }
      else if (t.matches("[data-q]")) { const l = cart[+t.dataset.q]; l.qty += +t.dataset.d; if (l.qty < 1) cart.splice(+t.dataset.q, 1); else l.qty = Math.min(10, l.qty); save(); }
      else if (t.matches("[data-rm]")) { cart.splice(+t.dataset.rm, 1); save(); }
      else if (t.matches("[data-checkout]")) checkout();
      else if (t.matches("[data-modal-close]")) $("[data-modal]").close();
    });
    $("[data-modal]").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });
    $("[data-coupon]").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = e.target.querySelector("input").value.trim().toUpperCase();
      if (CFG.coupons[code]) { coupon = code; store.set(COUPON_KEY, code); e.target.reset(); renderCart(); }
      else $("[data-coupon-msg]").textContent = "Ese código no es válido";
    });
    $$("[data-club]").forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = f.querySelector("input").value.trim();
      subscribe(email, "newsletter, club");
      f.reset();
      modal("Bienvenido al club", `<p>Tu código para el primer pedido:</p><p class="code">HSTLR10</p><p class="muted">10% de descuento en todo el carrito.</p>`);
    }));
  }

  /* ---------- Inicio ---------- */
  renderLayout();
  bind();
  renderCart();
  initChat();
  if (PAGE === "home") initHome();
  if (PAGE === "shop") initShop();
  if (PAGE === "product") initProduct();
})();

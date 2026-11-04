(() => {
  "use strict";

  const CFG = window.STORE_CONFIG;
  const PRODUCTS = window.PRODUCTS;
  const CART_KEY = "hstlrs_cart_v1";
  const COUPON_KEY = "hstlrs_coupon_v1";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const money = (n) =>
    new Intl.NumberFormat(CFG.locale, { style: "currency", currency: CFG.currency }).format(n);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const storage = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
    },
  };

  /* ---------- Ilustraciones SVG por tipo de prenda ---------- */
  const SHAPES = {
    hoodie: `<path d="M70 40c8-10 52-10 60 0l34 22 16 46-24 10-10-26v88H54V82l-10 26-24-10 16-46Z"/><path d="M72 46c-4-30 60-30 56 0l-8 18c-10 8-30 8-40 0Z" fill="rgba(0,0,0,.22)"/><path d="M92 64v26M108 64v26" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/><rect x="74" y="122" width="52" height="26" rx="6" fill="rgba(0,0,0,.18)"/>`,
    tee: `<path d="M72 38c10 12 46 12 56 0l38 20 16 34-28 12-8-16v92H54V88l-8 16-28-12 16-34Z"/><path d="M80 40c6 10 34 10 40 0" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="4"/>`,
    pants: `<path d="M62 30h76l10 160h-36l-12-110-12 110H52Z"/><rect x="62" y="30" width="76" height="12" fill="rgba(0,0,0,.2)"/><rect x="56" y="100" width="18" height="24" rx="3" fill="rgba(0,0,0,.18)"/><rect x="126" y="100" width="18" height="24" rx="3" fill="rgba(0,0,0,.18)"/>`,
    cap: `<path d="M44 118c0-40 26-62 56-62s56 22 56 62Z"/><path d="M40 118h120c14 0 20 8 20 14H54c-8 0-14-6-14-14Z" fill="rgba(0,0,0,.25)"/><circle cx="100" cy="56" r="5" fill="rgba(0,0,0,.25)"/>`,
    beanie: `<path d="M50 130c0-50 22-78 50-78s50 28 50 78Z"/><rect x="44" y="124" width="112" height="34" rx="8"/><rect x="44" y="124" width="112" height="34" rx="8" fill="rgba(0,0,0,.15)"/><rect x="88" y="132" width="24" height="16" rx="2" fill="rgba(255,255,255,.6)"/>`,
    bag: `<path d="M60 70 140 40" stroke="currentColor" stroke-width="8" fill="none"/><rect x="40" y="80" width="120" height="70" rx="22"/><path d="M50 108h100" stroke="rgba(255,255,255,.3)" stroke-width="3"/>`,
    socks: `<path d="M70 30h30v90l28 22c12 10 4 30-12 28l-40-6c-12-2-18-12-16-24Z"/><path d="M108 36h30v90l28 22c12 10 4 30-12 28l-40-6c-12-2-18-12-16-24Z" opacity=".75"/><rect x="70" y="30" width="30" height="12" fill="rgba(0,0,0,.2)"/>`,
  };

  const lighten = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#e6e2da" : "#f1efe9";
  };

  function productArt(product, colorIndex = 0) {
    if (product.image) {
      return `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy">`;
    }
    const color = product.colors[colorIndex] || product.colors[0];
    return `<svg viewBox="0 0 200 200" role="img" aria-label="${esc(product.name)} en ${esc(color.name)}" style="background:${lighten(color.hex)};color:${color.hex}"><g fill="${color.hex}">${SHAPES[product.shape] || SHAPES.tee}</g></svg>`;
  }

  const discountPct = (p) => (p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0);

  /* ---------- Fechas de entrega ---------- */
  function addBusinessDays(date, days) {
    const d = new Date(date);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  }
  function etaText() {
    const { processingDays: p, deliveryDays: t } = CFG.shipping;
    const fmt = new Intl.DateTimeFormat(CFG.locale, { day: "numeric", month: "short" });
    const from = addBusinessDays(new Date(), p[0] + t[0]);
    const to = addBusinessDays(new Date(), p[1] + t[1]);
    return `${fmt.format(from)} – ${fmt.format(to)}`;
  }

  /* ---------- Textos dinámicos de configuración ---------- */
  function fillConfigText() {
    const track = $(".announce__track");
    track.innerHTML += track.innerHTML; // duplicado para el desplazamiento continuo
    const s = CFG.shipping;
    $$("[data-free-shipping]").forEach((el) => (el.textContent = money(s.freeFrom)));
    $$("[data-shipping-cost]").forEach((el) => (el.textContent = money(s.cost)));
    $$("[data-delivery-range]").forEach((el) => (el.textContent = `${s.deliveryDays[0]}–${s.deliveryDays[1]}`));
    $$("[data-processing]").forEach((el) => (el.textContent = `${s.processingDays[0]}–${s.processingDays[1]}`));
    $$("[data-contact-email]").forEach((el) => {
      el.textContent = CFG.contactEmail;
      el.href = `mailto:${CFG.contactEmail}`;
    });
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    $$("[data-eta]").forEach((el) => (el.textContent = etaText()));

    const a = PRODUCTS.find((p) => p.shape === "hoodie");
    const b = PRODUCTS.find((p) => p.shape === "pants");
    if (a) $("[data-hero-a]").innerHTML = productArt(a, 1);
    if (b) $("[data-hero-b]").innerHTML = productArt(b, 0);
  }

  /* ---------- Catálogo ---------- */
  const state = { filter: "todo", sort: "destacados", query: "" };

  function visibleProducts() {
    const q = state.query.trim().toLowerCase();
    let list = PRODUCTS.filter(
      (p) =>
        (state.filter === "todo" || p.category === state.filter) &&
        (!q || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q))
    );
    const sorters = {
      destacados: (a, b) => (a.featured ?? 99) - (b.featured ?? 99),
      "precio-asc": (a, b) => a.price - b.price,
      "precio-desc": (a, b) => b.price - a.price,
      nuevos: (a, b) => b.added.localeCompare(a.added),
    };
    return list.sort(sorters[state.sort]);
  }

  function renderGrid() {
    const list = visibleProducts();
    $("[data-empty]").hidden = list.length > 0;
    $("[data-grid]").innerHTML = list
      .map((p) => {
        const pct = discountPct(p);
        return `
        <article class="card" data-id="${p.id}">
          <button class="card__media" data-open="${p.id}" aria-label="Ver ${esc(p.name)}">
            ${productArt(p)}
            ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
            ${pct ? `<span class="badge badge--sale">-${pct}%</span>` : ""}
          </button>
          <div class="card__info">
            <h3><button data-open="${p.id}">${esc(p.name)}</button></h3>
            <div class="price">
              <span>${money(p.price)}</span>
              ${p.compareAt ? `<s>${money(p.compareAt)}</s>` : ""}
            </div>
            <div class="swatches">
              ${p.colors.map((c, i) => `<span class="swatch" style="background:${c.hex}" title="${esc(c.name)}" data-swatch="${i}"></span>`).join("")}
            </div>
          </div>
          <button class="btn btn--primary btn--sm card__add" data-quick-add="${p.id}">Añadir</button>
        </article>`;
      })
      .join("");
  }

  function setFilter(filter) {
    state.filter = filter;
    $$("[data-filter]").forEach((b) => b.classList.toggle("is-active", b.dataset.filter === filter));
    renderGrid();
  }

  /* ---------- Modal de producto ---------- */
  const productModal = $("[data-product-modal]");
  const infoModal = $("[data-info-modal]");

  const SIZE_GUIDE = `
    <table class="size-table">
      <thead><tr><th>Talla</th><th>Pecho (cm)</th><th>Largo (cm)</th></tr></thead>
      <tbody>
        <tr><td>S</td><td>108</td><td>68</td></tr>
        <tr><td>M</td><td>114</td><td>70</td></tr>
        <tr><td>L</td><td>120</td><td>72</td></tr>
        <tr><td>XL</td><td>126</td><td>74</td></tr>
        <tr><td>XXL</td><td>132</td><td>76</td></tr>
      </tbody>
    </table>
    <p class="muted">Corte oversize: si prefieres ajuste regular, elige una talla menos.</p>`;

  function openProduct(id) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    const sel = { color: 0, size: p.sizes.length === 1 ? p.sizes[0] : null, qty: 1 };
    const pct = discountPct(p);
    const body = $("[data-product-body]");

    const draw = () => {
      body.innerHTML = `
        <div class="pm">
          <div class="pm__media">${productArt(p, sel.color)}</div>
          <div class="pm__info">
            ${p.badge ? `<span class="badge badge--inline">${esc(p.badge)}</span>` : ""}
            <h2 id="pm-title">${esc(p.name)}</h2>
            <div class="price price--lg">
              <span>${money(p.price)}</span>
              ${p.compareAt ? `<s>${money(p.compareAt)}</s><em>Ahorras ${money(p.compareAt - p.price)} (-${pct}%)</em>` : ""}
            </div>
            <p>${esc(p.description)}</p>

            <div class="opt">
              <span class="opt__label">Color: <strong>${esc(p.colors[sel.color].name)}</strong></span>
              <div class="opt__row">
                ${p.colors.map((c, i) => `<button class="swatch swatch--lg ${i === sel.color ? "is-active" : ""}" style="background:${c.hex}" aria-label="${esc(c.name)}" data-pick-color="${i}"></button>`).join("")}
              </div>
            </div>

            <div class="opt">
              <span class="opt__label">Talla ${p.sizes.length > 1 ? `<button class="link" data-size-guide>Guía de tallas</button>` : ""}</span>
              <div class="opt__row">
                ${p.sizes.map((s) => `<button class="size ${s === sel.size ? "is-active" : ""}" data-pick-size="${esc(s)}">${esc(s)}</button>`).join("")}
              </div>
            </div>

            <div class="pm__buy">
              <div class="qty">
                <button data-qty="-1" aria-label="Menos">−</button>
                <span>${sel.qty}</span>
                <button data-qty="1" aria-label="Más">+</button>
              </div>
              <button class="btn btn--primary btn--block" data-add-current>Añadir al carrito · ${money(p.price * sel.qty)}</button>
            </div>
            <p class="pm__msg" data-pm-msg></p>

            <ul class="pm__trust">
              <li>🚚 Entrega estimada: <strong>${etaText()}</strong></li>
              <li>↩️ Devolución gratuita en 30 días</li>
              <li>🔒 Pago seguro y cifrado</li>
            </ul>
            <details class="pm__details">
              <summary>Composición y cuidados</summary>
              <ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
            </details>
          </div>
        </div>`;
    };

    body.onclick = (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.pickColor) { sel.color = +t.dataset.pickColor; draw(); }
      else if (t.dataset.pickSize) { sel.size = t.dataset.pickSize; draw(); }
      else if (t.dataset.qty) { sel.qty = Math.max(1, Math.min(10, sel.qty + +t.dataset.qty)); draw(); }
      else if (t.hasAttribute("data-size-guide")) { openInfo("Guía de tallas", SIZE_GUIDE); }
      else if (t.hasAttribute("data-add-current")) {
        if (!sel.size) {
          $("[data-pm-msg]").textContent = "Elige una talla para continuar.";
          return;
        }
        addToCart(p.id, p.colors[sel.color].name, sel.size, sel.qty);
        productModal.close();
        openCart();
      }
    };

    draw();
    productModal.showModal();
  }

  function openInfo(title, html) {
    $("[data-info-body]").innerHTML = `<h2>${esc(title)}</h2>${html}`;
    infoModal.showModal();
  }

  $$("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) d.close();
    });
  });

  /* ---------- Carrito ---------- */
  let cart = storage.get(CART_KEY, []).filter((i) => PRODUCTS.some((p) => p.id === i.id));
  let coupon = storage.get(COUPON_KEY, null);

  const lineKey = (i) => `${i.id}|${i.color}|${i.size}`;

  function addToCart(id, color, size, qty = 1) {
    const existing = cart.find((i) => lineKey(i) === `${id}|${color}|${size}`);
    if (existing) existing.qty = Math.min(10, existing.qty + qty);
    else cart.push({ id, color, size, qty });
    saveCart();
    toast("Añadido al carrito ✓");
  }

  function saveCart() {
    storage.set(CART_KEY, cart);
    renderCart();
  }

  function totals() {
    const subtotal = cart.reduce((s, i) => s + PRODUCTS.find((p) => p.id === i.id).price * i.qty, 0);
    let discount = 0;
    const c = coupon && CFG.coupons[coupon];
    if (c && subtotal >= (c.minSubtotal || 0)) {
      discount = c.type === "percent" ? subtotal * (c.value / 100) : Math.min(c.value, subtotal);
    }
    const afterDiscount = subtotal - discount;
    const shipping = cart.length === 0 || afterDiscount >= CFG.shipping.freeFrom ? 0 : CFG.shipping.cost;
    return { subtotal, discount, shipping, total: afterDiscount + shipping, afterDiscount };
  }

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    $("[data-cart-count]").textContent = count;
    $("[data-cart-count]").classList.toggle("is-visible", count > 0);

    const itemsEl = $("[data-cart-items]");
    if (!cart.length) {
      itemsEl.innerHTML = `<div class="cart-empty"><p>Tu carrito está vacío.</p><a href="#tienda" class="btn btn--primary btn--sm" data-cart-close>Ver productos</a></div>`;
    } else {
      itemsEl.innerHTML = cart
        .map((i, idx) => {
          const p = PRODUCTS.find((x) => x.id === i.id);
          const ci = Math.max(0, p.colors.findIndex((c) => c.name === i.color));
          return `
          <div class="line">
            <div class="line__media">${productArt(p, ci)}</div>
            <div class="line__info">
              <strong>${esc(p.name)}</strong>
              <span class="muted">${esc(i.color)} · ${esc(i.size)}</span>
              <div class="qty qty--sm">
                <button data-line-qty="${idx}" data-delta="-1" aria-label="Menos">−</button>
                <span>${i.qty}</span>
                <button data-line-qty="${idx}" data-delta="1" aria-label="Más">+</button>
              </div>
            </div>
            <div class="line__end">
              <span>${money(p.price * i.qty)}</span>
              <button class="link" data-line-remove="${idx}">Eliminar</button>
            </div>
          </div>`;
        })
        .join("");
    }

    const t = totals();
    $("[data-subtotal]").textContent = money(t.subtotal);
    $("[data-discount-row]").hidden = t.discount === 0;
    $("[data-discount]").textContent = `−${money(t.discount)}`;
    $("[data-shipping]").textContent = t.shipping === 0 ? (cart.length ? "Gratis" : "—") : money(t.shipping);
    $("[data-total]").textContent = money(t.total);
    $("[data-checkout]").disabled = cart.length === 0;

    const remaining = CFG.shipping.freeFrom - t.afterDiscount;
    const pct = Math.min(100, (t.afterDiscount / CFG.shipping.freeFrom) * 100);
    $("[data-shipping-fill]").style.width = `${pct}%`;
    $("[data-shipping-msg]").innerHTML =
      remaining > 0
        ? `Te faltan <strong>${money(remaining)}</strong> para el envío <strong>gratis</strong> 🚚`
        : `¡Genial! Tu pedido tiene <strong>envío gratis</strong> 🎉`;

    const c = coupon && CFG.coupons[coupon];
    const msg = $("[data-coupon-msg]");
    if (c) {
      msg.textContent =
        t.subtotal >= (c.minSubtotal || 0)
          ? `Código ${coupon} aplicado: ${c.label}.`
          : `${coupon} requiere un subtotal mínimo de ${money(c.minSubtotal)}.`;
    } else msg.textContent = "";
  }

  const drawer = $("[data-cart]");
  const overlay = $("[data-overlay]");
  function openCart() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
  }

  /* ---------- Checkout ---------- */
  function orderSummary(form) {
    const t = totals();
    const lines = cart.map((i) => {
      const p = PRODUCTS.find((x) => x.id === i.id);
      return `• ${i.qty}× ${p.name} (${i.color}, ${i.size}) — ${money(p.price * i.qty)}`;
    });
    return [
      `Nuevo pedido ${CFG.name}`,
      "",
      ...lines,
      "",
      `Subtotal: ${money(t.subtotal)}`,
      t.discount ? `Descuento (${coupon}): −${money(t.discount)}` : null,
      `Envío: ${t.shipping ? money(t.shipping) : "Gratis"}`,
      `TOTAL: ${money(t.total)}`,
      "",
      `Nombre: ${form.name}`,
      `Email: ${form.email}`,
      `Teléfono: ${form.phone}`,
      `Dirección: ${form.address}, ${form.zip} ${form.city}, ${form.country}`,
    ]
      .filter((l) => l !== null)
      .join("\n");
  }

  function shopifyCheckoutUrl() {
    const parts = [];
    for (const i of cart) {
      const p = PRODUCTS.find((x) => x.id === i.id);
      const variant = p.shopifyVariants?.[`${i.size}/${i.color}`];
      if (!variant) return null;
      parts.push(`${variant}:${i.qty}`);
    }
    let url = `https://${CFG.shopifyDomain}/cart/${parts.join(",")}`;
    if (coupon) url += `?discount=${encodeURIComponent(coupon)}`;
    return url;
  }

  function openCheckout() {
    if (!cart.length) return;

    if (CFG.checkoutMode === "shopify" && CFG.shopifyDomain) {
      const url = shopifyCheckoutUrl();
      if (url) { window.location.href = url; return; }
      toast("Falta configurar alguna variante de Shopify.");
      return;
    }

    const t = totals();
    openInfo(
      "Finalizar compra",
      `<p class="muted">Total a pagar: <strong>${money(t.total)}</strong> · Entrega estimada ${etaText()}</p>
      <form class="checkout" data-checkout-form>
        <label>Nombre completo<input name="name" required autocomplete="name"></label>
        <div class="checkout__row">
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
          <label>Teléfono<input name="phone" type="tel" required autocomplete="tel"></label>
        </div>
        <label>Dirección<input name="address" required autocomplete="street-address"></label>
        <div class="checkout__row checkout__row--3">
          <label>C. postal<input name="zip" required autocomplete="postal-code"></label>
          <label>Ciudad<input name="city" required autocomplete="address-level2"></label>
          <label>País<input name="country" required autocomplete="country-name" value="España"></label>
        </div>
        <label class="check"><input type="checkbox" required> Acepto los términos y condiciones y la política de privacidad.</label>
        <button class="btn btn--primary btn--block" type="submit">${CFG.checkoutMode === "email" ? "Enviar pedido por email" : "Confirmar pedido por WhatsApp"}</button>
        <p class="muted small">Te confirmaremos el pedido y te enviaremos el enlace de pago seguro.</p>
      </form>`
    );

    $("[data-checkout-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const text = orderSummary(data);
      const url =
        CFG.checkoutMode === "email"
          ? `mailto:${CFG.contactEmail}?subject=${encodeURIComponent(`Pedido ${CFG.name} - ${data.name}`)}&body=${encodeURIComponent(text)}`
          : `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
      cart = [];
      coupon = null;
      storage.set(COUPON_KEY, null);
      saveCart();
      closeCart();
      openInfo("¡Gracias por tu pedido! 🙌", `<p>Hemos preparado el resumen de tu pedido. En cuanto lo recibamos te enviaremos la confirmación y el enlace de pago a <strong>${esc(data.email)}</strong>.</p><p>Entrega estimada: <strong>${etaText()}</strong>.</p>`);
    });
  }

  /* ---------- Textos legales ---------- */
  const LEGAL = {
    privacidad: [
      "Política de privacidad",
      `<p>Usamos tus datos (nombre, email, teléfono y dirección) únicamente para gestionar tu pedido, el envío y la atención al cliente. Compartimos tu dirección con nuestro almacén y la empresa de transporte solo para entregar tu pedido.</p><p>Puedes pedir el acceso, la rectificación o la eliminación de tus datos escribiendo a ${esc(CFG.contactEmail)}.</p>`,
    ],
    terminos: [
      "Términos y condiciones",
      `<p>Los precios incluyen impuestos. Los pedidos se preparan en ${CFG.shipping.processingDays.join("–")} días hábiles y se entregan en ${CFG.shipping.deliveryDays.join("–")} días hábiles adicionales. Los plazos son estimados y pueden variar en temporadas de alta demanda o por causas ajenas a la tienda.</p><p>Si un producto no está disponible después de tu compra, te avisaremos y te reembolsaremos el importe íntegro.</p>`,
    ],
    devoluciones: [
      "Política de devoluciones",
      `<p>Dispones de 30 días naturales desde la recepción para devolver cualquier producto sin usar y con sus etiquetas. Escríbenos a ${esc(CFG.contactEmail)} con tu número de pedido y te indicaremos la dirección de devolución.</p><p>El reembolso se realiza al mismo método de pago en un plazo máximo de 14 días tras recibir el producto. Si el artículo llega defectuoso o es incorrecto, el envío de la devolución corre de nuestra cuenta.</p>`,
    ],
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("[data-toast]");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2200);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-quick-add],[data-filter],[data-filter-link],[data-cart-open],[data-cart-close],[data-line-qty],[data-line-remove],[data-checkout],[data-legal],[data-menu-toggle],[data-search-toggle]");
    if (!t) return;

    if (t.dataset.open) openProduct(t.dataset.open);
    else if (t.dataset.quickAdd) {
      const p = PRODUCTS.find((x) => x.id === t.dataset.quickAdd);
      if (p.sizes.length === 1) addToCart(p.id, p.colors[0].name, p.sizes[0]);
      else openProduct(p.id);
    }
    else if (t.dataset.filter) setFilter(t.dataset.filter);
    else if (t.dataset.filterLink) { setFilter(t.dataset.filterLink); $("[data-nav]").classList.remove("is-open"); }
    else if (t.hasAttribute("data-cart-open")) openCart();
    else if (t.hasAttribute("data-cart-close")) closeCart();
    else if (t.dataset.lineQty !== undefined) {
      const line = cart[+t.dataset.lineQty];
      line.qty += +t.dataset.delta;
      if (line.qty < 1) cart.splice(+t.dataset.lineQty, 1);
      else line.qty = Math.min(10, line.qty);
      saveCart();
    }
    else if (t.dataset.lineRemove !== undefined) { cart.splice(+t.dataset.lineRemove, 1); saveCart(); }
    else if (t.hasAttribute("data-checkout")) openCheckout();
    else if (t.dataset.legal) { e.preventDefault(); openInfo(...LEGAL[t.dataset.legal]); }
    else if (t.hasAttribute("data-menu-toggle")) $("[data-nav]").classList.toggle("is-open");
    else if (t.hasAttribute("data-search-toggle")) {
      const s = $("[data-search]");
      s.hidden = !s.hidden;
      if (!s.hidden) $("[data-search-input]").focus();
    }
  });

  overlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  $("[data-sort]").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  $("[data-search-input]").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderGrid();
    if (state.query) document.getElementById("tienda").scrollIntoView({ behavior: "smooth" });
  });

  $("[data-coupon-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = $("[data-coupon-input]").value.trim().toUpperCase();
    if (CFG.coupons[code]) {
      coupon = code;
      storage.set(COUPON_KEY, code);
      $("[data-coupon-input]").value = "";
      renderCart();
    } else {
      $("[data-coupon-msg]").textContent = "Ese código no es válido.";
    }
  });

  $("[data-track-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("[data-track-input]").value.trim();
    if (n) window.open(`https://t.17track.net/es#nums=${encodeURIComponent(n)}`, "_blank", "noopener");
  });

  $("[data-newsletter]").addEventListener("submit", (e) => {
    e.preventDefault();
    e.target.reset();
    openInfo("¡Bienvenido al club! 🎉", `<p>Usa este código en tu primer pedido:</p><p class="code">HSTLR10</p><p class="muted">10% de descuento en todo el carrito.</p>`);
  });

  /* ---------- Inicio ---------- */
  fillConfigText();
  renderGrid();
  renderCart();
})();

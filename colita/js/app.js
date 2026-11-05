(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const app = $("#app");
  const FREE_SHIPPING = 999;
  const SHIPPING = 99;

  const money = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const byId = (id) => window.PRODUCTS.find((p) => p.id === id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Ilustraciones SVG de prendas ----------
  const SHAPES = {
    tee: '<path d="M60 40 L85 28 Q100 40 115 28 L140 40 L160 70 L138 82 L132 72 L132 170 L68 170 L68 72 L62 82 L40 70 Z"/>',
    longsleeve: '<path d="M62 38 L86 28 Q100 40 114 28 L138 38 L158 150 L142 154 L132 80 L132 170 L68 170 L68 80 L58 154 L42 150 Z"/>',
    hoodie: '<path d="M62 46 Q72 18 100 16 Q128 18 138 46 L160 150 L144 154 L134 86 L134 172 L66 172 L66 86 L56 154 L40 150 Z"/><path class="detail" d="M82 46 Q100 64 118 46 M78 130 L122 130 L116 150 L84 150 Z"/>',
    jacket: '<path d="M64 36 L88 28 L100 40 L112 28 L136 36 L160 150 L144 154 L134 86 L134 172 L66 172 L66 86 L56 154 L40 150 Z"/><path class="detail" d="M100 40 L100 172"/>',
    pants: '<path d="M68 28 L132 28 L140 172 L108 172 L100 76 L92 172 L60 172 Z"/><path class="detail" d="M68 40 L132 40"/>',
    shorts: '<path d="M64 50 L136 50 L146 128 L108 132 L100 90 L92 132 L54 128 Z"/><path class="detail" d="M64 62 L136 62"/>',
    cap: '<path d="M52 118 Q52 58 100 56 Q148 58 148 118 Z"/><path d="M40 118 L170 118 Q172 134 150 134 L50 134 Q38 132 40 118 Z"/><circle cx="100" cy="56" r="5"/>',
    beanie: '<path d="M56 140 Q52 64 100 56 Q148 64 144 140 Z"/><rect x="50" y="122" width="100" height="26" rx="6"/><circle cx="100" cy="48" r="12"/>',
    tote: '<path class="detail" d="M78 70 Q78 30 100 30 Q122 30 122 70" fill="none"/><rect x="56" y="64" width="88" height="104" rx="4"/>'
  };

  function art(p, color) {
    const c = color || p.colors[0];
    const light = isLight(c);
    return `<svg class="art" viewBox="0 0 200 200" role="img" aria-label="${esc(p.name)}">
      <rect width="200" height="200" fill="${light ? "#e7e2d8" : "#f1ede5"}"/>
      <g fill="${c}" stroke="${light ? "#b9b2a4" : "rgba(0,0,0,.25)"}" stroke-width="2" stroke-linejoin="round">${SHAPES[p.shape] || SHAPES.tee}</g>
    </svg>`;
  }

  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  }

  // ---------- Vistas ----------
  const ui = { category: "todo", query: "", sort: "destacados" };

  function card(p) {
    const fav = Store.isFav(p.id);
    return `<article class="card">
      <a href="#/producto/${p.id}" class="card-media">
        ${art(p)}
        ${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ""}
      </a>
      <button class="fav ${fav ? "on" : ""}" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? "Quitar de" : "Agregar a"} favoritos">${fav ? "♥" : "♡"}</button>
      <div class="card-body">
        <a href="#/producto/${p.id}" class="card-title">${esc(p.name)}</a>
        <div class="card-meta">
          <span class="price">${money(p.price)}</span>
          <span class="swatches">${p.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
        </div>
      </div>
    </article>`;
  }

  function filtered() {
    const q = ui.query.trim().toLowerCase();
    let list = window.PRODUCTS.filter((p) =>
      (ui.category === "todo" || p.category === ui.category) &&
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
    if (ui.sort === "precio-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (ui.sort === "precio-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (ui.sort === "nombre") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return list;
  }

  function viewHome() {
    app.innerHTML = `
      <section class="hero">
        <div>
          <p class="eyebrow">Hstlrs presenta</p>
          <h1>Ropa para la calle, hecha para durar.</h1>
          <p class="lead">Envío gratis desde ${money(FREE_SHIPPING)} · Cambios sin costo en 30 días.</p>
          <a class="btn" href="#catalogo">Ver colección</a>
        </div>
      </section>
      <section id="catalogo" class="catalog">
        <div class="toolbar">
          <div class="chips" role="tablist">
            ${window.CATEGORIES.map((c) => `<button role="tab" class="chip ${ui.category === c.id ? "on" : ""}" aria-selected="${ui.category === c.id}" data-cat="${c.id}">${c.label}</button>`).join("")}
          </div>
          <div class="controls">
            <input type="search" id="q" placeholder="Buscar…" value="${esc(ui.query)}" aria-label="Buscar productos">
            <select id="sort" aria-label="Ordenar">
              <option value="destacados">Destacados</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
            </select>
          </div>
        </div>
        <div class="grid" id="grid"></div>
      </section>`;
    $("#sort").value = ui.sort;
    renderGrid();

    app.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
      ui.category = b.dataset.cat;
      app.querySelectorAll("[data-cat]").forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      renderGrid();
    }));
    $("#q").addEventListener("input", (e) => { ui.query = e.target.value; renderGrid(); });
    $("#sort").addEventListener("change", (e) => { ui.sort = e.target.value; renderGrid(); });
    $('.hero .btn').addEventListener("click", (e) => { e.preventDefault(); $("#catalogo").scrollIntoView({ behavior: "smooth" }); });
  }

  function renderGrid() {
    const list = filtered();
    $("#grid").innerHTML = list.length ? list.map(card).join("") : `<p class="empty">No encontramos nada con esos filtros.</p>`;
  }

  function viewProduct(id) {
    const p = byId(id);
    if (!p) return viewNotFound();
    const sel = { color: p.colors[0], size: p.sizes.length === 1 ? p.sizes[0] : null, qty: 1 };

    const related = window.PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);

    app.innerHTML = `
      <a href="#/" class="back">← Volver a la tienda</a>
      <section class="pdp">
        <div class="pdp-media" id="pdp-art">${art(p, sel.color)}</div>
        <div class="pdp-info">
          ${p.tag ? `<span class="tag static">${esc(p.tag)}</span>` : ""}
          <h1>${esc(p.name)}</h1>
          <p class="price big">${money(p.price)}</p>
          <p class="desc">${esc(p.description)}</p>

          <fieldset>
            <legend>Color</legend>
            <div class="opts">${p.colors.map((c) => `<button class="swatch ${c === sel.color ? "on" : ""}" data-color="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${c === sel.color}"></button>`).join("")}</div>
          </fieldset>
          <fieldset>
            <legend>Talla</legend>
            <div class="opts">${p.sizes.map((s) => `<button class="size ${s === sel.size ? "on" : ""}" data-size="${s}" aria-pressed="${s === sel.size}">${s}</button>`).join("")}</div>
          </fieldset>
          <div class="buy">
            <div class="qty">
              <button data-step="-1" aria-label="Menos">−</button>
              <span id="qty">1</span>
              <button data-step="1" aria-label="Más">+</button>
            </div>
            <button class="btn grow" id="add">Agregar al carrito</button>
            <button class="fav big ${Store.isFav(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="Favorito">${Store.isFav(p.id) ? "♥" : "♡"}</button>
          </div>
          <p class="hint" id="size-hint" hidden>Elige una talla primero.</p>
          <ul class="perks">
            <li>Envío gratis desde ${money(FREE_SHIPPING)}</li>
            <li>Cambios sin costo en 30 días</li>
            <li>Pago seguro con tarjeta o en tienda</li>
          </ul>
        </div>
      </section>
      ${related.length ? `<section class="catalog"><h2>También te puede gustar</h2><div class="grid">${related.map(card).join("")}</div></section>` : ""}`;

    app.querySelectorAll("[data-color]").forEach((b) => b.addEventListener("click", () => {
      sel.color = b.dataset.color;
      app.querySelectorAll("[data-color]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
      $("#pdp-art").innerHTML = art(p, sel.color);
    }));
    app.querySelectorAll("[data-size]").forEach((b) => b.addEventListener("click", () => {
      sel.size = b.dataset.size;
      $("#size-hint").hidden = true;
      app.querySelectorAll("[data-size]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
    }));
    app.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
      sel.qty = Math.max(1, Math.min(10, sel.qty + Number(b.dataset.step)));
      $("#qty").textContent = sel.qty;
    }));
    $("#add").addEventListener("click", () => {
      if (!sel.size) { $("#size-hint").hidden = false; return; }
      Store.addToCart(p.id, sel.size, sel.color, sel.qty);
      toast(`${p.name} agregado al carrito`);
      openCart();
    });
  }

  function viewFavs() {
    const favs = Store.get().favs.map(byId).filter(Boolean);
    app.innerHTML = `<section class="catalog">
      <h1>Favoritos</h1>
      ${favs.length ? `<div class="grid">${favs.map(card).join("")}</div>` : `<p class="empty">Aún no tienes favoritos. Toca ♡ en cualquier prenda.</p><a class="btn" href="#/">Ir a la tienda</a>`}
    </section>`;
  }

  function totals() {
    const sub = Store.subtotal();
    const ship = sub === 0 || sub >= FREE_SHIPPING ? 0 : SHIPPING;
    return { sub, ship, total: sub + ship };
  }

  function viewCheckout() {
    if (!Store.count()) { location.hash = "#/"; return; }
    const t = totals();
    app.innerHTML = `
      <a href="#/" class="back">← Seguir comprando</a>
      <section class="checkout">
        <form id="checkout" novalidate>
          <h1>Finalizar compra</h1>
          <fieldset>
            <legend>Contacto</legend>
            <label>Nombre completo<input name="name" required autocomplete="name"></label>
            <label>Correo<input name="email" type="email" required autocomplete="email"></label>
            <label>Teléfono<input name="phone" type="tel" required pattern="[0-9 ]{10,}" autocomplete="tel"></label>
          </fieldset>
          <fieldset>
            <legend>Envío</legend>
            <label>Dirección<input name="address" required autocomplete="street-address"></label>
            <div class="row">
              <label>Ciudad<input name="city" required autocomplete="address-level2"></label>
              <label>C.P.<input name="zip" required pattern="[0-9]{5}" inputmode="numeric" autocomplete="postal-code"></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Pago</legend>
            <label class="radio"><input type="radio" name="pay" value="tarjeta" checked> Tarjeta (se cobra al confirmar)</label>
            <label class="radio"><input type="radio" name="pay" value="tienda"> Pago en tienda de conveniencia</label>
            <p class="hint">Demo: no se realiza ningún cobro real.</p>
          </fieldset>
          <p class="error" id="form-error" hidden>Revisa los campos marcados.</p>
          <button class="btn full" type="submit">Pagar ${money(t.total)}</button>
        </form>
        <aside class="summary">
          <h2>Resumen</h2>
          ${Store.get().cart.map((l) => { const p = byId(l.id); return p ? `<div class="sum-line"><span>${l.qty}× ${esc(p.name)} <small>${esc(l.size)}</small></span><span>${money(p.price * l.qty)}</span></div>` : ""; }).join("")}
          ${totalsHtml(t)}
        </aside>
      </section>`;

    $("#checkout").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      let ok = true;
      form.querySelectorAll("input[required]").forEach((i) => {
        const valid = i.checkValidity() && i.value.trim() !== "";
        i.classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      $("#form-error").hidden = ok;
      if (!ok) { form.querySelector(".invalid").focus(); return; }
      const order = {
        id: "CL-" + Date.now().toString(36).toUpperCase(),
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        total: totals().total
      };
      Store.clearCart();
      sessionStorageSet("colita:last-order", order);
      location.hash = "#/gracias";
    });
  }

  function viewThanks() {
    const o = sessionStorageGet("colita:last-order");
    app.innerHTML = `<section class="thanks">
      <h1>¡Gracias${o ? ", " + esc(o.name.split(" ")[0]) : ""}!</h1>
      ${o ? `<p>Tu pedido <strong>${esc(o.id)}</strong> por <strong>${money(o.total)}</strong> está confirmado. Te enviamos los detalles a ${esc(o.email)}.</p>` : `<p>Tu pedido está confirmado.</p>`}
      <a class="btn" href="#/">Seguir comprando</a>
    </section>`;
  }

  function viewNotFound() {
    app.innerHTML = `<section class="thanks"><h1>No encontramos esa página</h1><a class="btn" href="#/">Ir a la tienda</a></section>`;
  }

  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sessionStorageGet(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }

  // ---------- Carrito (drawer) ----------
  const drawer = $("#cart"), scrim = $("#scrim");

  function openCart() { drawer.classList.add("open"); scrim.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }
  function closeCart() { drawer.classList.remove("open"); scrim.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }

  function totalsHtml(t) {
    const missing = FREE_SHIPPING - t.sub;
    return `<div class="totals">
      <div><span>Subtotal</span><span>${money(t.sub)}</span></div>
      <div><span>Envío</span><span>${t.ship ? money(t.ship) : "Gratis"}</span></div>
      ${t.ship ? `<p class="hint">Te faltan ${money(missing)} para envío gratis.</p>` : ""}
      <div class="grand"><span>Total</span><span>${money(t.total)}</span></div>
    </div>`;
  }

  function renderCart() {
    const { cart } = Store.get();
    $("#cart-count").textContent = Store.count();
    $("#fav-count").textContent = Store.get().favs.length;

    if (!cart.length) {
      $("#cart-items").innerHTML = `<p class="empty">Tu carrito está vacío.</p>`;
      $("#cart-foot").innerHTML = "";
      return;
    }
    $("#cart-items").innerHTML = cart.map((l) => {
      const p = byId(l.id);
      if (!p) return "";
      return `<div class="line">
        <div class="line-art">${art(p, l.color)}</div>
        <div class="line-info">
          <strong>${esc(p.name)}</strong>
          <small>Talla ${esc(l.size)} · <i class="dot" style="background:${l.color}"></i></small>
          <div class="qty sm">
            <button data-line="${l.key}" data-d="-1" aria-label="Menos">−</button>
            <span>${l.qty}</span>
            <button data-line="${l.key}" data-d="1" aria-label="Más">+</button>
          </div>
        </div>
        <div class="line-end">
          <span>${money(p.price * l.qty)}</span>
          <button class="link" data-remove="${l.key}">Quitar</button>
        </div>
      </div>`;
    }).join("");
    $("#cart-foot").innerHTML = `${totalsHtml(totals())}<a class="btn full" href="#/checkout" id="go-checkout">Pagar</a>`;
  }

  $("#cart-items").addEventListener("click", (e) => {
    const step = e.target.closest("[data-line]");
    if (step) {
      const line = Store.get().cart.find((l) => l.key === step.dataset.line);
      if (line) Store.setQty(line.key, line.qty + Number(step.dataset.d));
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) Store.remove(rm.dataset.remove);
  });
  $("#cart-foot").addEventListener("click", (e) => { if (e.target.closest("#go-checkout")) closeCart(); });
  $("#open-cart").addEventListener("click", openCart);
  $("#close-cart").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  // Favoritos (delegado en toda la app)
  app.addEventListener("click", (e) => {
    const f = e.target.closest("[data-fav]");
    if (!f) return;
    e.preventDefault();
    Store.toggleFav(f.dataset.fav);
    const on = Store.isFav(f.dataset.fav);
    toast(on ? "Agregado a favoritos" : "Quitado de favoritos");
    if (location.hash === "#/favoritos") return viewFavs();
    f.classList.toggle("on", on);
    f.textContent = on ? "♥" : "♡";
    f.setAttribute("aria-pressed", on);
  });

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- Router ----------
  function route() {
    const hash = location.hash || "#/";
    if (hash === "#catalogo") return;
    const [, path, param] = hash.replace(/^#/, "").split("/");
    switch (path) {
      case "": viewHome(); break;
      case "producto": viewProduct(param); break;
      case "favoritos": viewFavs(); break;
      case "checkout": viewCheckout(); break;
      case "gracias": viewThanks(); break;
      default: viewNotFound();
    }
    window.scrollTo(0, 0);
  }

  Store.subscribe(renderCart);
  window.addEventListener("hashchange", route);
  renderCart();
  route();
})();

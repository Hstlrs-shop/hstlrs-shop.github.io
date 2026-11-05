// Estado persistente: carrito y favoritos en localStorage.
(function () {
  const KEY = "colita:v1";
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { cart: Array.isArray(s.cart) ? s.cart : [], favs: Array.isArray(s.favs) ? s.favs : [] };
      }
    } catch (e) { /* storage no disponible */ }
    return { cart: [], favs: [] };
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorar */ }
    listeners.forEach((fn) => fn(state));
  }

  const lineKey = (id, size, color) => `${id}|${size}|${color}`;

  window.Store = {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    addToCart(id, size, color, qty = 1) {
      const key = lineKey(id, size, color);
      const line = state.cart.find((l) => l.key === key);
      if (line) line.qty = Math.min(line.qty + qty, 10);
      else state.cart.push({ key, id, size, color, qty });
      save();
    },
    setQty(key, qty) {
      const line = state.cart.find((l) => l.key === key);
      if (!line) return;
      if (qty <= 0) state.cart = state.cart.filter((l) => l.key !== key);
      else line.qty = Math.min(qty, 10);
      save();
    },
    remove(key) { state.cart = state.cart.filter((l) => l.key !== key); save(); },
    clearCart() { state.cart = []; save(); },

    toggleFav(id) {
      state.favs = state.favs.includes(id) ? state.favs.filter((f) => f !== id) : [...state.favs, id];
      save();
    },
    isFav: (id) => state.favs.includes(id),

    count: () => state.cart.reduce((n, l) => n + l.qty, 0),
    subtotal() {
      return state.cart.reduce((sum, l) => {
        const p = window.PRODUCTS.find((x) => x.id === l.id);
        return sum + (p ? p.price * l.qty : 0);
      }, 0);
    }
  };
})();

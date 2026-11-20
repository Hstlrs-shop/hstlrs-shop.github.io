const C = window.LCC;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : new Date(ms).toLocaleDateString("es");
};

// Enlaces configurables
document.querySelectorAll("[data-link]").forEach((a) => (a.href = C[a.dataset.link]));

// Suscripción por email
document.querySelectorAll("form.sub").forEach((f) =>
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button");
    const email = f.querySelector("input").value;
    btn.disabled = true;
    try {
      const r = await fetch(`${C.API}/api/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: location.pathname + location.search }),
      });
      f.innerHTML = r.ok
        ? `<p class="note">✅ Listo. Mañana recibes la primera edición. Mientras, únete al <a href="${esc(C.TELEGRAM_FREE)}">canal de Telegram</a>.</p>`
        : `<p class="note">Revisa el email e inténtalo de nuevo.</p>`;
    } catch {
      btn.disabled = false;
    }
  }),
);

// Feed de noticias (portada)
const list = $("#news");
if (list) {
  let scope = "";
  const load = async () => {
    try {
      const r = await fetch(`${C.API}/api/news?limit=25&min_impact=3${scope ? `&scope=${scope}` : ""}`);
      const d = await r.json();
      $("#delay").textContent = d.realtime ? "En vivo" : `Retraso ${d.delay_min} min`;
      $("#delay").classList.toggle("live", d.realtime);
      list.innerHTML = d.items.length
        ? d.items.map((n) => `
          <li>
            <div class="meta"><span class="imp i${n.impact}" title="Impacto ${n.impact}/5"></span>
              <span>${esc(n.source)}</span><span>·</span><span>${ago(n.detected_at)}</span>
              ${n.category ? `<span>·</span><span>${esc(n.category)}</span>` : ""}</div>
            <a class="t" href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>
            ${n.brief ? `<p>${esc(n.brief)}</p>` : ""}
          </li>`).join("")
        : `<li class="note">Sin noticias de alto impacto todavía.</li>`;
    } catch {
      list.innerHTML = `<li class="note">No se pudo cargar el feed.</li>`;
    }
  };
  document.querySelectorAll(".tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      scope = b.dataset.scope;
      load();
    }),
  );
  load();
  setInterval(load, 60_000);
}

// Archivo de ediciones
const arch = $("#archive");
if (arch) {
  fetch(`${C.API}/api/digests`).then((r) => r.json()).then((ds) => {
    arch.innerHTML = ds.slice(0, 10).map((d) => `<li><a class="t" href="edicion.html?id=${d.id}">${esc(d.subject)}</a><div class="meta">${d.id}</div></li>`).join("")
      || `<li class="note">La primera edición sale mañana.</li>`;
  }).catch(() => {});
}

// Página de una edición (HTML ya saneado en el Worker)
const ed = $("#edition");
if (ed) {
  const id = new URLSearchParams(location.search).get("id") || "latest";
  fetch(`${C.API}/api/digest/${encodeURIComponent(id)}`).then((r) => r.json()).then((d) => {
    if (!d.html) throw 0;
    document.title = `${d.subject} · ${C.BRAND}`;
    ed.innerHTML = d.html;
  }).catch(() => (ed.innerHTML = "<p>Edición no encontrada.</p>"));
}

// Página de gracias tras el pago (Mercado Pago regresa con ?preapproval_id=…)
const acc = $("#access");
if (acc) {
  const id = new URLSearchParams(location.search).get("preapproval_id");
  let tries = 0;
  const poll = async () => {
    const r = await fetch(`${C.API}/api/acceso?preapproval_id=${encodeURIComponent(id)}`);
    const d = await r.json();
    if (r.status === 202 && tries++ < 40) {
      acc.innerHTML = "<p>Mercado Pago está confirmando tu pago… no cierres esta página.</p>";
      return setTimeout(poll, 3000);
    }
    if (!d.invite_link) return (acc.innerHTML = `<p>Aún no vemos tu suscripción como pagada (${esc(d.error || "pendiente")}). Recarga en unos minutos o escríbenos por Telegram.</p>`);
    acc.innerHTML = `
      <p><a class="btn" href="${esc(d.invite_link)}">Entrar al canal Pro de Telegram</a></p>
      <p class="note">El enlace es de un solo uso y caduca en 7 días. No lo compartas. Puedes volver a esta página para verlo de nuevo.</p>
      ${d.api_key ? `<p>Tu API key (guárdala):</p><code class="key">${esc(d.api_key)}</code>
      <p class="note">Uso: <code>GET ${esc(C.API)}/api/news</code> con cabecera <code>Authorization: Bearer TU_KEY</code></p>` : ""}`;
  };
  id ? poll() : (acc.innerHTML = "<p>Falta el identificador de la suscripción.</p>");
}

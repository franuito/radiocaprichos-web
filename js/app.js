// Radio Caprichos · lógica de la web
// 1) Idioma (ES/FR) desde i18n/*.json  2) Tarjetas de emisoras  3) Reproductor con salto automático

const $ = (s) => document.querySelector(s);
const audio = $("#audio");
let T = {};             // textos del idioma activo
let lang = location.pathname.startsWith("/fr") ? "fr" : (localStorageGet("lang") || "es");
let data = null;        // contenido de data/emisoras.json
let actual = -1;        // índice de la emisora que suena

// Carga JSON (en la vista previa los datos ya vienen incrustados en window.RC_PRE)
const cargar = (u) => (window.RC_PRE && window.RC_PRE[u]) ? Promise.resolve(window.RC_PRE[u]) : fetch(u).then((r) => r.json());

function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

// --- Idioma ---
async function cargarIdioma(l) {
  T = await cargar(`i18n/${l}.json`);
  document.documentElement.lang = T.lang;
  // Cada página indica su prefijo de textos en <body data-page="..."> (vacío = portada)
  const pg = document.body.dataset.page ? document.body.dataset.page + "_meta_" : "";
  document.title = T[pg + "title"] || T.title;
  document.querySelector('meta[name="description"]').content = T[pg + "description"] || T.description;
  document.querySelectorAll("[data-t]").forEach((el) => { if (T[el.dataset.t]) el.textContent = T[el.dataset.t]; });
  $("#lang").textContent = l === "es" ? "FR" : "ES";
  if (data && $("#grid")) pintarEmisoras();
}

// --- Tarjetas ---
function pintarEmisoras() {
  const grid = $("#grid");
  grid.innerHTML = "";
  data.emisoras.forEach((e, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card" + (e.principal ? " principal" : "") + (i === actual ? " activa" : "");
    b.style.setProperty("--c", e.color);
    b.innerHTML = `<span class="tag">${e.principal ? T.principal : T.en_vivo}</span>
      <h3>${e.nombre}</h3><p>${e.genero[lang]}</p>`;
    b.onclick = () => sintonizar(i);
    grid.appendChild(b);
  });
}

// --- Reproductor ---
function sintonizar(i, intentos = 0) {
  const e = data.emisoras[i];
  actual = i;
  document.documentElement.style.setProperty("--acento", e.color); // color de la emisora en todo el reproductor
  $("#player").hidden = false;
  $("#p-station").textContent = `${e.nombre} · ${e.genero[lang]}`;
  $("#p-title").textContent = T.sonando + "…";
  pintarEmisoras();

  if (!e.stream) return siguiente(i, intentos); // emisora sin fuente configurada
  audio.src = e.stream;
  audio.play().catch(() => siguiente(i, intentos));
  audio.onerror = () => siguiente(i, intentos);
}

// Si una emisora cae, pasa a la siguiente; si caen las 7, usa el AutoDJ (AzuraCast)
function siguiente(i, intentos) {
  if (intentos + 1 >= data.emisoras.length) {
    if (data.fallback.stream) { audio.src = data.fallback.stream; audio.play().catch(() => {}); }
    $("#p-title").textContent = T.sin_senal;
    return;
  }
  $("#p-title").textContent = T.sin_senal;
  setTimeout(() => sintonizar((i + 1) % data.emisoras.length, intentos + 1), 1500);
}

// Lo que sigue solo existe en las páginas con reproductor
if (audio) {
audio.onplaying = () => { $("#player").classList.add("sonando"); $("#play").textContent = "❚❚"; };
audio.onpause = () => { $("#player").classList.remove("sonando"); $("#play").textContent = "▶"; };
$("#play").onclick = () => (audio.paused ? audio.play().catch(() => {}) : audio.pause());
if ($("#cta")) $("#cta").onclick = () => sintonizar(data.emisoras.findIndex((e) => e.principal));
}
$("#lang").onclick = () => { lang = lang === "es" ? "fr" : "es"; localStorageSet("lang", lang); cargarIdioma(lang); };

// --- Arranque ---
if ($("#grid")) data = await cargar("data/emisoras.json");
await cargarIdioma(lang);

const DATA_PATH = "../data/materias.json";

const materiasContainer = document.getElementById("materiasContainer");
const searchInput = document.getElementById("searchInput");
const yearFilter = document.getElementById("yearFilter");
const statusFilter = document.getElementById("statusFilter");
const emptyState = document.getElementById("emptyState");

let materias = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarMaterias();

  searchInput.addEventListener("input", filtrarMaterias);
  yearFilter.addEventListener("change", filtrarMaterias);
  statusFilter.addEventListener("change", filtrarMaterias);
});

async function cargarMaterias() {
  try {
    const response = await fetch(DATA_PATH);

    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo JSON.");
    }

    materias = await response.json();
    renderMaterias(materias);
  } catch (error) {
    materiasContainer.innerHTML = `
      <article class="materia-card">
        <h2>⚠️ Error al cargar el banco</h2>
        <p>No se pudo leer el archivo <strong>data/materias.json</strong>.</p>
        <p class="comentario">
          Probalo con Live Server en VS Code o desde GitHub Pages.
        </p>
      </article>
    `;

    console.error(error);
  }
}

function filtrarMaterias() {
  const busqueda = normalizarTexto(searchInput.value);
  const anio = yearFilter.value;
  const estado = statusFilter.value;

  const materiasFiltradas = materias.filter(materia => {
    const nombreMateria = normalizarTexto(materia.materia || "");
    const codigo = normalizarTexto(materia.codigo || "");
    const queHay = normalizarTexto((materia.queHay || []).join(" "));
    const comentarios = normalizarTexto(materia.comentarios || "");
    const area = normalizarTexto(materia.area || "");

    const coincideBusqueda =
      nombreMateria.includes(busqueda) ||
      codigo.includes(busqueda) ||
      queHay.includes(busqueda) ||
      comentarios.includes(busqueda) ||
      area.includes(busqueda);

    const coincideAnio = anio === "" || String(materia.anio) === anio;
    const coincideEstado = estado === "" || (materia.estado || "").includes(estado);

    return coincideBusqueda && coincideAnio && coincideEstado;
  });

  renderMaterias(materiasFiltradas);
}

function renderMaterias(listaMaterias) {
  materiasContainer.innerHTML = "";

  if (listaMaterias.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  listaMaterias.forEach(materia => {
    const card = document.createElement("article");
    card.className = "materia-card";

    const idMateria = materia.id || generarId(materia.materia || "");

    const queHayTexto =
      materia.queHay && materia.queHay.length > 0
        ? materia.queHay.join(", ")
        : "Sin información";

    const primerLink =
      materia.links && materia.links.length > 0
        ? materia.links[0]
        : null;

    const linkPrincipalHTML = primerLink
      ? `<a href="${escaparAtributo(primerLink.url)}" target="_blank" class="btn btn-primary">
          Abrir material
        </a>`
      : `<span class="btn btn-secondary">Sin link cargado</span>`;

    card.innerHTML = `
      <h2>${escaparHTML(materia.materia || "Materia sin nombre")}</h2>

      <div class="materia-meta">
        <span class="tag">${escaparHTML(materia.codigo || "Sin código")}</span>
        <span class="tag">${escaparHTML(materia.anio || "Sin dato")}° año</span>
        <span class="tag">${escaparHTML(materia.cuatrimestre || "Sin dato")}° cuatri</span>
      </div>

      <p class="estado">${escaparHTML(materia.estado || "🟡 Revisar")}</p>

      <p class="que-hay">
        <strong>Qué hay:</strong> ${escaparHTML(queHayTexto)}
      </p>

      ${
        materia.comentarios
          ? `<p class="comentario">${escaparHTML(materia.comentarios)}</p>`
          : ""
      }

      <div class="hero-buttons">
        <a href="./materia.html?id=${escaparAtributo(idMateria)}" class="btn btn-secondary">
          Ver materia
        </a>

        ${linkPrincipalHTML}
      </div>
    `;

    materiasContainer.appendChild(card);
  });
}

function generarId(texto) {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizarTexto(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escaparAtributo(texto) {
  return escaparHTML(texto);
}
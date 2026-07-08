let materias = [];

const searchInput = document.getElementById("searchInput");
const yearFilter = document.getElementById("yearFilter");
const statusFilter = document.getElementById("statusFilter");
const materiasContainer = document.getElementById("materiasContainer");

async function cargarMaterias() {
    try {
        const response = await fetch("../data/materias.json");

        if (!response.ok) {
            throw new Error("No se pudo cargar el archivo materias.json");
        }

        materias = await response.json();
        renderizarMaterias(materias);

    } catch (error) {
        console.error("Error cargando materias:", error);

        materiasContainer.innerHTML = `
            <div class="empty-state">
                <h2>⚠️ No se pudo cargar el banco de materias</h2>
                <p>
                    Revisá que exista el archivo <strong>data/materias.json</strong>
                    y que esté bien escrita la ruta.
                </p>
            </div>
        `;
    }
}

function renderizarMaterias(listaMaterias) {
    materiasContainer.innerHTML = "";

    if (!listaMaterias || listaMaterias.length === 0) {
        materiasContainer.innerHTML = `
            <div class="empty-state">
                <h2>🔎 No se encontraron materias</h2>
                <p>Probá cambiar la búsqueda o los filtros.</p>
            </div>
        `;
        return;
    }

    listaMaterias.forEach((materia) => {
        const card = document.createElement("article");
        card.className = "materia-card card";

        const linkPrincipal = obtenerLinkPrincipal(materia);
        const codigo = materia.codigo || "";

        card.innerHTML = `
            <div class="materia-card-header">
                <p class="materia-area">${materia.area || "Materia"}</p>
                <h2>${materia.materia || "Materia sin nombre"}</h2>
            </div>

            <div class="materia-card-info">
                <p><strong>Código:</strong> ${materia.codigo || "Sin código"}</p>
                <p><strong>Año:</strong> ${materia.anio || "-"}</p>
                <p><strong>Cuatrimestre:</strong> ${materia.cuatrimestre || "-"}</p>
                <p><strong>Estado:</strong> ${materia.estado || "Sin estado"}</p>
                <p><strong>Qué hay:</strong> ${formatearTexto(materia.queHay)}</p>
            </div>

            <div class="card-buttons">
                ${
                    codigo
                    ? `<a href="./materia.html?codigo=${encodeURIComponent(codigo)}" class="btn btn-secondary">
                            Ver materia
                       </a>`
                    : ""
                }

                ${
                    linkPrincipal
                    ? `<a href="${linkPrincipal}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                            Abrir material
                       </a>`
                    : `<span class="no-link">Sin link cargado</span>`
                }
            </div>
        `;

        materiasContainer.appendChild(card);
    });
}

function obtenerLinkPrincipal(materia) {
    if (!materia.links) return "";

    return (
        materia.links.linkPrincipal ||
        materia.links.carpetaDrive ||
        materia.links.carpetaOneDrive ||
        materia.links.paginaFrubox ||
        materia.links.grupoWhatsapp ||
        ""
    );
}

function formatearTexto(valor) {
    if (!valor || valor === "" || valor === "-") {
        return "Sin información cargada";
    }

    if (Array.isArray(valor)) {
        return valor.length > 0 ? valor.join(", ") : "Sin información cargada";
    }

    return valor;
}

function filtrarMaterias() {
    const textoBusqueda = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const anioSeleccionado = yearFilter ? yearFilter.value : "";
    const estadoSeleccionado = statusFilter ? statusFilter.value : "";

    const materiasFiltradas = materias.filter((materia) => {
        const nombreMateria = (materia.materia || "").toLowerCase();
        const codigoMateria = (materia.codigo || "").toLowerCase();
        const areaMateria = (materia.area || "").toLowerCase();

        const coincideBusqueda =
            nombreMateria.includes(textoBusqueda) ||
            codigoMateria.includes(textoBusqueda) ||
            areaMateria.includes(textoBusqueda);

        const coincideAnio =
            anioSeleccionado === "" ||
            String(materia.anio) === String(anioSeleccionado);

        const coincideEstado =
            estadoSeleccionado === "" ||
            (materia.estado || "").includes(estadoSeleccionado);

        return coincideBusqueda && coincideAnio && coincideEstado;
    });

    renderizarMaterias(materiasFiltradas);
}

if (searchInput) {
    searchInput.addEventListener("input", filtrarMaterias);
}

if (yearFilter) {
    yearFilter.addEventListener("change", filtrarMaterias);
}

if (statusFilter) {
    statusFilter.addEventListener("change", filtrarMaterias);
}

cargarMaterias();
let materias = [];

const searchInput = document.getElementById("searchInput");
const yearFilter = document.getElementById("yearFilter");
const statusFilter = document.getElementById("statusFilter");
const materiasContainer = document.getElementById("materiasContainer");

async function cargarJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
    return await response.json();
}

async function cargarMaterias() {
    try {
        const materiasBase = await cargarJSON("../data/materias.json");
        let patchOneDrive = {};

        try {
            patchOneDrive = await cargarJSON("../data/onedrive_patch_bioapuntes.json");
        } catch (errorPatch) {
            console.warn("No se encontró patch de OneDrive. Se cargan solo las materias base.", errorPatch);
        }

        materias = materiasBase.map((materia) => mezclarMateriaConOneDrive(materia, patchOneDrive));
        renderizarMaterias(materias);

    } catch (error) {
        console.error("Error cargando materias:", error);
        materiasContainer.innerHTML = `
            <div class="empty-state">
                <h2>⚠️ No se pudo cargar el banco de materias</h2>
                <p>Revisá que exista <strong>data/materias.json</strong> y que la ruta esté bien escrita.</p>
            </div>
        `;
    }
}

function mezclarMateriaConOneDrive(materia, patchOneDrive) {
    const extra = patchOneDrive[materia.codigo] || {};
    const linksBase = normalizarLinks(materia.links);
    const linksExtra = [];

    if (extra.linkOneDrive) {
        linksExtra.push({
            nombre: "Carpeta OneDrive",
            tipo: "OneDrive",
            url: extra.linkOneDrive
        });
    }

    const queHayBase = normalizarArray(materia.queHay);
    const queHayExtra = normalizarArray(extra.queHayOneDrive);

    return {
        ...materia,
        carpetaOneDriveDetectada: extra.carpetaOneDriveDetectada || materia.carpetaOneDriveDetectada || "",
        linkOneDrive: extra.linkOneDrive || materia.linkOneDrive || "",
        queHayOneDrive: queHayExtra,
        queHay: unirSinDuplicados([...queHayBase, ...queHayExtra]),
        materialDetectadoOneDrive: extra.materialDetectadoOneDrive || "",
        materialDetectado: unirTextos([materia.materialDetectado, extra.materialDetectadoOneDrive]),
        comentarios: unirTextos([materia.comentarios, extra.comentarioOneDrive]),
        links: unirLinks(linksBase, linksExtra)
    };
}

function normalizarArray(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean).map(String);
    if (typeof valor === "string") {
        return valor
            .split(/;|,|\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [String(valor)];
}

function normalizarLinks(links) {
    if (!links) return [];

    if (Array.isArray(links)) {
        return links
            .map((link, index) => {
                if (typeof link === "string") {
                    return { nombre: `Link ${index + 1}`, tipo: "Link", url: link };
                }

                if (typeof link === "object" && link !== null) {
                    return {
                        nombre: link.nombre || link.titulo || link.tipo || `Link ${index + 1}`,
                        tipo: link.tipo || link.nombre || "Link",
                        url: link.url || link.link || link.href || link.drive || link.frubox || ""
                    };
                }

                return null;
            })
            .filter((link) => link && link.url);
    }

    if (typeof links === "object") {
        return Object.entries(links)
            .map(([clave, valor]) => {
                if (!valor) return null;

                if (typeof valor === "string") {
                    return { nombre: formatearNombreLink(clave), tipo: clave, url: valor };
                }

                if (typeof valor === "object") {
                    return {
                        nombre: valor.nombre || valor.titulo || valor.tipo || formatearNombreLink(clave),
                        tipo: valor.tipo || clave,
                        url: valor.url || valor.link || valor.href || ""
                    };
                }

                return null;
            })
            .filter((link) => link && link.url);
    }

    return [];
}

function unirLinks(linksBase, linksExtra) {
    const vistos = new Set();
    const resultado = [];

    [...linksBase, ...linksExtra].forEach((link) => {
        if (!link || !link.url) return;
        const clave = link.url.trim();
        if (vistos.has(clave)) return;
        vistos.add(clave);
        resultado.push(link);
    });

    return resultado;
}

function unirSinDuplicados(lista) {
    return [...new Set(lista.filter(Boolean).map(String))];
}

function unirTextos(textos) {
    return textos
        .filter((texto) => texto && texto !== "-" && String(texto).trim() !== "")
        .map(String)
        .filter((texto, index, array) => array.indexOf(texto) === index)
        .join("; ");
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
        const esElectiva = esMateriaElectiva(materia);
        const linkDetalle = esElectiva
            ? "./optativas.html"
            : `./materia.html?codigo=${encodeURIComponent(codigo)}`;

        card.innerHTML = `
            <div class="materia-card-header">
                <p class="materia-area">${materia.area || "Materia"}</p>
                <h2>${materia.materia || "Materia sin nombre"}</h2>
            </div>

            <div class="materia-card-info">
                <p><strong>Código:</strong> ${materia.codigo || "Sin código"}</p>
                <p><strong>Año:</strong> ${materia.anio || "-"}</p>
                <p><strong>Cuatrimestre:</strong> ${materia.cuatrimestre || "-"}</p>
                <p><strong>Estado:</strong> ${calcularEstado(materia)}</p>
                <p><strong>Qué hay:</strong> ${formatearTexto(materia.queHay)}</p>
            </div>

            <div class="card-buttons">
                ${(codigo || esElectiva) ? `<a href="${linkDetalle}" class="btn btn-secondary">${esElectiva ? "Ver optativas" : "Ver materia"}</a>` : ""}
                ${linkPrincipal ? `<a href="${linkPrincipal}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Abrir material</a>` : ""}
            </div>
        `;

        materiasContainer.appendChild(card);
    });
}

function esMateriaElectiva(materia) {
    const nombre = `${materia?.materia || ""} ${materia?.area || ""}`.toLowerCase();
    return nombre.includes("electiva") || nombre.includes("optativa");
}

function calcularEstado(materia) {
    const tieneOneDrive = normalizarLinks(materia.links).some((link) => esLinkDrive(link.url));
    const tieneFrubox = normalizarLinks(materia.links).some((link) => (link.nombre || "").toLowerCase().includes("frubox"));

    if (tieneOneDrive && tieneFrubox) return "✅ OneDrive + Frubox detectados";
    if (tieneOneDrive) return "✅ OneDrive detectado";
    if (tieneFrubox) return "✅ Frubox detectado";

    return materia.estado || "🟡 Sin revisar";
}

function obtenerLinkPrincipal(materia) {
    const links = normalizarLinks(materia.links);

    const oneDrive = links.find((link) => esLinkDrive(link.url));
    if (oneDrive) return oneDrive.url;

    const drive = links.find((link) => (link.url || "").includes("drive.google.com"));
    if (drive) return drive.url;

    const frubox = links.find((link) => (link.nombre || "").toLowerCase().includes("frubox"));
    if (frubox) return frubox.url;

    return links[0]?.url || "";
}

function esLinkDrive(url) {
    if (!url) return false;
    const urlMinuscula = url.toLowerCase();
    return (
        urlMinuscula.includes("drive.google.com") ||
        urlMinuscula.includes("sharepoint.com") ||
        urlMinuscula.includes("onedrive")
    );
}

function formatearTexto(valor) {
    if (!valor || valor === "" || valor === "-") return "Sin información cargada";
    if (Array.isArray(valor)) return valor.length > 0 ? valor.join(", ") : "Sin información cargada";
    if (typeof valor === "object") return Object.values(valor).filter(Boolean).join(", ");
    return String(valor);
}

function formatearNombreLink(nombreLink) {
    const nombres = {
        paginaFrubox: "Página Frubox",
        carpetaDrive: "Carpeta Drive",
        carpetaOneDrive: "Carpeta OneDrive",
        grupoWhatsapp: "Grupo WhatsApp",
        linkPrincipal: "Abrir material",
        frubox: "Frubox",
        drive: "Drive",
        oneDrive: "OneDrive",
        onedrive: "OneDrive",
        whatsapp: "Grupo WhatsApp"
    };

    return nombres[nombreLink] || nombreLink;
}

function filtrarMaterias() {
    const textoBusqueda = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const anioSeleccionado = yearFilter ? yearFilter.value : "";
    const estadoSeleccionado = statusFilter ? statusFilter.value : "";

    const materiasFiltradas = materias.filter((materia) => {
        const nombreMateria = (materia.materia || "").toLowerCase();
        const codigoMateria = (materia.codigo || "").toLowerCase();
        const areaMateria = (materia.area || "").toLowerCase();
        const queHayMateria = formatearTexto(materia.queHay).toLowerCase();

        const coincideBusqueda =
            nombreMateria.includes(textoBusqueda) ||
            codigoMateria.includes(textoBusqueda) ||
            areaMateria.includes(textoBusqueda) ||
            queHayMateria.includes(textoBusqueda);

        const coincideAnio =
            anioSeleccionado === "" ||
            String(materia.anio) === String(anioSeleccionado);

        const estadoCalculado = calcularEstado(materia);
        const coincideEstado =
            estadoSeleccionado === "" ||
            estadoCalculado.includes(estadoSeleccionado) ||
            (materia.estado || "").includes(estadoSeleccionado);

        return coincideBusqueda && coincideAnio && coincideEstado;
    });

    renderizarMaterias(materiasFiltradas);
}

if (searchInput) searchInput.addEventListener("input", filtrarMaterias);
if (yearFilter) yearFilter.addEventListener("change", filtrarMaterias);
if (statusFilter) statusFilter.addEventListener("change", filtrarMaterias);

cargarMaterias();

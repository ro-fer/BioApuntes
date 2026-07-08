const params = new URLSearchParams(window.location.search);
const codigoMateria = params.get("codigo");

const nombre = document.getElementById("materia-nombre");
const codigo = document.getElementById("materia-codigo");
const anio = document.getElementById("materia-anio");
const cuatrimestre = document.getElementById("materia-cuatrimestre");
const area = document.getElementById("materia-area");
const estado = document.getElementById("materia-estado");
const correlativas = document.getElementById("materia-correlativas");
const queHay = document.getElementById("materia-que-hay");
const materialDetectado = document.getElementById("materia-material-detectado");
const comentarios = document.getElementById("materia-comentarios");
const linksContainer = document.getElementById("materia-links");
const carpetasDriveContainer = document.getElementById("materia-carpetas-drive");
const contenidosContainer = document.getElementById("materia-contenidos");

async function cargarJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
    return await response.json();
}

async function cargarMateria() {
    try {
        if (!codigoMateria) {
            mostrarError("No se indicó ninguna materia en la URL.");
            return;
        }

        const materiasBase = await cargarJSON("../data/materias.json");
        let patchOneDrive = {};

        try {
            patchOneDrive = await cargarJSON("../data/onedrive_patch_bioapuntes.json");
        } catch (errorPatch) {
            console.warn("No se encontró patch de OneDrive. Se cargan solo los datos base.", errorPatch);
        }

        const materiaBase = materiasBase.find((item) => {
            return String(item.codigo).toLowerCase() === String(codigoMateria).toLowerCase();
        });

        if (!materiaBase) {
            mostrarError("No se encontró la materia solicitada.");
            return;
        }

        const materia = mezclarMateriaConOneDrive(materiaBase, patchOneDrive);

        document.title = `${materia.materia} | BioApuntes UNSAM`;

        nombre.textContent = materia.materia || "Materia sin nombre";
        codigo.textContent = materia.codigo ? `Código: ${materia.codigo}` : "Código no disponible";
        anio.textContent = materia.anio ? `Año: ${materia.anio}` : "Año no disponible";
        cuatrimestre.textContent = materia.cuatrimestre ? `Cuatrimestre: ${materia.cuatrimestre}` : "Cuatrimestre no disponible";
        area.textContent = materia.area || "Materia";

        estado.textContent = calcularEstado(materia);
        correlativas.textContent = formatearTexto(materia.correlativas);
        queHay.textContent = formatearTexto(materia.queHay);
        materialDetectado.textContent = formatearTexto(materia.materialDetectado);
        comentarios.textContent = formatearTexto(materia.comentarios);

        renderizarContenidos(materia.contenidosMinimos);
        renderizarLinks(materia.links);
        renderizarCarpetasDrive(materia.links);

    } catch (error) {
        console.error("Error cargando la materia:", error);
        mostrarError("Hubo un problema al cargar la información de la materia.");
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

function calcularEstado(materia) {
    const links = normalizarLinks(materia.links);
    const tieneOneDrive = links.some((link) => esLinkDrive(link.url));
    const tieneFrubox = links.some((link) => (link.nombre || "").toLowerCase().includes("frubox"));

    if (tieneOneDrive && tieneFrubox) return "✅ OneDrive + Frubox detectados";
    if (tieneOneDrive) return "✅ OneDrive detectado";
    if (tieneFrubox) return "✅ Frubox detectado";

    return materia.estado || "🟡 Sin revisar";
}

function formatearTexto(valor) {
    if (!valor || valor === "" || valor === "-") return "Sin información cargada";

    if (Array.isArray(valor)) {
        if (valor.length === 0) return "Sin información cargada";
        return valor.map((item) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item !== null) {
                return item.nombre || item.titulo || item.texto || item.descripcion || JSON.stringify(item);
            }
            return String(item);
        }).join(", ");
    }

    if (typeof valor === "object") {
        return Object.values(valor)
            .filter(Boolean)
            .map((item) => {
                if (typeof item === "string") return item;
                if (typeof item === "object" && item !== null) {
                    return item.nombre || item.titulo || item.texto || item.descripcion || JSON.stringify(item);
                }
                return String(item);
            })
            .join(", ");
    }

    return String(valor);
}

function renderizarContenidos(contenidos) {
    contenidosContainer.innerHTML = "";

    if (!contenidos || contenidos === "" || contenidos === "-") {
        contenidosContainer.innerHTML = `<p class="empty-text">Todavía no hay contenidos mínimos cargados para esta materia.</p>`;
        return;
    }

    const lista = normalizarContenidos(contenidos);

    if (lista.length === 0) {
        contenidosContainer.innerHTML = `<p class="empty-text">Todavía no hay contenidos mínimos cargados para esta materia.</p>`;
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "contenidos-bloques";

    lista.forEach((item) => {
        const bloque = document.createElement("div");
        bloque.className = "contenido-bloque";

        if (typeof item === "string") {
            bloque.innerHTML = `<p>${item}</p>`;
        } else {
            bloque.innerHTML = `
                <h3>${item.titulo}</h3>
                <p>${item.texto}</p>
            `;
        }

        wrapper.appendChild(bloque);
    });

    contenidosContainer.appendChild(wrapper);
}

function normalizarContenidos(contenidos) {
    if (Array.isArray(contenidos)) {
        return contenidos
            .map((item) => {
                if (typeof item === "string") return item;
                if (typeof item === "object" && item !== null) {
                    return item.contenido || item.texto || item.titulo || item.nombre || item.descripcion || Object.values(item).join(" ");
                }
                return String(item);
            })
            .filter((item) => item && item.trim() !== "");
    }

    if (typeof contenidos === "object" && contenidos !== null) {
        const lista = [];

        if (contenidos.cargaHorariaSemanalTexto) {
            lista.push({ titulo: "Carga horaria semanal", texto: contenidos.cargaHorariaSemanalTexto });
        }

        if (contenidos.cargaHorariaCuatrimestralTexto) {
            lista.push({ titulo: "Carga horaria cuatrimestral", texto: contenidos.cargaHorariaCuatrimestralTexto });
        }

        if (contenidos.texto) {
            lista.push({ titulo: "Temas", texto: contenidos.texto });
        }

        if (contenidos.fuente) {
            lista.push({ titulo: "Fuente", texto: contenidos.fuente });
        }

        return lista;
    }

    if (typeof contenidos === "string") {
        return contenidos
            .split(/\.\s+|;|\n/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    return [];
}

function renderizarLinks(links) {
    linksContainer.innerHTML = "";

    const linksNormalizados = normalizarLinks(links);
    const linksValidos = linksNormalizados.filter((link) => {
        if (!link.url || link.url === "" || link.url === "-") return false;

        const url = link.url.toLowerCase();
        const nombre = link.nombre.toLowerCase();

        const esDrive =
            url.includes("drive.google.com") ||
            url.includes("sharepoint.com") ||
            url.includes("onedrive") ||
            nombre.includes("drive") ||
            nombre.includes("onedrive");

        return !esDrive;
    });

    if (linksValidos.length === 0) {
        linksContainer.innerHTML = "<p>Sin otros links de material cargados para esta materia.</p>";
        return;
    }

    linksValidos.forEach((item) => {
        const link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "btn btn-secondary";
        link.textContent = item.nombre;
        linksContainer.appendChild(link);
    });
}

function renderizarCarpetasDrive(links) {
    carpetasDriveContainer.innerHTML = "";

    const linksNormalizados = normalizarLinks(links);
    const carpetasValidas = linksNormalizados.filter((link) => {
        const nombre = (link.nombre || "").toLowerCase();
        return link.url && (esLinkDrive(link.url) || nombre.includes("drive") || nombre.includes("onedrive"));
    });

    if (carpetasValidas.length === 0) {
        carpetasDriveContainer.innerHTML = "<p>Sin carpetas de Drive u OneDrive cargadas para esta materia.</p>";
        return;
    }

    carpetasValidas.forEach((carpeta) => {
        const link = document.createElement("a");
        link.href = carpeta.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "btn btn-primary";
        link.textContent = carpeta.nombre;
        carpetasDriveContainer.appendChild(link);
    });
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

function mostrarError(mensaje) {
    nombre.textContent = "Materia no encontrada";
    area.textContent = "Error";
    codigo.textContent = "";
    anio.textContent = "";
    cuatrimestre.textContent = "";

    estado.textContent = "";
    correlativas.textContent = "";
    queHay.textContent = "";
    materialDetectado.textContent = "";
    comentarios.textContent = "";

    linksContainer.innerHTML = "";
    carpetasDriveContainer.innerHTML = "";
    contenidosContainer.innerHTML = `<p class="empty-text">${mensaje}</p>`;
}

cargarMateria();

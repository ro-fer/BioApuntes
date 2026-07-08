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

async function cargarMateria() {
    try {
        if (!codigoMateria) {
            mostrarError("No se indicó ninguna materia en la URL.");
            return;
        }

        const response = await fetch("../data/materias.json");

        if (!response.ok) {
            throw new Error("No se pudo cargar materias.json");
        }

        const materias = await response.json();

        const materia = materias.find((item) => {
            return String(item.codigo).toLowerCase() === String(codigoMateria).toLowerCase();
        });

        if (!materia) {
            mostrarError("No se encontró la materia solicitada.");
            return;
        }

        document.title = `${materia.materia} | BioApuntes UNSAM`;

        nombre.textContent = materia.materia || "Materia sin nombre";
        codigo.textContent = materia.codigo ? `Código: ${materia.codigo}` : "Código no disponible";
        anio.textContent = materia.anio ? `Año: ${materia.anio}` : "Año no disponible";
        cuatrimestre.textContent = materia.cuatrimestre ? `Cuatrimestre: ${materia.cuatrimestre}` : "Cuatrimestre no disponible";
        area.textContent = materia.area || "Materia";

        estado.textContent = materia.estado || "Sin estado";
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

function formatearTexto(valor) {
    if (!valor || valor === "" || valor === "-") {
        return "Sin información cargada";
    }

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

function renderizarLinks(links) {
    linksContainer.innerHTML = "";

    if (!links || links.length === 0 || Object.keys(links).length === 0) {
        linksContainer.innerHTML = "<p>Sin links cargados para esta materia.</p>";
        return;
    }

    let linksNormalizados = [];

    if (Array.isArray(links)) {
        linksNormalizados = links.map((link, index) => {
            if (typeof link === "string") {
                return {
                    nombre: `Link ${index + 1}`,
                    url: link
                };
            }

            return {
                nombre: link.nombre || link.titulo || link.tipo || `Link ${index + 1}`,
                url: link.url || link.link || link.href || link.drive || link.frubox || ""
            };
        });
    } else {
        linksNormalizados = Object.entries(links).map(([clave, valor]) => {
            if (typeof valor === "string") {
                return {
                    nombre: formatearNombreLink(clave),
                    url: valor
                };
            }

            if (typeof valor === "object" && valor !== null) {
                return {
                    nombre: valor.nombre || valor.titulo || valor.tipo || formatearNombreLink(clave),
                    url: valor.url || valor.link || valor.href || ""
                };
            }

            return {
                nombre: formatearNombreLink(clave),
                url: ""
            };
        });
    }

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

    if (!links || links.length === 0 || Object.keys(links).length === 0) {
        carpetasDriveContainer.innerHTML = "<p>Sin carpetas de Drive u OneDrive cargadas para esta materia.</p>";
        return;
    }

    let carpetas = [];

    if (Array.isArray(links)) {
        carpetas = links
            .map((link, index) => {
                if (typeof link === "string") {
                    const esDrive = esLinkDrive(link);

                    return esDrive
                        ? {
                            nombre: `Carpeta ${index + 1}`,
                            url: link
                        }
                        : null;
                }

                if (typeof link === "object" && link !== null) {
                    const url = link.url || link.link || link.href || link.drive || link.frubox || "";
                    const nombre = link.nombre || link.titulo || link.tipo || `Carpeta ${index + 1}`;

                    return esLinkDrive(url) || nombre.toLowerCase().includes("drive")
                        ? {
                            nombre: nombre,
                            url: url
                        }
                        : null;
                }

                return null;
            })
            .filter(Boolean);
    } else {
        carpetas = Object.entries(links)
            .map(([clave, valor]) => {
                if (!valor) return null;

                if (typeof valor === "string") {
                    const esCarpeta =
                        clave.toLowerCase().includes("drive") ||
                        clave.toLowerCase().includes("onedrive") ||
                        esLinkDrive(valor);

                    return esCarpeta
                        ? {
                            nombre: formatearNombreLink(clave),
                            url: valor
                        }
                        : null;
                }

                if (typeof valor === "object" && valor !== null) {
                    const url = valor.url || valor.link || valor.href || "";
                    const nombre = valor.nombre || valor.titulo || valor.tipo || formatearNombreLink(clave);

                    const esCarpeta =
                        clave.toLowerCase().includes("drive") ||
                        clave.toLowerCase().includes("onedrive") ||
                        nombre.toLowerCase().includes("drive") ||
                        nombre.toLowerCase().includes("onedrive") ||
                        esLinkDrive(url);

                    return esCarpeta
                        ? {
                            nombre: nombre,
                            url: url
                        }
                        : null;
                }

                return null;
            })
            .filter(Boolean);
    }

    const carpetasValidas = carpetas.filter((carpeta) => {
        return carpeta.url && carpeta.url !== "" && carpeta.url !== "-";
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

function renderizarContenidos(contenidos) {
    contenidosContainer.innerHTML = "";

    if (!contenidos || contenidos === "" || contenidos === "-") {
        contenidosContainer.innerHTML = `
            <p class="empty-text">
                Todavía no hay contenidos mínimos cargados para esta materia.
            </p>
        `;
        return;
    }

    const lista = normalizarContenidos(contenidos);

    if (lista.length === 0) {
        contenidosContainer.innerHTML = `
            <p class="empty-text">
                Todavía no hay contenidos mínimos cargados para esta materia.
            </p>
        `;
        return;
    }

    const ul = document.createElement("ul");

    lista.forEach((contenido) => {
        const li = document.createElement("li");
        li.textContent = contenido;
        ul.appendChild(li);
    });

    contenidosContainer.appendChild(ul);
}

function normalizarContenidos(contenidos) {
    if (Array.isArray(contenidos)) {
        return contenidos
            .map((item) => {
                if (typeof item === "string") return item;

                if (typeof item === "object" && item !== null) {
                    return (
                        item.contenido ||
                        item.texto ||
                        item.titulo ||
                        item.nombre ||
                        item.descripcion ||
                        Object.values(item).join(": ")
                    );
                }

                return String(item);
            })
            .filter((item) => item && item.trim() !== "");
    }

    if (typeof contenidos === "object" && contenidos !== null) {
        return Object.entries(contenidos)
            .map(([clave, valor]) => {
                if (!valor) return "";

                if (typeof valor === "string") {
                    return `${clave}: ${valor}`;
                }

                if (Array.isArray(valor)) {
                    return `${clave}: ${valor.join(", ")}`;
                }

                if (typeof valor === "object") {
                    return `${clave}: ${Object.values(valor).join(", ")}`;
                }

                return `${clave}: ${String(valor)}`;
            })
            .filter((item) => item && item.trim() !== "");
    }

    if (typeof contenidos === "string") {
        return contenidos
            .split(/\.|;|\n/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    return [];
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
    contenidosContainer.innerHTML = `
        <p class="empty-text">
            ${mensaje}
        </p>
    `;
}

cargarMateria();
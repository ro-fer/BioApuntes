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
const cursadasContainer = document.getElementById("materia-cursadas");

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
        let cursadas = [];

        try {
            patchOneDrive = await cargarJSON("../data/onedrive_patch_bioapuntes.json");
        } catch (errorPatch) {
            console.warn("No se encontró patch de OneDrive. Se cargan solo los datos base.", errorPatch);
        }

        try {
            cursadas = await cargarJSON("../data/cursadas.json");
        } catch (errorCursadas) {
            console.warn("No se encontró data/cursadas.json. Se carga la materia sin horarios.", errorCursadas);
            cursadas = [];
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
        renderizarCursadas(obtenerCursadasMateria(materia.codigo, cursadas));
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

    if (Array.isArray(valor)) {
        return valor
            .filter(Boolean)
            .map((item) => typeof item === "string" ? item.trim() : item)
            .filter(Boolean);
    }

    if (typeof valor === "string") {
        return valor
            .split(";")
            .flatMap((item) => item.split(","))
            .flatMap((item) => item.split("\n"))
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [valor];
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
            .split(". ")
            .flatMap((item) => item.split(";"))
            .flatMap((item) => item.split("\n"))
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

function obtenerCursadasMateria(codigoMateria, listaCursadas) {
    return (listaCursadas || []).filter((cursada) => {
        return String(cursada.codigoMateria || "").toLowerCase() === String(codigoMateria || "").toLowerCase();
    });
}

function renderizarCursadas(listaCursadas) {
    if (!cursadasContainer) return;

    cursadasContainer.innerHTML = "";

    if (!listaCursadas || listaCursadas.length === 0) {
        cursadasContainer.innerHTML = `
            <p class="empty-text">Todavía no hay cursadas u horarios cargados para esta materia.</p>
            <p class="empty-text">Cuando tengas datos, agregalos en <strong>data/cursadas.json</strong>.</p>
        `;
        return;
    }

    const aviso = document.createElement("p");
    aviso.className = "empty-text";
    aviso.innerHTML = "⚠️ Los horarios pueden cambiar. Usalos como referencia y verificá siempre la oferta oficial antes de inscribirte.";
    cursadasContainer.appendChild(aviso);

    const grupos = agruparPorPeriodo(listaCursadas);

    Object.entries(grupos).forEach(([periodo, cursadasPeriodo]) => {
        const bloquePeriodo = document.createElement("div");
        bloquePeriodo.className = "cursadas-periodo";

        bloquePeriodo.innerHTML = `<h3>${periodo || "Período no especificado"}</h3>`;

        cursadasPeriodo.forEach((cursada) => {
            const item = document.createElement("div");
            item.className = "cursada-item";

            const dias = formatearDiasHorarios(cursada.diasHorarios);
            const marcas = [];

            if (cursada.seDictaSabados || tieneDiaSabado(cursada)) {
                marcas.push("📅 sábados");
            }

            if (cursada.seDictaEnVerano || String(cursada.periodo || "").toLowerCase().includes("verano")) {
                marcas.push("🌞 verano");
            }

            item.innerHTML = `
                <h4>${cursada.comision || "Comisión sin nombre"}</h4>
                <p><strong>Turno:</strong> ${normalizarTurno(cursada.turno)}</p>
                <p><strong>Días y horarios:</strong> ${dias || "Horario a completar"}</p>
                <p><strong>Modalidad:</strong> ${cursada.modalidad || "No especificada"}</p>
                <p><strong>Sede:</strong> ${cursada.sede || "No especificada"}</p>
                ${marcas.length ? `<p><strong>Notas:</strong> ${marcas.join(" · ")}</p>` : ""}
                <p><strong>Estado:</strong> ${cursada.estadoHorario || "A verificar"}</p>
                <p><strong>Fuente:</strong> ${cursada.fuente || "Sin fuente cargada"}</p>
                ${cursada.observaciones ? `<p><strong>Observaciones:</strong> ${cursada.observaciones}</p>` : ""}
            `;

            bloquePeriodo.appendChild(item);
        });

        cursadasContainer.appendChild(bloquePeriodo);
    });
}

function agruparPorPeriodo(listaCursadas) {
    return listaCursadas.reduce((grupos, cursada) => {
        const periodo = cursada.periodo || "Sin período";
        if (!grupos[periodo]) grupos[periodo] = [];
        grupos[periodo].push(cursada);
        return grupos;
    }, {});
}

function formatearDiasHorarios(diasHorarios) {
    const lista = Array.isArray(diasHorarios)
        ? diasHorarios.filter(Boolean)
        : normalizarArray(diasHorarios);

    if (lista.length === 0) return "Horario a completar";

    return lista.map((item) => {
        if (typeof item === "string") return item;

        const dia = item.dia || "";
        const horario = item.horario || [item.desde, item.hasta].filter(Boolean).join(" a ");
        const aula = item.aula ? `— ${item.aula}` : "";
        const sede = item.sede ? `— ${item.sede}` : "";

        return [dia, horario, aula || sede].filter(Boolean).join(" ");
    }).join("; ");
}

function normalizarTurno(turno) {
    const texto = String(turno || "").trim();

    if (!texto || texto === "-" || texto.toLowerCase() === "no especificada") {
        return "No especificado";
    }

    return texto;
}

function tieneDiaSabado(cursada) {
    const lista = Array.isArray(cursada.diasHorarios)
        ? cursada.diasHorarios.filter(Boolean)
        : normalizarArray(cursada.diasHorarios);

    return lista.some((diaHorario) => {
        if (typeof diaHorario === "string") {
            return diaHorario.toLowerCase().includes("sábado") || diaHorario.toLowerCase().includes("sabado");
        }

        const dia = String(diaHorario?.dia || "").toLowerCase();
        return dia.includes("sábado") || dia.includes("sabado");
    });
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

    if (cursadasContainer) {
        cursadasContainer.innerHTML = "";
    }
}

cargarMateria();
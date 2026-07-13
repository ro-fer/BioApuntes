"use strict";

const DATA_URL = "../data/optativas.json";

const elementos = {
    grilla: document.querySelector("#grilla-optativas"),
    contador: document.querySelector("#contador"),
    carga: document.querySelector("#estado-carga"),
    error: document.querySelector("#error-carga"),
    sinResultados: document.querySelector("#sin-resultados"),
    busqueda: document.querySelector("#busqueda"),
    area: document.querySelector("#filtro-area"),
    modalidad: document.querySelector("#filtro-modalidad"),
    cursada: document.querySelector("#filtro-cursada"),
    ordenar: document.querySelector("#ordenar"),
    limpiar: document.querySelector("#limpiar-filtros"),
    modal: document.querySelector("#detalle-modal"),
    modalContenido: document.querySelector("#detalle-contenido"),
    modalCerrar: document.querySelector(".modal-close")
};

let optativas = [];

iniciar();

async function iniciar() {
    registrarEventos();

    try {
        const respuesta = await fetch(DATA_URL);

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error("El JSON debe contener un arreglo.");
        }

        optativas = datos;

        completarFiltros(datos);
        renderizar();

    } catch (error) {
        console.error("No se pudieron cargar las optativas:", error);

        if (elementos.carga) elementos.carga.hidden = true;
        if (elementos.error) {
            elementos.error.hidden = false;
            elementos.error.innerHTML = `
                <h2>⚠️ No se pudo cargar el archivo de optativas</h2>
                <p>
                    Revisá que exista <strong>data/optativas.json</strong>,
                    que esté subido a GitHub y que no tenga errores de formato.
                </p>
                <p class="empty-text">
                    Error técnico: ${escapar(error.message)}
                </p>
            `;
        }

        if (elementos.contador) {
            elementos.contador.textContent = "No disponible";
        }
    }
}

function registrarEventos() {
    [
        elementos.busqueda,
        elementos.area,
        elementos.modalidad,
        elementos.cursada,
        elementos.ordenar
    ].forEach(control => {
        control?.addEventListener("input", renderizar);
        control?.addEventListener("change", renderizar);
    });

    elementos.limpiar?.addEventListener("click", limpiarFiltros);
    document.querySelector('[data-action="limpiar"]')?.addEventListener("click", limpiarFiltros);

    elementos.modalCerrar?.addEventListener("click", cerrarModal);

    elementos.modal?.addEventListener("click", (evento) => {
        if (evento.target === elementos.modal) {
            cerrarModal();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            cerrarModal();
        }
    });
}

function completarFiltros(datos) {
    const todasLasAreas = datos.flatMap(item => obtenerAreas(item));
    const todasLasModalidades = datos.map(item => item.modalidad || "Sin modalidad informada");

    llenarSelect(elementos.area, valoresUnicos(todasLasAreas));
    llenarSelect(elementos.modalidad, valoresUnicos(todasLasModalidades));
}

function obtenerAreas(item) {
    const area = item.area;

    if (Array.isArray(area)) {
        const areasLimpias = area
            .map(valor => String(valor).trim())
            .filter(valor => valor !== "");

        return areasLimpias.length > 0 ? areasLimpias : ["Sin área informada"];
    }

    if (typeof area === "string") {
        const areaLimpia = area.trim();
        return areaLimpia !== "" ? [areaLimpia] : ["Sin área informada"];
    }

    return ["Sin área informada"];
}

function mostrarAreas(item) {
    return obtenerAreas(item).join(" / ");
}

function valoresUnicos(valores) {
    return [...new Set(
        valores
            .filter(Boolean)
            .map(valor => String(valor).trim())
            .filter(valor => valor !== "")
    )].sort((a, b) => a.localeCompare(b, "es"));
}

function llenarSelect(select, valores) {
    if (!select) return;

    const primeraOpcion = select.querySelector("option")?.outerHTML || "";

    select.innerHTML = primeraOpcion;

    const opciones = valores
        .map(valor => `<option value="${escapar(valor)}">${escapar(valor)}</option>`)
        .join("");

    select.insertAdjacentHTML("beforeend", opciones);
}

function renderizar() {
    if (!optativas.length) return;

    const filtradas = obtenerFiltradas();

    if (elementos.carga) elementos.carga.hidden = true;
    if (elementos.error) elementos.error.hidden = true;

    if (elementos.sinResultados) {
        elementos.sinResultados.hidden = filtradas.length > 0;
    }

    if (elementos.grilla) {
        elementos.grilla.hidden = filtradas.length === 0;
        elementos.grilla.innerHTML = filtradas.map(crearTarjeta).join("");
    }

    if (elementos.contador) {
        elementos.contador.textContent =
            `${filtradas.length} de ${optativas.length} ${filtradas.length === 1 ? "materia" : "materias"}`;
    }
}

function obtenerFiltradas() {
    const termino = normalizar(elementos.busqueda?.value || "");
    const areaSeleccionada = elementos.area?.value || "";
    const modalidadSeleccionada = elementos.modalidad?.value || "";
    const filtroCursada = elementos.cursada?.value || "";

    const resultado = optativas.filter(item => {
        const texto = normalizar([
            item.materia,
            item.codigo,
            mostrarAreas(item),
            item.modalidad,
            ...(item.correlativas || []),
            item.comentarios,
            item.oferta?.horario,
            item.oferta?.observaciones
        ].filter(Boolean).join(" "));

        const coincideBusqueda = !termino || texto.includes(termino);

        const coincideArea =
            !areaSeleccionada ||
            obtenerAreas(item).includes(areaSeleccionada);

        const coincideModalidad =
            !modalidadSeleccionada ||
            (item.modalidad || "Sin modalidad informada") === modalidadSeleccionada;

        const coincideCursada = coincideFiltroCursada(item, filtroCursada);

        return coincideBusqueda && coincideArea && coincideModalidad && coincideCursada;
    });

    return [...resultado].sort((a, b) => {
        const ordenarPor = elementos.ordenar?.value || "nombre";

        if (ordenarPor === "material") {
            return (
                Number(enlacesValidos(b).length > 0) -
                Number(enlacesValidos(a).length > 0)
            ) || a.materia.localeCompare(b.materia, "es");
        }

        if (ordenarPor === "puntaje") {
            return (
                (b.puntaje ?? -1) -
                (a.puntaje ?? -1)
            ) || a.materia.localeCompare(b.materia, "es");
        }

        return a.materia.localeCompare(b.materia, "es");
    });
}

function coincideFiltroCursada(item, filtro) {
    if (!filtro) return true;

    const oferta = item.oferta || {};
    const cuatrimestres = Array.isArray(oferta.cuatrimestres) ? oferta.cuatrimestres : [];
    const cuatrimestresNormalizados = cuatrimestres.map(normalizar);

    const tieneInformacion =
        cuatrimestres.length > 0 ||
        Boolean(oferta.horario?.trim()) ||
        Boolean(oferta.observaciones?.trim()) ||
        (Array.isArray(oferta.anios) && oferta.anios.length > 0);

    const seDictaPrimero = cuatrimestresNormalizados.some(valor =>
        valor.includes("1°") ||
        valor.includes("1o") ||
        valor.includes("primer")
    );

    const seDictaSegundo = cuatrimestresNormalizados.some(valor =>
        valor.includes("2°") ||
        valor.includes("2o") ||
        valor.includes("segundo")
    );

    if (filtro === "con-info") return tieneInformacion;
    if (filtro === "sin-info") return !tieneInformacion;
    if (filtro === "primero") return seDictaPrimero;
    if (filtro === "segundo") return seDictaSegundo;
    if (filtro === "ambos") return seDictaPrimero && seDictaSegundo;

    return true;
}

function crearTarjeta(item) {
    const links = enlacesValidos(item);
    const tieneMaterial = links.length > 0;
    const oferta = item.oferta || {};

    const revision = item.revisionPendiente?.length
        ? `
            <p class="optativa-review">
                🛠️ ${item.revisionPendiente.length}
                dato${item.revisionPendiente.length > 1 ? "s" : ""}
                pendiente${item.revisionPendiente.length > 1 ? "s" : ""}
                de revisión.
            </p>
        `
        : "";

    const cuatrimestres = Array.isArray(oferta.cuatrimestres) && oferta.cuatrimestres.length > 0
        ? oferta.cuatrimestres.join(" · ")
        : "No informado";

    const horario = oferta.horario || oferta.observaciones || "No informado";

    const correlativas = Array.isArray(item.correlativas) && item.correlativas.length > 0
        ? item.correlativas.join(" · ")
        : "No informadas";

    return `
        <article class="materia-card card optativa-card">
            <div>
                <div class="materia-card-header">
                    <div class="optativa-badges">
                        <span class="optativa-badge">
                            ${escapar(mostrarAreas(item))}
                        </span>

                        <span class="optativa-badge ${tieneMaterial ? "material" : "sin-material"}">
                            ${
                                tieneMaterial
                                    ? `✓ ${links.length} recurso${links.length > 1 ? "s" : ""}`
                                    : "Sin material cargado"
                            }
                        </span>
                    </div>

                    <h2>${escapar(item.materia || "Materia sin nombre")}</h2>

                    <p class="materia-area">
                        ${escapar(item.codigo || "Código no informado")}
                    </p>
                </div>

                <div class="materia-card-info">
                    <p><strong>Modalidad:</strong> ${escapar(item.modalidad || "No informada")}</p>
                    <p><strong>Cuatrimestre:</strong> ${escapar(cuatrimestres)}</p>
                    <p><strong>Horario:</strong> ${escapar(horario)}</p>
                    <p><strong>Correlativas:</strong> ${escapar(correlativas)}</p>
                    <p><strong>Puntaje:</strong> ${
                        item.puntaje != null ? `${item.puntaje} puntos` : "No informado"
                    }</p>
                </div>

                ${revision}
            </div>

            <div class="card-buttons">
                <a class="btn btn-secondary" href="./optativa.html?id=${encodeURIComponent(item.id)}">
                    Ver detalle
                </a>

                ${
                    tieneMaterial
                        ? `
                            <a class="btn btn-primary" href="${escapar(links[0].url)}" target="_blank" rel="noopener noreferrer">
                                Abrir material
                            </a>
                        `
                        : ""
                }
            </div>
        </article>
    `;
}

function enlacesValidos(item) {
    if (!Array.isArray(item.links)) return [];

    return item.links.filter(link => {
        return link && link.url && String(link.url).trim() !== "";
    });
}

function limpiarFiltros() {
    if (elementos.busqueda) elementos.busqueda.value = "";
    if (elementos.area) elementos.area.value = "";
    if (elementos.modalidad) elementos.modalidad.value = "";
    if (elementos.cursada) elementos.cursada.value = "";
    if (elementos.ordenar) elementos.ordenar.value = "nombre";

    renderizar();

    elementos.busqueda?.focus();
}

function cerrarModal() {
    if (!elementos.modal) return;

    elementos.modal.hidden = true;

    if (elementos.modalContenido) {
        elementos.modalContenido.innerHTML = "";
    }
}

function normalizar(valor = "") {
    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es")
        .trim();
}

function escapar(valor = "") {
    return String(valor).replace(/[&<>'"]/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;"
    })[caracter]);
}
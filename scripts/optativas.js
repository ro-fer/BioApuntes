"use strict";

const DATA_URL = "../data/optativas.json";

let optativas = [];

const busqueda = document.querySelector("#busqueda");
const filtroArea = document.querySelector("#filtro-area");
const filtroModalidad = document.querySelector("#filtro-modalidad");
const filtroCursada = document.querySelector("#filtro-cursada");
const filtroPuntaje = document.querySelector("#filtro-puntaje");
const ordenar = document.querySelector("#ordenar");
const limpiarFiltros = document.querySelector("#limpiar-filtros");

const contador = document.querySelector("#contador");
const estadoCarga = document.querySelector("#estado-carga");
const grilla = document.querySelector("#grilla-optativas");
const sinResultados = document.querySelector("#sin-resultados");
const errorCarga = document.querySelector("#error-carga");

iniciarOptativas();

async function iniciarOptativas() {
    try {
        const respuesta = await fetch(DATA_URL);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        optativas = Array.isArray(datos) ? datos : [];

        cargarFiltros();
        activarEventos();
        filtrarYRenderizar();

        if (estadoCarga) estadoCarga.hidden = true;
        if (errorCarga) errorCarga.hidden = true;
    } catch (error) {
        console.error("No se pudo cargar optativas.json:", error);

        if (estadoCarga) estadoCarga.hidden = true;
        if (errorCarga) errorCarga.hidden = false;
        if (grilla) grilla.innerHTML = "";
        if (contador) contador.textContent = "No se pudo cargar la información.";
    }
}

function cargarFiltros() {
    cargarFiltroArea();
    cargarFiltroModalidad();
    cargarFiltroPuntaje();
}

function cargarFiltroArea() {
    if (!filtroArea) return;

    const areas = [...new Set(
        optativas
            .flatMap((item) => normalizarArray(item.area))
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b), "es"))
    )];

    filtroArea.innerHTML = `<option value="">Todas las áreas</option>`;

    areas.forEach((area) => {
        const option = document.createElement("option");
        option.value = area;
        option.textContent = area;
        filtroArea.appendChild(option);
    });
}

function cargarFiltroModalidad() {
    if (!filtroModalidad) return;

    const modalidades = [...new Set(
        optativas
            .map((item) => item.modalidad)
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b), "es"))
    )];

    filtroModalidad.innerHTML = `<option value="">Todas las modalidades</option>`;

    modalidades.forEach((modalidad) => {
        const option = document.createElement("option");
        option.value = modalidad;
        option.textContent = modalidad;
        filtroModalidad.appendChild(option);
    });
}

function cargarFiltroPuntaje() {
    if (!filtroPuntaje) return;

    const puntajes = [...new Set(
        optativas
            .map((item) => item.puntaje)
            .filter((puntaje) => puntaje !== null && puntaje !== undefined && puntaje !== "")
            .map((puntaje) => Number(puntaje))
            .filter((puntaje) => !Number.isNaN(puntaje))
    )].sort((a, b) => a - b);

    filtroPuntaje.innerHTML = `<option value="">Todos los puntajes</option>`;

    puntajes.forEach((puntaje) => {
        const option = document.createElement("option");
        option.value = String(puntaje);
        option.textContent = formatearPuntaje(puntaje);
        filtroPuntaje.appendChild(option);
    });

    const optionSinPuntaje = document.createElement("option");
    optionSinPuntaje.value = "sin-puntaje";
    optionSinPuntaje.textContent = "Sin puntaje cargado";
    filtroPuntaje.appendChild(optionSinPuntaje);
}

function activarEventos() {
    if (busqueda) busqueda.addEventListener("input", filtrarYRenderizar);
    if (filtroArea) filtroArea.addEventListener("change", filtrarYRenderizar);
    if (filtroModalidad) filtroModalidad.addEventListener("change", filtrarYRenderizar);
    if (filtroCursada) filtroCursada.addEventListener("change", filtrarYRenderizar);
    if (filtroPuntaje) filtroPuntaje.addEventListener("change", filtrarYRenderizar);
    if (ordenar) ordenar.addEventListener("change", filtrarYRenderizar);

    if (limpiarFiltros) {
        limpiarFiltros.addEventListener("click", limpiarTodo);
    }

    document.querySelectorAll("[data-action='limpiar']").forEach((boton) => {
        boton.addEventListener("click", limpiarTodo);
    });
}

function filtrarYRenderizar() {
    const texto = normalizarTexto(busqueda?.value || "");
    const areaSeleccionada = filtroArea?.value || "";
    const modalidadSeleccionada = filtroModalidad?.value || "";
    const cursadaSeleccionada = filtroCursada?.value || "";
    const puntajeSeleccionado = filtroPuntaje?.value || "";
    const ordenSeleccionado = ordenar?.value || "nombre";

    let resultado = optativas.filter((item) => {
        const areas = normalizarArray(item.area);
        const correlativas = normalizarArray(item.correlativas);
        const oferta = item.oferta || {};
        const cuatrimestres = normalizarArray(oferta.cuatrimestres);

        const textoItem = normalizarTexto([
            item.materia,
            item.codigo,
            item.modalidad,
            item.puntaje,
            areas.join(" "),
            correlativas.join(" "),
            oferta.horario,
            oferta.observaciones,
            item.comentarios,
            item.contenidosMinimos
        ].filter(Boolean).join(" "));

        const coincideBusqueda = texto === "" || textoItem.includes(texto);

        const coincideArea =
            areaSeleccionada === "" ||
            areas.includes(areaSeleccionada);

        const coincideModalidad =
            modalidadSeleccionada === "" ||
            item.modalidad === modalidadSeleccionada;

        const coincideCursada = coincideFiltroCursada(item, cuatrimestres, cursadaSeleccionada);
        const coincidePuntaje = coincideFiltroPuntaje(item, puntajeSeleccionado);

        return coincideBusqueda &&
            coincideArea &&
            coincideModalidad &&
            coincideCursada &&
            coincidePuntaje;
    });

    resultado = ordenarOptativas(resultado, ordenSeleccionado);

    renderizarOptativas(resultado);
}

function coincideFiltroPuntaje(item, puntajeSeleccionado) {
    if (puntajeSeleccionado === "") return true;

    const puntaje = item.puntaje;

    if (puntajeSeleccionado === "sin-puntaje") {
        return puntaje === null || puntaje === undefined || puntaje === "";
    }

    return Number(puntaje) === Number(puntajeSeleccionado);
}

function coincideFiltroCursada(item, cuatrimestres, filtro) {
    if (filtro === "") return true;

    const oferta = item.oferta || {};
    const tieneHorario = Boolean(oferta.horario || oferta.observaciones);
    const tieneCuatrimestre = cuatrimestres.length > 0;

    const tienePrimero = cuatrimestres.some((valor) => {
        const texto = normalizarTexto(valor);
        return texto.includes("1") || texto.includes("primer");
    });

    const tieneSegundo = cuatrimestres.some((valor) => {
        const texto = normalizarTexto(valor);
        return texto.includes("2") || texto.includes("segund");
    });

    if (filtro === "primero") return tienePrimero;
    if (filtro === "segundo") return tieneSegundo;
    if (filtro === "ambos") return tienePrimero && tieneSegundo;
    if (filtro === "con-info") return tieneHorario || tieneCuatrimestre;
    if (filtro === "sin-info") return !tieneHorario && !tieneCuatrimestre;

    return true;
}

function ordenarOptativas(lista, criterio) {
    const copia = [...lista];

    if (criterio === "material") {
        return copia.sort((a, b) => {
            const materialA = tieneMaterial(a) ? 1 : 0;
            const materialB = tieneMaterial(b) ? 1 : 0;

            if (materialA !== materialB) return materialB - materialA;
            return compararNombre(a, b);
        });
    }

    if (criterio === "puntaje") {
        return copia.sort((a, b) => {
            const puntajeA = a.puntaje == null ? -1 : Number(a.puntaje);
            const puntajeB = b.puntaje == null ? -1 : Number(b.puntaje);

            if (puntajeA !== puntajeB) return puntajeB - puntajeA;
            return compararNombre(a, b);
        });
    }

    return copia.sort(compararNombre);
}

function compararNombre(a, b) {
    return String(a.materia || "").localeCompare(String(b.materia || ""), "es");
}

function renderizarOptativas(lista) {
    if (!grilla) return;

    grilla.innerHTML = "";

    if (contador) {
        contador.textContent = `${lista.length} materia${lista.length === 1 ? "" : "s"} encontrada${lista.length === 1 ? "" : "s"}.`;
    }

    if (lista.length === 0) {
        if (sinResultados) sinResultados.hidden = false;
        return;
    }

    if (sinResultados) sinResultados.hidden = true;

    lista.forEach((item) => {
        const card = document.createElement("article");
        card.className = "materia-card optativa-card card";

        const oferta = item.oferta || {};
        const areas = normalizarArray(item.area);
        const correlativas = normalizarArray(item.correlativas);
        const cuatrimestres = normalizarArray(oferta.cuatrimestres);
        const materialUrl = linkPrincipal(item);

        card.innerHTML = `
            <div class="materia-card-header">
                <p class="materia-area">${escapar(areas.join(" · ") || "Área no informada")}</p>
                <h2>${escapar(item.materia || "Materia sin nombre")}</h2>
            </div>

            <div class="materia-card-info">
                <p><strong>Código:</strong> ${escapar(item.codigo || "Sin código")}</p>
                <p><strong>Puntaje:</strong> ${escapar(formatearPuntaje(item.puntaje))}</p>
                <p><strong>Modalidad:</strong> ${escapar(item.modalidad || "No informada")}</p>
                <p><strong>Carga semanal:</strong> ${item.cargaHorariaSemanal != null ? `${escapar(item.cargaHorariaSemanal)} h` : "No informada"}</p>
                <p><strong>Correlativas:</strong> ${escapar(correlativas.join(" · ") || "No informadas")}</p>
                <p><strong>Cuatrimestre:</strong> ${escapar(cuatrimestres.join(" · ") || "No informado")}</p>
                <p><strong>Horario:</strong> ${escapar(oferta.horario || oferta.observaciones || "No informado")}</p>
                <p><strong>Material:</strong> ${tieneMaterial(item) ? "✅ Con material" : "Sin material cargado"}</p>
            </div>

            <div class="card-buttons">
                <a href="./optativa.html?id=${encodeURIComponent(item.id)}" class="btn btn-secondary">Ver detalle</a>
                ${materialUrl ? `<a href="${escapar(materialUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Abrir material</a>` : ""}
            </div>
        `;

        grilla.appendChild(card);
    });
}

function limpiarTodo() {
    if (busqueda) busqueda.value = "";
    if (filtroArea) filtroArea.value = "";
    if (filtroModalidad) filtroModalidad.value = "";
    if (filtroCursada) filtroCursada.value = "";
    if (filtroPuntaje) filtroPuntaje.value = "";
    if (ordenar) ordenar.value = "nombre";

    filtrarYRenderizar();
}

function formatearPuntaje(puntaje) {
    if (puntaje === null || puntaje === undefined || puntaje === "") {
        return "Sin puntaje cargado";
    }

    const numero = Number(puntaje);

    if (Number.isNaN(numero)) {
        return String(puntaje);
    }

    return `${numero} punto${numero === 1 ? "" : "s"}`;
}

function normalizarArray(valor) {
    if (!valor) return [];

    if (Array.isArray(valor)) {
        return valor
            .filter(Boolean)
            .map((item) => typeof item === "string" ? item.trim() : item)
            .filter(Boolean);
    }

    return [String(valor).trim()].filter(Boolean);
}

function normalizarTexto(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function tieneMaterial(item) {
    return Array.isArray(item.links) && item.links.some((link) => link && link.url);
}

function linkPrincipal(item) {
    if (!Array.isArray(item.links)) return "";

    const link = item.links.find((elemento) => elemento && elemento.url);
    return link ? link.url : "";
}

function escapar(valor = "") {
    return String(valor).replace(/[&<>'"]/g, (caracter) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;"
    })[caracter]);
}

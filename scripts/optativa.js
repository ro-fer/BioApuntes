"use strict";

const DATA_URL = "../data/optativas.json";
const contenedor = document.querySelector("#detalle-optativa");
const estadoCarga = document.querySelector("#estado-carga-detalle");
const errorDetalle = document.querySelector("#error-detalle");

iniciarDetalle();

async function iniciarDetalle() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return mostrarError();

    try {
        const respuesta = await fetch(DATA_URL);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        const materia = Array.isArray(datos) ? datos.find(item => item.id === id) : null;
        if (!materia) return mostrarError();

        renderizarDetalle(materia);
    } catch (error) {
        console.error("No se pudo cargar el detalle de la optativa:", error);
        mostrarError();
    }
}

function renderizarDetalle(item) {
    const oferta = item.oferta || {};
    const links = enlacesValidos(item);
    const revisiones = Array.isArray(item.revisionPendiente) ? item.revisionPendiente : [];

    document.title = `${item.materia || "Optativa"} | BioApuntes UNSAM`;

    contenedor.innerHTML = `
        <header class="optativa-detail-hero">
            <div class="optativa-badges">
                <span class="optativa-badge">${escapar(item.area || "Área no informada")}</span>
                ${item.modalidad ? `<span class="optativa-badge">${escapar(item.modalidad)}</span>` : ""}
            </div>
            <p class="eyebrow">Materia optativa / electiva</p>
            <h1>${escapar(item.materia || "Materia sin nombre")}</h1>
            <p class="optativa-detail-subtitle">${escapar(item.codigo || "Código no informado")}</p>
        </header>

        <div class="optativa-detail-layout">
            <div>
                ${seccionLista("Datos académicos", [
                    `<strong>Puntaje:</strong> ${item.puntaje != null ? `${item.puntaje} puntos` : "No informado"}`,
                    `<strong>Carga semanal:</strong> ${item.cargaHorariaSemanal != null ? `${item.cargaHorariaSemanal} h` : "No informada"}`,
                    `<strong>Correlativas:</strong> ${escapar(item.correlativas?.join(" · ") || "No informadas")}`,
                    `<strong>Años registrados:</strong> ${escapar(oferta.anios?.join(" · ") || "No informados")}`,
                    `<strong>Cuatrimestres:</strong> ${escapar(oferta.cuatrimestres?.join(" · ") || "No informados")}`,
                    `<strong>Horario:</strong> ${escapar(oferta.horario || "No informado")}`
                ])}
                ${item.comentarios ? seccionTexto("Comentarios", item.comentarios) : ""}
                ${item.contenidosMinimos ? seccionTexto("Contenidos mínimos", item.contenidosMinimos) : ""}
                ${oferta.observaciones ? seccionTexto("Antecedentes de cursada", oferta.observaciones) : ""}
                ${revisiones.length ? seccionLista("Datos pendientes de revisión", revisiones.map(escapar)) : ""}
            </div>

            <aside class="optativa-material-panel">
                <h2>Material disponible</h2>
                ${links.length
                    ? `<div class="optativa-detail-links">${links.map(link => `
                        <a class="btn btn-primary" href="${escapar(link.url)}" target="_blank" rel="noopener noreferrer">
                            ${escapar(link.nombre || "Abrir recurso")} ↗
                        </a>`).join("")}</div>`
                    : "<p>Todavía no hay enlaces cargados para esta materia.</p>"}
            </aside>
        </div>
    `;

    estadoCarga.hidden = true;
    errorDetalle.hidden = true;
    contenedor.hidden = false;
}

function mostrarError() {
    estadoCarga.hidden = true;
    contenedor.hidden = true;
    errorDetalle.hidden = false;
}

function seccionTexto(titulo, texto) {
    return `<section class="optativa-detail-section"><h2>${escapar(titulo)}</h2><p>${escapar(texto)}</p></section>`;
}

function seccionLista(titulo, items) {
    return `<section class="optativa-detail-section"><h2>${escapar(titulo)}</h2><ul class="optativa-detail-list">${items.map(item => `<li>${item}</li>`).join("")}</ul></section>`;
}

function enlacesValidos(item) {
    return Array.isArray(item.links) ? item.links.filter(link => link && link.url) : [];
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

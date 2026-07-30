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
                ${renderizarBadges(item)}
            </div>
            <p class="eyebrow">Materia optativa / electiva</p>
            <h1>${escapar(item.materia || "Materia sin nombre")}</h1>
            <p class="optativa-detail-subtitle">${escapar(item.codigo || "Código no informado")}</p>
        </header>

        <div class="optativa-detail-layout">
            <div>
                ${seccionLista("Datos académicos", [
                    `<strong>Puntaje:</strong> ${item.puntaje != null ? `${escapar(item.puntaje)} puntos` : "No informado"}`,
                    `<strong>Carga semanal:</strong> ${item.cargaHorariaSemanal != null ? `${escapar(item.cargaHorariaSemanal)} h` : "No informada"}`,
                    `<strong>Correlativas:</strong> ${escapar(normalizarArray(item.correlativas).join(" · ") || "No informadas")}`,
                    `<strong>Años registrados:</strong> ${escapar(normalizarArray(oferta.anios).join(" · ") || "No informados")}`,
                    `<strong>Cuatrimestres:</strong> ${escapar(normalizarArray(oferta.cuatrimestres).join(" · ") || "No informados")}`,
                    `<strong>Horario:</strong> ${escapar(oferta.horario || "No informado")}`
                ])}

                ${item.comentarios ? seccionTexto("Comentarios", item.comentarios) : ""}
                ${renderizarExperiencias(item.experiencias)}
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

function renderizarBadges(item) {
    const badges = [];

    normalizarArray(item.area).forEach((area) => {
        badges.push(`<span class="optativa-badge">${escapar(area)}</span>`);
    });

    if (item.modalidad) {
        badges.push(`<span class="optativa-badge">${escapar(item.modalidad)}</span>`);
    }

    if (item.puntaje != null) {
        badges.push(`<span class="optativa-badge">${escapar(item.puntaje)} puntos</span>`);
    }

    return badges.join("");
}

function renderizarExperiencias(experiencias) {
    if (!Array.isArray(experiencias) || experiencias.length === 0) {
        return "";
    }

    return `
        <section class="optativa-detail-section experiencias-section">
            <h2>💬 Experiencias de cursada</h2>
            <p class="empty-text">
                Comentarios orientativos recopilados de experiencias de estudiantes. Pueden variar según cuatrimestre, docentes, cupos y modalidad.
            </p>

            <div class="experiencias-lista">
                ${experiencias.map(renderizarExperiencia).join("")}
            </div>
        </section>
    `;
}

function renderizarExperiencia(exp) {
    const encabezado = [
        exp.anio ? String(exp.anio) : "",
        exp.cuatrimestre || "",
        exp.fuente || "Experiencia de estudiante"
    ].filter(Boolean).join(" · ");

    const datos = [];

    if (exp.dificultad) datos.push(`<li><strong>Dificultad:</strong> ${escapar(exp.dificultad)}</li>`);
    if (exp.carga) datos.push(`<li><strong>Carga:</strong> ${escapar(exp.carga)}</li>`);
    if (exp.asistencia) datos.push(`<li><strong>Asistencia:</strong> ${escapar(exp.asistencia)}</li>`);
    if (exp.evaluacion) datos.push(`<li><strong>Evaluación:</strong> ${escapar(exp.evaluacion)}</li>`);
    if (exp.final) datos.push(`<li><strong>Final:</strong> ${escapar(exp.final)}</li>`);
    if (exp.idioma) datos.push(`<li><strong>Idioma:</strong> ${escapar(exp.idioma)}</li>`);
    if (exp.conocimientosPrevios) datos.push(`<li><strong>Conocimientos previos:</strong> ${escapar(exp.conocimientosPrevios)}</li>`);

    let recomendacion = "";
    if (exp.recomendada === true) {
        recomendacion = `<p class="experiencia-recomendada">✅ Recomendada por estudiantes</p>`;
    } else if (exp.recomendada === false) {
        recomendacion = `<p class="experiencia-recomendada">⚠️ No recomendada / revisar antes de cursar</p>`;
    }

    return `
        <article class="experiencia-card">
            ${encabezado ? `<p class="eyebrow">${escapar(encabezado)}</p>` : ""}
            ${exp.resumen ? `<h3>${escapar(exp.resumen)}</h3>` : ""}
            ${datos.length ? `<ul class="optativa-detail-list">${datos.join("")}</ul>` : ""}
            ${exp.comentario ? `<p>${escapar(exp.comentario)}</p>` : ""}
            ${recomendacion}
        </article>
    `;
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

function normalizarArray(valor) {
    if (!valor) return [];

    if (Array.isArray(valor)) {
        return valor
            .filter(Boolean)
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    return [String(valor).trim()].filter(Boolean);
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
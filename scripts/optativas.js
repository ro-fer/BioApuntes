"use strict";

const DATA_URL = "../data/optativas.json";
const elementos = {
    grilla: document.querySelector("#grilla-optativas"), contador: document.querySelector("#contador"),
    carga: document.querySelector("#estado-carga"), error: document.querySelector("#error-carga"),
    sinResultados: document.querySelector("#sin-resultados"), busqueda: document.querySelector("#busqueda"),
    area: document.querySelector("#filtro-area"), modalidad: document.querySelector("#filtro-modalidad"),
    cursada: document.querySelector("#filtro-cursada"), ordenar: document.querySelector("#ordenar"),
    limpiar: document.querySelector("#limpiar-filtros"), modal: document.querySelector("#detalle-modal"),
    modalContenido: document.querySelector("#detalle-contenido"), modalCerrar: document.querySelector(".modal-close")
};
let optativas = [];

iniciar();

async function iniciar() {
    registrarEventos();
    try {
        const respuesta = await fetch(DATA_URL);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();
        if (!Array.isArray(datos)) throw new Error("El JSON debe contener un arreglo.");
        optativas = datos;
        completarFiltros(datos);
        renderizar();
    } catch (error) {
        console.error("No se pudieron cargar las optativas:", error);
        elementos.carga.hidden = true; elementos.error.hidden = false;
        elementos.contador.textContent = "No disponible";
    }
}

function registrarEventos() {
    [elementos.busqueda, elementos.area, elementos.modalidad, elementos.cursada, elementos.ordenar]
        .forEach(control => control?.addEventListener("input", renderizar));
    elementos.limpiar?.addEventListener("click", limpiarFiltros);
    document.querySelector('[data-action="limpiar"]')?.addEventListener("click", limpiarFiltros);
    elementos.grilla?.addEventListener("click", evento => {
        const boton = evento.target.closest("[data-detalle-id]");
        if (boton) abrirDetalle(boton.dataset.detalleId);
    });
    elementos.modalCerrar?.addEventListener("click", () => elementos.modal.close());
    elementos.modal?.addEventListener("click", evento => { if (evento.target === elementos.modal) elementos.modal.close(); });
}

function completarFiltros(datos) {
    llenarSelect(elementos.area, valoresUnicos(datos.map(item => item.area)));
    llenarSelect(elementos.modalidad, valoresUnicos(datos.map(item => item.modalidad)));
}
function valoresUnicos(valores) { return [...new Set(valores.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")); }
function llenarSelect(select, valores) {
    select.insertAdjacentHTML("beforeend", valores.map(v => `<option value="${escapar(v)}">${escapar(v)}</option>`).join(""));
}

function renderizar() {
    if (!optativas.length) return;
    const filtradas = obtenerFiltradas();
    elementos.carga.hidden = true; elementos.error.hidden = true;
    elementos.sinResultados.hidden = filtradas.length > 0; elementos.grilla.hidden = filtradas.length === 0;
    elementos.contador.textContent = `${filtradas.length} de ${optativas.length} ${filtradas.length === 1 ? "materia" : "materias"}`;
    elementos.grilla.innerHTML = filtradas.map(crearTarjeta).join("");
}

function obtenerFiltradas() {
    const termino = normalizar(elementos.busqueda.value);
    const resultado = optativas.filter(item => {
        const texto = normalizar([item.materia,item.codigo,item.area,item.modalidad,...(item.correlativas||[]),item.comentarios,item.oferta?.horario,item.oferta?.observaciones].filter(Boolean).join(" "));
        const filtroCursada = elementos.cursada.value;
        const coincideCursada = coincideFiltroCursada(item, filtroCursada);
        return (!termino || texto.includes(termino)) && (!elementos.area.value || item.area === elementos.area.value)
            && (!elementos.modalidad.value || item.modalidad === elementos.modalidad.value)
            && coincideCursada;
    });
    return [...resultado].sort((a,b) => {
        if (elementos.ordenar.value === "material") return Number(enlacesValidos(b).length>0)-Number(enlacesValidos(a).length>0) || a.materia.localeCompare(b.materia,"es");
        if (elementos.ordenar.value === "puntaje") return (b.puntaje ?? -1)-(a.puntaje ?? -1) || a.materia.localeCompare(b.materia,"es");
        return a.materia.localeCompare(b.materia,"es");
    });
}

function coincideFiltroCursada(item, filtro) {
    if (!filtro) return true;

    const oferta = item.oferta || {};
    const cuatrimestres = Array.isArray(oferta.cuatrimestres) ? oferta.cuatrimestres : [];
    const cuatrimestresNormalizados = cuatrimestres.map(normalizar);
    const tieneInformacion = cuatrimestres.length > 0
        || Boolean(oferta.horario?.trim())
        || Boolean(oferta.observaciones?.trim())
        || (Array.isArray(oferta.anios) && oferta.anios.length > 0);

    if (filtro === "con-info") return tieneInformacion;
    if (filtro === "sin-info") return !tieneInformacion;
    if (filtro === "primero") return cuatrimestresNormalizados.some(valor => valor.includes("1°") || valor.includes("1o") || valor.includes("primer"));
    if (filtro === "segundo") return cuatrimestresNormalizados.some(valor => valor.includes("2°") || valor.includes("2o") || valor.includes("segundo"));

    return true;
}

function crearTarjeta(item) {
    const links = enlacesValidos(item), tieneMaterial = links.length > 0;
    const oferta = item.oferta || {};
    const revision = item.revisionPendiente?.length ? `<p class="optativa-review">🛠️ ${item.revisionPendiente.length} dato${item.revisionPendiente.length>1?"s":""} pendiente${item.revisionPendiente.length>1?"s":""} de revisión.</p>` : "";
    return `<article class="materia-card card optativa-card">
        <div>
            <div class="materia-card-header">
                <div class="optativa-badges"><span class="optativa-badge">${escapar(item.area || "Área no informada")}</span><span class="optativa-badge ${tieneMaterial?"material":"sin-material"}">${tieneMaterial?`✓ ${links.length} recurso${links.length>1?"s":""}`:"Sin material cargado"}</span></div>
                <h2>${escapar(item.materia || "Materia sin nombre")}</h2>
                <p class="materia-area">${escapar(item.codigo || "Código no informado")}</p>
            </div>
            <div class="materia-card-info">
                <p><strong>Modalidad:</strong> ${escapar(item.modalidad || "No informada")}</p>
                <p><strong>Cuatrimestre:</strong> ${escapar(oferta.cuatrimestres?.join(" · ") || "No informado")}</p>
                <p><strong>Horario:</strong> ${escapar(oferta.horario || oferta.observaciones || "No informado")}</p>
                <p><strong>Correlativas:</strong> ${escapar(item.correlativas?.join(" · ") || "No informadas")}</p>
                <p><strong>Puntaje:</strong> ${item.puntaje != null ? `${item.puntaje} puntos` : "No informado"}</p>
            </div>${revision}
        </div>
        <div class="card-buttons">
            <button class="btn btn-secondary" type="button" data-detalle-id="${escapar(item.id)}">Ver detalle</button>
            ${tieneMaterial ? `<a class="btn btn-primary" href="${escapar(links[0].url)}" target="_blank" rel="noopener noreferrer">Abrir material</a>` : ""}
        </div>
    </article>`;
}

function abrirDetalle(id) {
    const item = optativas.find(x => x.id === id); if (!item) return;
    const oferta=item.oferta||{}, links=enlacesValidos(item), revisiones=item.revisionPendiente||[];
    elementos.modalContenido.innerHTML = `<article class="optativa-detail">
        <div class="optativa-badges"><span class="optativa-badge">${escapar(item.area||"Área no informada")}</span>${item.modalidad?`<span class="optativa-badge">${escapar(item.modalidad)}</span>`:""}</div>
        <h2>${escapar(item.materia)}</h2><p class="optativa-detail-subtitle">${escapar(item.codigo||"Código no informado")}</p>
        ${seccionLista("Datos académicos",[
            `<strong>Puntaje:</strong> ${item.puntaje != null ? item.puntaje+" puntos" : "No informado"}`,
            `<strong>Carga semanal:</strong> ${item.cargaHorariaSemanal != null ? item.cargaHorariaSemanal+" h" : "No informada"}`,
            `<strong>Correlativas:</strong> ${escapar(item.correlativas?.join(" · ")||"No informadas")}`,
            `<strong>Años registrados:</strong> ${escapar(oferta.anios?.join(" · ")||"No informados")}`,
            `<strong>Cuatrimestres:</strong> ${escapar(oferta.cuatrimestres?.join(" · ")||"No informados")}`,
            `<strong>Horario:</strong> ${escapar(oferta.horario||"No informado")}`
        ])}
        ${item.comentarios?seccionTexto("Comentarios",item.comentarios):""}
        ${item.contenidosMinimos?seccionTexto("Contenidos mínimos",item.contenidosMinimos):""}
        ${oferta.observaciones?seccionTexto("Antecedentes de cursada",oferta.observaciones):""}
        <section class="optativa-detail-section"><h3>Material disponible</h3>${links.length?`<div class="optativa-detail-links">${links.map(l=>`<a class="btn btn-primary" href="${escapar(l.url)}" target="_blank" rel="noopener noreferrer">${escapar(l.nombre||"Abrir recurso")} ↗</a>`).join("")}</div>`:"<p>Todavía no hay enlaces cargados para esta materia.</p>"}</section>
        ${revisiones.length?seccionLista("Datos pendientes de revisión",revisiones.map(escapar)):""}
    </article>`;
    elementos.modal.showModal();
}
function seccionTexto(titulo,texto){return `<section class="optativa-detail-section"><h3>${escapar(titulo)}</h3><p>${escapar(texto)}</p></section>`;}
function seccionLista(titulo,items){return `<section class="optativa-detail-section"><h3>${escapar(titulo)}</h3><ul class="optativa-detail-list">${items.map(x=>`<li>${x}</li>`).join("")}</ul></section>`;}
function enlacesValidos(item){return Array.isArray(item.links)?item.links.filter(l=>l&&l.url):[];}
function limpiarFiltros(){elementos.busqueda.value="";elementos.area.value="";elementos.modalidad.value="";elementos.cursada.value="";elementos.ordenar.value="nombre";renderizar();elementos.busqueda.focus();}
function normalizar(v=""){return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").trim();}
function escapar(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"})[c]);}

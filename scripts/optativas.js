'use strict';

const DATA_URL = '../data/optativas.json';

const elementos = {
  grilla: document.querySelector('#grilla-optativas'),
  contador: document.querySelector('#contador'),
  carga: document.querySelector('#estado-carga'),
  error: document.querySelector('#error-carga'),
  sinResultados: document.querySelector('#sin-resultados'),
  busqueda: document.querySelector('#busqueda'),
  area: document.querySelector('#filtro-area'),
  modalidad: document.querySelector('#filtro-modalidad'),
  material: document.querySelector('#filtro-material'),
  ordenar: document.querySelector('#ordenar'),
  limpiar: document.querySelector('#limpiar-filtros'),
  modal: document.querySelector('#detalle-modal'),
  modalContenido: document.querySelector('#detalle-contenido'),
  modalCerrar: document.querySelector('.modal-close')
};

let optativas = [];

iniciar();

async function iniciar() {
  registrarEventos();

  try {
    const respuesta = await fetch(DATA_URL);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

    const datos = await respuesta.json();
    if (!Array.isArray(datos)) throw new Error('El JSON debe contener un arreglo.');

    optativas = datos;
    completarFiltros(optativas);
    renderizar();
  } catch (error) {
    console.error('No se pudieron cargar las optativas:', error);
    elementos.carga.hidden = true;
    elementos.error.hidden = false;
    elementos.contador.textContent = 'No disponible';
  }
}

function registrarEventos() {
  [elementos.busqueda, elementos.area, elementos.modalidad, elementos.material, elementos.ordenar]
    .forEach(control => control.addEventListener('input', renderizar));

  elementos.limpiar.addEventListener('click', limpiarFiltros);
  document.querySelector('[data-action="limpiar"]')?.addEventListener('click', limpiarFiltros);

  elementos.grilla.addEventListener('click', evento => {
    const boton = evento.target.closest('[data-detalle-id]');
    if (!boton) return;
    abrirDetalle(boton.dataset.detalleId);
  });

  elementos.modalCerrar.addEventListener('click', () => elementos.modal.close());
  elementos.modal.addEventListener('click', evento => {
    if (evento.target === elementos.modal) elementos.modal.close();
  });
}

function completarFiltros(datos) {
  llenarSelect(elementos.area, valoresUnicos(datos.map(item => item.area)));
  llenarSelect(elementos.modalidad, valoresUnicos(datos.map(item => item.modalidad)));
}

function valoresUnicos(valores) {
  return [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}

function llenarSelect(select, valores) {
  const opciones = valores.map(valor => `<option value="${escaparAtributo(valor)}">${escaparHTML(valor)}</option>`).join('');
  select.insertAdjacentHTML('beforeend', opciones);
}

function renderizar() {
  if (!optativas.length) return;

  const filtradas = obtenerFiltradas();
  elementos.carga.hidden = true;
  elementos.error.hidden = true;
  elementos.sinResultados.hidden = filtradas.length > 0;
  elementos.grilla.hidden = filtradas.length === 0;
  elementos.contador.textContent = `${filtradas.length} de ${optativas.length} ${filtradas.length === 1 ? 'materia' : 'materias'}`;
  elementos.grilla.innerHTML = filtradas.map(crearTarjeta).join('');
}

function obtenerFiltradas() {
  const termino = normalizar(elementos.busqueda.value);
  const area = elementos.area.value;
  const modalidad = elementos.modalidad.value;
  const material = elementos.material.value;

  const resultado = optativas.filter(item => {
    const textoBuscable = normalizar([
      item.materia,
      item.codigo,
      item.area,
      item.modalidad,
      ...(item.correlativas || []),
      item.comentarios,
      item.oferta?.horario,
      item.oferta?.observaciones
    ].filter(Boolean).join(' '));

    const coincideBusqueda = !termino || textoBuscable.includes(termino);
    const coincideArea = !area || item.area === area;
    const coincideModalidad = !modalidad || item.modalidad === modalidad;
    const tieneMaterial = Array.isArray(item.links) && item.links.length > 0;
    const coincideMaterial = !material || (material === 'con' ? tieneMaterial : !tieneMaterial);

    return coincideBusqueda && coincideArea && coincideModalidad && coincideMaterial;
  });

  return ordenarMaterias(resultado, elementos.ordenar.value);
}

function ordenarMaterias(datos, criterio) {
  return [...datos].sort((a, b) => {
    if (criterio === 'material') {
      const diferencia = Number((b.links || []).length > 0) - Number((a.links || []).length > 0);
      return diferencia || a.materia.localeCompare(b.materia, 'es');
    }
    if (criterio === 'puntaje') {
      return (b.puntaje ?? -1) - (a.puntaje ?? -1) || a.materia.localeCompare(b.materia, 'es');
    }
    return a.materia.localeCompare(b.materia, 'es');
  });
}

function crearTarjeta(item) {
  const links = item.links || [];
  const tieneMaterial = links.length > 0;
  const primerLink = links[0];
  const cuatrimestres = item.oferta?.cuatrimestres?.join(' · ') || 'No informado';
  const horario = item.oferta?.horario || item.oferta?.observaciones || 'No informado';
  const correlativas = item.correlativas?.length ? item.correlativas.join(' · ') : 'No informadas';
  const revision = item.revisionPendiente?.length
    ? `<p class="review-note">🛠️ Hay ${item.revisionPendiente.length} dato${item.revisionPendiente.length > 1 ? 's' : ''} pendiente${item.revisionPendiente.length > 1 ? 's' : ''} de revisión.</p>`
    : '';

  return `
    <article class="subject-card">
      <div class="card-top">
        <div class="card-badges">
          <span class="badge">${escaparHTML(item.area || 'Área no informada')}</span>
          <span class="badge ${tieneMaterial ? 'badge-material' : 'badge-empty'}">
            ${tieneMaterial ? `✓ ${links.length} recurso${links.length > 1 ? 's' : ''}` : 'Sin material cargado'}
          </span>
        </div>
        <h3 class="card-title">${escaparHTML(item.materia)}</h3>
        <p class="card-code">${escaparHTML(item.codigo || 'Código no informado')}</p>
      </div>

      <dl class="card-data">
        ${filaDato('🗓️', 'Oferta', cuatrimestres)}
        ${filaDato('🕒', 'Horario', horario)}
        ${filaDato('📌', 'Correlativas', correlativas)}
        ${filaDato('⭐', 'Puntaje', item.puntaje != null ? `${item.puntaje} puntos` : 'No informado')}
      </dl>

      ${revision}

      <div class="card-actions">
        <button class="button button-secondary" type="button" data-detalle-id="${escaparAtributo(item.id)}">Ver detalle</button>
        ${tieneMaterial
          ? `<a class="button button-primary link-button" href="${escaparAtributo(primerLink.url)}" target="_blank" rel="noopener noreferrer">Abrir material ↗</a>`
          : ''}
      </div>
    </article>`;
}

function filaDato(icono, etiqueta, valor) {
  return `
    <div class="data-row">
      <dt aria-hidden="true">${icono}</dt>
      <dd><span class="data-label">${etiqueta}</span>${escaparHTML(String(valor))}</dd>
    </div>`;
}

function abrirDetalle(id) {
  const item = optativas.find(optativa => optativa.id === id);
  if (!item) return;

  const links = item.links || [];
  const revisiones = item.revisionPendiente || [];
  const oferta = item.oferta || {};

  elementos.modalContenido.innerHTML = `
    <article class="detail-content">
      <div class="card-badges">
        <span class="badge">${escaparHTML(item.area || 'Área no informada')}</span>
        ${item.modalidad ? `<span class="badge">${escaparHTML(item.modalidad)}</span>` : ''}
      </div>
      <h2>${escaparHTML(item.materia)}</h2>
      <p class="detail-subtitle">${escaparHTML(item.codigo || 'Código no informado')}</p>

      <section class="detail-section">
        <h3>Datos académicos</h3>
        <ul class="detail-list">
          <li><strong>Puntaje:</strong> ${item.puntaje != null ? `${item.puntaje} puntos` : 'No informado'}</li>
          <li><strong>Carga semanal:</strong> ${item.cargaHorariaSemanal != null ? `${item.cargaHorariaSemanal} h` : 'No informada'}</li>
          <li><strong>Correlativas:</strong> ${escaparHTML(item.correlativas?.join(' · ') || 'No informadas')}</li>
          <li><strong>Años registrados:</strong> ${escaparHTML(oferta.anios?.join(' · ') || 'No informados')}</li>
          <li><strong>Cuatrimestres:</strong> ${escaparHTML(oferta.cuatrimestres?.join(' · ') || 'No informados')}</li>
          <li><strong>Horario:</strong> ${escaparHTML(oferta.horario || 'No informado')}</li>
        </ul>
      </section>

      ${item.comentarios ? seccionTexto('Comentarios', item.comentarios) : ''}
      ${item.contenidosMinimos ? seccionTexto('Contenidos mínimos', item.contenidosMinimos) : ''}
      ${oferta.observaciones ? seccionTexto('Antecedentes de cursada', oferta.observaciones) : ''}

      <section class="detail-section">
        <h3>Material disponible</h3>
        ${links.length
          ? `<div class="detail-links">${links.map(link => `<a class="button button-primary link-button" href="${escaparAtributo(link.url)}" target="_blank" rel="noopener noreferrer">${escaparHTML(link.nombre)} ↗</a>`).join('')}</div>`
          : '<p>Todavía no hay enlaces cargados para esta materia.</p>'}
      </section>

      ${revisiones.length ? `
        <section class="detail-section">
          <h3>Datos pendientes de revisión</h3>
          <ul class="detail-list">${revisiones.map(texto => `<li>${escaparHTML(texto)}</li>`).join('')}</ul>
        </section>` : ''}
    </article>`;

  elementos.modal.showModal();
}

function seccionTexto(titulo, texto) {
  return `<section class="detail-section"><h3>${escaparHTML(titulo)}</h3><p>${escaparHTML(texto)}</p></section>`;
}

function limpiarFiltros() {
  elementos.busqueda.value = '';
  elementos.area.value = '';
  elementos.modalidad.value = '';
  elementos.material.value = '';
  elementos.ordenar.value = 'nombre';
  renderizar();
  elementos.busqueda.focus();
}

function normalizar(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

function escaparHTML(valor = '') {
  return String(valor).replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[caracter]);
}

function escaparAtributo(valor = '') {
  return escaparHTML(valor);
}

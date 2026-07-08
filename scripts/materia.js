const DATA_PATH = "../data/materias.json";

const materiaTitulo = document.getElementById("materiaTitulo");
const materiaDescripcion = document.getElementById("materiaDescripcion");
const materiaResumen = document.getElementById("materiaResumen");
const queHayLista = document.getElementById("queHayLista");
const linksContainer = document.getElementById("linksContainer");
const comentariosMateria = document.getElementById("comentariosMateria");
const datosMateria = document.getElementById("datosMateria");
const materiaNoEncontrada = document.getElementById("materiaNoEncontrada");
const driveEmbedSection = document.getElementById("driveEmbedSection");
const driveEmbedContainer = document.getElementById("driveEmbedContainer");

document.addEventListener("DOMContentLoaded", cargarMateria);

async function cargarMateria() {
  try {
    const params = new URLSearchParams(window.location.search);
    const idMateria = params.get("id");

    if (!idMateria) {
      mostrarError();
      return;
    }

    const response = await fetch(DATA_PATH);

    if (!response.ok) {
      throw new Error("No se pudo cargar materias.json");
    }

    const materias = await response.json();

    const materia = materias.find(item => {
      const id = item.id || generarId(item.materia || "");
      return id === idMateria;
    });

    if (!materia) {
      mostrarError();
      return;
    }

    renderMateria(materia);

  } catch (error) {
    console.error(error);
    mostrarError();
  }
}

function renderMateria(materia) {
  document.title = `${materia.materia} | BioApuntes UNSAM`;

  materiaTitulo.textContent = materia.materia || "Materia sin nombre";

  materiaDescripcion.textContent =
    materia.descripcion ||
    "Información, links y material disponible para esta materia.";

  materiaResumen.innerHTML = `
    <div>
      <p class="eyebrow">${escaparHTML(materia.area || "Ingeniería Biomédica UNSAM")}</p>
      <h2>${escaparHTML(materia.estado || "🟡 Revisar")}</h2>
      <p>
        ${escaparHTML(materia.materia || "")}
        ${materia.codigo ? ` · Código ${escaparHTML(materia.codigo)}` : ""}
      </p>
    </div>
  `;

  renderQueHay(materia);
  renderLinks(materia);
  renderComentarios(materia);
  renderDatos(materia);

  // Solo intenta embeber Google Drive.
  // OneDrive queda como botón porque SharePoint suele bloquear iframes.
  renderEmbedDrive(materia);
}

function renderQueHay(materia) {
  queHayLista.innerHTML = "";

  const items = materia.queHay || [];

  if (items.length === 0) {
    queHayLista.innerHTML = `<li>Sin información cargada todavía.</li>`;
    return;
  }

  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    queHayLista.appendChild(li);
  });
}

function renderLinks(materia) {
  linksContainer.innerHTML = "";

  const links = materia.links || [];

  if (links.length === 0) {
    linksContainer.innerHTML = `
      <article class="link-card">
        <h3>🔴 Sin links cargados</h3>
        <p>Todavía no hay un link específico para esta materia.</p>
      </article>
    `;
    return;
  }

  links.forEach(link => {
    const card = document.createElement("article");
    card.className = "link-card";

    const icono = obtenerIconoLink(link.tipo || link.nombre || "");

    card.innerHTML = `
      <h3>${icono} ${escaparHTML(link.nombre || "Abrir link")}</h3>
      <p>${escaparHTML(link.descripcion || "Recurso externo asociado a la materia.")}</p>
      <a href="${escaparAtributo(link.url)}" target="_blank" class="btn btn-primary">
        Abrir
      </a>
    `;

    linksContainer.appendChild(card);
  });
}

function renderComentarios(materia) {
  comentariosMateria.textContent =
    materia.comentarios ||
    "No hay comentarios cargados para esta materia.";
}

function renderDatos(materia) {
  const correlativas = Array.isArray(materia.correlativas)
    ? materia.correlativas.join(", ")
    : materia.correlativas || "Sin correlativas cargadas";

  datosMateria.innerHTML = `
    <p><strong>Código:</strong> ${escaparHTML(materia.codigo || "Sin dato")}</p>
    <p><strong>Año:</strong> ${escaparHTML(materia.anio || "Sin dato")}°</p>
    <p><strong>Cuatrimestre:</strong> ${escaparHTML(materia.cuatrimestre || "Sin dato")}°</p>
    <p><strong>Área:</strong> ${escaparHTML(materia.area || "Sin dato")}</p>
    <p><strong>Correlativas:</strong> ${escaparHTML(correlativas)}</p>
  `;
}

function renderEmbedDrive(materia) {
  const links = materia.links || [];

  const drive = links.find(link => {
    const tipo = normalizarTexto(link.tipo || "");
    const url = link.url || "";

    return (
      tipo.includes("drive") &&
      !tipo.includes("onedrive") &&
      url.includes("drive.google.com")
    );
  });

  if (!drive || !drive.url) {
    return;
  }

  const folderId = obtenerGoogleDriveFolderId(drive.url);

  if (!folderId) {
    return;
  }

  driveEmbedSection.classList.remove("hidden");

  driveEmbedContainer.innerHTML = `
    <iframe 
      src="https://drive.google.com/embeddedfolderview?id=${folderId}#list"
      width="100%" 
      height="520" 
      frameborder="0">
    </iframe>
  `;
}

function mostrarError() {
  materiaTitulo.textContent = "Materia no encontrada";
  materiaDescripcion.textContent = "No pudimos cargar la información de esta materia.";
  materiaNoEncontrada.classList.remove("hidden");
}

function obtenerIconoLink(tipo) {
  const texto = normalizarTexto(tipo);

  if (texto.includes("whatsapp")) return "📱";
  if (texto.includes("frubox")) return "📦";
  if (texto.includes("onedrive")) return "☁️";
  if (texto.includes("sharepoint")) return "☁️";
  if (texto.includes("drive")) return "☁️";
  if (texto.includes("github")) return "🐙";
  if (texto.includes("form")) return "📝";

  return "🔗";
}

function obtenerGoogleDriveFolderId(url) {
  const matchFolders = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolders) return matchFolders[1];

  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];

  return null;
}

function generarId(texto) {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizarTexto(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escaparAtributo(texto) {
  return escaparHTML(texto);
}
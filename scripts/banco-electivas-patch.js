/**
 * Fragmento para integrar en scripts/banco.js.
 * Reemplazá la construcción actual del enlace a materia por esta función.
 */
function obtenerLinkMateria(materia) {
  const nombre = String(materia.materia || materia.nombre || '').toLocaleLowerCase('es');
  const codigo = String(materia.codigo || '').toLocaleUpperCase('es');

  const esEspacioElectivo =
    nombre.includes('electiva') ||
    nombre.includes('optativa') ||
    codigo === 'ELECTIVA-I' ||
    codigo === 'ELECTIVA-II';

  return esEspacioElectivo
    ? './optativas.html'
    : `./materia.html?codigo=${encodeURIComponent(materia.codigo)}`;
}

// Ejemplo dentro del render de cada tarjeta:
// const linkMateria = obtenerLinkMateria(materia);
// boton.href = linkMateria;

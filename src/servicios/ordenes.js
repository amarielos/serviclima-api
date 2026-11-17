import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Los datos se cargan una vez; los cambios viven en memoria hasta reiniciar.
const rutaDatos = path.join(import.meta.dirname, '..', '..', 'datos', 'db.json');
const contenido = await readFile(rutaDatos, 'utf8');
const { ordenes } = JSON.parse(contenido);

function generarCodigo(id) {
  return 'OS-2026-' + String(id).padStart(3, '0');
}

export function listar() {
  return ordenes;
}

export function buscarPorId(id) {
  return ordenes.find((orden) => orden.id === id);
}

export function crear(datos) {
  const id = Math.max(0, ...ordenes.map((orden) => orden.id)) + 1;
  const nueva = { ...datos, id, codigo: generarCodigo(id) };
  ordenes.push(nueva);
  return nueva;
}

export function reemplazar(id, datos) {
  const posicion = ordenes.findIndex((orden) => orden.id === id);
  if (posicion === -1) return undefined;

  const actual = ordenes[posicion];
  ordenes[posicion] = { ...datos, id: actual.id, codigo: actual.codigo };
  return ordenes[posicion];
}

export function actualizar(id, cambios) {
  const posicion = ordenes.findIndex((orden) => orden.id === id);
  if (posicion === -1) return undefined;

  const actual = ordenes[posicion];
  ordenes[posicion] = {
    ...actual,
    ...cambios,
    id: actual.id,
    codigo: actual.codigo,
  };
  return ordenes[posicion];
}

export function eliminar(id) {
  const posicion = ordenes.findIndex((orden) => orden.id === id);
  if (posicion === -1) return false;

  ordenes.splice(posicion, 1);
  return true;
}

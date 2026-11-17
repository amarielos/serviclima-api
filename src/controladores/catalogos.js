import { DEPARTAMENTOS, CATEGORIAS } from '../catalogos.js';

export function listarDepartamentos(req, res) {
  res.json(DEPARTAMENTOS);
}

export function listarCategorias(req, res) {
  res.json(CATEGORIAS);
}

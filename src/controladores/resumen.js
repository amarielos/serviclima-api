import * as servicio from '../servicios/ordenes.js';

export function obtenerResumen(req, res) {
  res.json(servicio.resumen());
}

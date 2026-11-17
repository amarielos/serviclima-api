import * as servicio from '../servicios/ordenes.js';
import { ErrorHttp } from '../errores.js';

function noExiste(id) {
  return new ErrorHttp(404, `No existe la orden ${id}`);
}

export function listarOrdenes(req, res) {
  res.json(servicio.listar());
}

export function obtenerOrden(req, res) {
  const orden = servicio.buscarPorId(Number(req.params.id));
  if (!orden) throw noExiste(req.params.id);
  res.json(orden);
}

export function crearOrden(req, res) {
  const nueva = servicio.crear(req.body);
  res.status(201).json(nueva);
}

export function reemplazarOrden(req, res) {
  const orden = servicio.reemplazar(Number(req.params.id), req.body);
  if (!orden) throw noExiste(req.params.id);
  res.json(orden);
}

export function actualizarOrden(req, res) {
  const orden = servicio.actualizar(Number(req.params.id), req.body);
  if (!orden) throw noExiste(req.params.id);
  res.json(orden);
}

export function eliminarOrden(req, res) {
  const eliminada = servicio.eliminar(Number(req.params.id));
  if (!eliminada) throw noExiste(req.params.id);
  // El frontend interpreta JSON también después de eliminar.
  res.json({});
}

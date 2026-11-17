import { validarOrden } from '../validaciones/ordenes.js';
import { ErrorHttp } from '../errores.js';

export function validarOrdenCompleta(req, res, next) {
  const { limpios, detalles } = validarOrden(req.body ?? {});
  if (detalles.length > 0) {
    throw new ErrorHttp(400, 'La orden tiene datos inválidos', detalles);
  }
  req.body = limpios;
  next();
}

export function validarOrdenParcial(req, res, next) {
  const { limpios, detalles } = validarOrden(req.body ?? {}, { parcial: true });
  if (detalles.length > 0) {
    throw new ErrorHttp(400, 'La orden tiene datos inválidos', detalles);
  }
  req.body = limpios;
  next();
}

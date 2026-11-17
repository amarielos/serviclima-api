import { ErrorHttp } from '../errores.js';

export function noEncontrado(req, res, next) {
  throw new ErrorHttp(404, `No existe la ruta ${req.method} ${req.originalUrl}`);
}

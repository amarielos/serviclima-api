import { ErrorHttp } from '../errores.js';

// Express reconoce el manejador de errores por sus cuatro parámetros.
export function manejarErrores(error, req, res, next) {
  if (error instanceof ErrorHttp) {
    return res.status(error.estado).json({
      error: error.message,
      detalles: error.detalles,
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'El cuerpo no es un JSON válido',
      detalles: [],
    });
  }

  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor', detalles: [] });
}

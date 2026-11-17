import { Router } from 'express';
import {
  listarOrdenes,
  obtenerOrden,
  crearOrden,
  reemplazarOrden,
  actualizarOrden,
  eliminarOrden,
} from '../controladores/ordenes.js';
import { validarOrdenCompleta, validarOrdenParcial } from '../middlewares/validar-orden.js';

const router = Router();

router.get('/', listarOrdenes);
router.get('/:id', obtenerOrden);
router.post('/', validarOrdenCompleta, crearOrden);
router.put('/:id', validarOrdenCompleta, reemplazarOrden);
router.patch('/:id', validarOrdenParcial, actualizarOrden);
router.delete('/:id', eliminarOrden);

export default router;

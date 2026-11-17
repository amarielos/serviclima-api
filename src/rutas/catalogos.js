import { Router } from 'express';
import { listarDepartamentos, listarCategorias } from '../controladores/catalogos.js';

const router = Router();
router.get('/departamentos', listarDepartamentos);
router.get('/categorias', listarCategorias);

export default router;

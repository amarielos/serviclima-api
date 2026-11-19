import { Router } from 'express';
import { obtenerResumen } from '../controladores/resumen.js';

const router = Router();
router.get('/resumen', obtenerResumen);

export default router;

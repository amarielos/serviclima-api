import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rutasOrdenes from './src/rutas/ordenes.js';
import rutasCatalogos from './src/rutas/catalogos.js';
import rutasResumen from './src/rutas/resumen.js';
import { registrarPeticion } from './src/middlewares/registrar-peticion.js';
import { limitarPeticiones } from './src/middlewares/limitar-peticiones.js';
import { noEncontrado } from './src/middlewares/no-encontrado.js';
import { manejarErrores } from './src/middlewares/manejar-errores.js';

// Render proporciona PORT; en local se conserva PUERTO del archivo .env.
const PUERTO = Number(process.env.PORT ?? process.env.PUERTO);
const app = express();

app.set('trust proxy', 1);

app.use(registrarPeticion);
app.use(helmet());
app.use(cors({
  origin: process.env.ORIGEN_FRONTEND,
  // Se conserva el contrato del preflight de las sesiones anteriores.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(limitarPeticiones);
app.use(express.json());
app.use('/ordenes', rutasOrdenes);
app.use(rutasCatalogos);
app.use(rutasResumen);

// Después de todas las rutas: primero el 404 y al final los errores.
app.use(noEncontrado);
app.use(manejarErrores);

const servidor = app.listen(PUERTO, () => {
  console.log(`API de Serviclima en http://localhost:${servidor.address().port}`);
  console.log(`Origen permitido: ${process.env.ORIGEN_FRONTEND}`);
});

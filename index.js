import express from 'express';
import rutasOrdenes from './src/rutas/ordenes.js';
import rutasCatalogos from './src/rutas/catalogos.js';
import { registrarPeticion } from './src/middlewares/registrar-peticion.js';
import { permitirOrigen } from './src/middlewares/permitir-origen.js';
import { noEncontrado } from './src/middlewares/no-encontrado.js';
import { manejarErrores } from './src/middlewares/manejar-errores.js';

const PUERTO = Number(process.env.PUERTO);
const app = express();

app.use(registrarPeticion);
app.use(permitirOrigen);
app.use(express.json());
app.use('/ordenes', rutasOrdenes);
app.use(rutasCatalogos);

// Después de todas las rutas: primero el 404 y al final los errores.
app.use(noEncontrado);
app.use(manejarErrores);

const servidor = app.listen(PUERTO, () => {
  console.log(`API de Serviclima en http://localhost:${servidor.address().port}`);
  console.log(`Origen permitido: ${process.env.ORIGEN_FRONTEND}`);
});

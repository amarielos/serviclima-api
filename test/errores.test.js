import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { manejarErrores } from '../src/middlewares/manejar-errores.js';

test('Los errores internos síncronos y asíncronos responden JSON sin exponer la traza', async (t) => {
  // Rutas exclusivas del test: la API entregable no expone fallos a propósito.
  const app = express();
  const falloSincrono = new Error('Información interna de prueba');
  const falloAsincrono = new Error('Información del almacenamiento');
  app.get('/sincrono', () => { throw falloSincrono; });
  app.get('/asincrono', async () => { throw falloAsincrono; });
  app.use(manejarErrores);

  const registro = t.mock.method(console, 'error', () => {});
  const servidor = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    servidor.close((error) => error ? reject(error) : resolve());
  }));
  await once(servidor, 'listening');

  for (const ruta of ['/sincrono', '/asincrono']) {
    const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}${ruta}`);
    assert.equal(respuesta.status, 500);
    assert.match(respuesta.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await respuesta.json(), { error: 'Error interno del servidor', detalles: [] });
  }
  assert.deepEqual(registro.mock.calls.map((llamada) => llamada.arguments[0]), [falloSincrono, falloAsincrono]);
});

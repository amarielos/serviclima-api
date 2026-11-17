import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const raiz = path.join(import.meta.dirname, '..');
const origen = 'http://localhost:5173';

async function detener(proceso) {
  if (proceso.exitCode !== null || proceso.signalCode !== null) return;
  const terminado = once(proceso, 'exit');
  proceso.kill();
  await terminado;
}

async function iniciar(t) {
  const proceso = spawn(process.execPath, ['index.js'], {
    cwd: raiz,
    env: { ...process.env, PUERTO: '0', ORIGEN_FRONTEND: origen },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => detener(proceso));

  const base = await new Promise((resolve, reject) => {
    let salida = '';
    const espera = setTimeout(() => reject(new Error(`La API no inició: ${salida}`)), 10000);
    proceso.once('error', (error) => {
      clearTimeout(espera);
      reject(error);
    });
    proceso.once('exit', (codigo) => {
      clearTimeout(espera);
      reject(new Error(`La API terminó con código ${codigo}: ${salida}`));
    });
    proceso.stderr.on('data', (datos) => { salida += datos; });
    proceso.stdout.on('data', (datos) => {
      salida += datos;
      const direccion = salida.match(/API de Serviclima en (http:\/\/localhost:\d+)/);
      if (direccion) {
        clearTimeout(espera);
        resolve(direccion[1]);
      }
    });
  });

  return { proceso, base };
}

test('Contrato HTTP de órdenes y datos en memoria', { timeout: 30000 }, async (t) => {
  const rutaDatos = path.join(raiz, 'datos', 'db.json');
  const contenidoOriginal = await readFile(rutaDatos, 'utf8');
  const { ordenes } = JSON.parse(contenidoOriginal);
  let api = await iniciar(t);

  async function pedir(ruta, metodo = 'GET', datos) {
    const respuesta = await fetch(api.base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Origin: origen },
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
    return { estado: respuesta.status, datos: await respuesta.json(), cabeceras: respuesta.headers };
  }

  await t.test('Listado original, conteos, detalle y errores GET', async () => {
    const lista = await pedir('/ordenes');
    assert.equal(lista.estado, 200);
    assert.deepEqual(lista.datos, ordenes);
    assert.equal(lista.datos.length, 24);
    const conteos = {};
    for (const orden of lista.datos) conteos[orden.estado] = (conteos[orden.estado] ?? 0) + 1;
    assert.deepEqual(conteos, { completada: 11, 'en proceso': 4, pendiente: 7, cancelada: 2 });
    const detalle = await pedir('/ordenes/8');
    assert.equal(detalle.estado, 200);
    assert.deepEqual(detalle.datos, ordenes.find((orden) => orden.id === 8));
    for (const id of ['999', 'abc']) {
      const respuesta = await pedir(`/ordenes/${id}`);
      assert.equal(respuesta.estado, 404);
      assert.deepEqual(respuesta.datos, { error: `No existe la orden ${id}`, detalles: [] });
    }
  });

  await t.test('CORS en respuestas y preflight sin cuerpo', async () => {
    const lista = await pedir('/ordenes');
    assert.equal(lista.cabeceras.get('access-control-allow-origin'), origen);
    const respuesta = await fetch(api.base + '/ordenes', {
      method: 'OPTIONS',
      headers: {
        Origin: origen,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    assert.equal(respuesta.status, 204);
    assert.equal(await respuesta.text(), '');
    assert.equal(respuesta.headers.get('access-control-allow-origin'), origen);
    assert.equal(respuesta.headers.get('access-control-allow-methods'), 'GET, POST, PUT, PATCH, DELETE');
    assert.equal(respuesta.headers.get('access-control-allow-headers'), 'Content-Type');
  });

  await t.test('Crear, combinar, reemplazar y eliminar conservando ID y código', async () => {
    const { id: anterior, codigo: previo, ...datos } = ordenes[0];
    const creada = await pedir('/ordenes', 'POST', {
      ...datos, cliente: 'Ferretería El Progreso', observacion: 'Temporal', id: 900, codigo: 'CLIENTE',
    });
    assert.equal(creada.estado, 201);
    assert.equal(creada.datos.id, 25);
    assert.equal(creada.datos.codigo, 'OS-2026-025');
    assert.equal(Object.hasOwn(creada.datos, 'observacion'), false);
    assert.equal((await pedir('/ordenes')).datos.length, 25);

    const parcial = await pedir('/ordenes/25', 'PATCH', { estado: 'en proceso', id: 901, codigo: 'OTRO' });
    assert.equal(parcial.estado, 200);
    assert.deepEqual(parcial.datos, { ...creada.datos, estado: 'en proceso' });
    // La creación desde el frontend envía un segundo PATCH con el código.
    const codigo = await pedir('/ordenes/25', 'PATCH', { codigo: 'OS-2026-025' });
    assert.deepEqual(codigo.datos, parcial.datos);

    const reemplazo = { ...datos, cliente: 'Ferretería El Progreso', horas: 5, monto: 3000 };
    const completa = await pedir('/ordenes/25', 'PUT', { ...reemplazo, id: 902, codigo: 'NUEVO' });
    assert.equal(completa.estado, 200);
    assert.deepEqual(completa.datos, { ...reemplazo, id: 25, codigo: 'OS-2026-025' });
    assert.deepEqual((await pedir('/ordenes/25')).datos, completa.datos);

    const eliminada = await pedir('/ordenes/25', 'DELETE');
    assert.equal(eliminada.estado, 200);
    assert.deepEqual(eliminada.datos, {});
    assert.equal((await pedir('/ordenes')).datos.length, 24);
    const repetida = await pedir('/ordenes/25', 'DELETE');
    assert.equal(repetida.estado, 404);
    assert.deepEqual(repetida.datos, { error: 'No existe la orden 25', detalles: [] });
  });

  await t.test('Las escrituras sobre ID inexistentes o no numéricos devuelven 404', async () => {
    for (const id of ['999', 'abc']) {
      for (const metodo of ['PUT', 'PATCH', 'DELETE']) {
        // PUT requiere todos los campos antes de consultar si la orden existe.
        const datos = metodo === 'PUT' ? ordenes[0] : metodo === 'PATCH' ? { estado: 'cancelada' } : undefined;
        const respuesta = await pedir(`/ordenes/${id}`, metodo, datos);
        assert.equal(respuesta.estado, 404);
        assert.deepEqual(respuesta.datos, { error: `No existe la orden ${id}`, detalles: [] });
        assert.equal(respuesta.cabeceras.get('access-control-allow-origin'), origen);
      }
    }
  });

  await t.test('Catálogos oficiales y ruta desconocida con error JSON', async () => {
    const departamentos = await pedir('/departamentos');
    assert.equal(departamentos.estado, 200);
    assert.deepEqual(departamentos.datos, [
      'Guatemala', 'Sacatepéquez', 'Chimaltenango', 'Quetzaltenango',
      'Escuintla', 'Alta Verapaz', 'Baja Verapaz', 'El Progreso',
    ]);
    const categorias = await pedir('/categorias');
    assert.equal(categorias.estado, 200);
    assert.deepEqual(categorias.datos, ['Instalación', 'Mantenimiento preventivo', 'Reparación', 'Diagnóstico']);
    assert.equal(categorias.cabeceras.get('access-control-allow-origin'), origen);
    const desconocida = await pedir('/clientes');
    assert.equal(desconocida.estado, 404);
    assert.deepEqual(desconocida.datos, { error: 'No existe la ruta GET /clientes', detalles: [] });
    assert.equal(desconocida.cabeceras.get('access-control-allow-origin'), origen);
  });

  await t.test('POST inválido, sin cuerpo y números como texto no crean órdenes', async () => {
    const antes = (await pedir('/ordenes')).datos;
    const invalida = await pedir('/ordenes', 'POST', {
      cliente: '', nit: '1234567-X', departamento: 'Petén', categoria: 'Limpieza',
      tecnico: 'Mario Ixcot', fecha: '11/11/2026', horas: 30, monto: -500, estado: 'inventado',
    });
    assert.equal(invalida.estado, 400);
    assert.deepEqual(invalida.datos, {
      error: 'La orden tiene datos inválidos',
      detalles: [
        { campo: 'cliente', mensaje: 'El cliente es obligatorio' },
        { campo: 'nit', mensaje: 'Formato de NIT: 1234567-8 o CF' },
        { campo: 'departamento', mensaje: 'Departamento no válido' },
        { campo: 'categoria', mensaje: 'Categoría no válida' },
        { campo: 'fecha', mensaje: 'La fecha debe tener formato AAAA-MM-DD' },
        { campo: 'horas', mensaje: 'Las horas deben ser un número mayor que 0 y hasta 24' },
        { campo: 'monto', mensaje: 'El monto debe ser un número mayor que cero' },
        { campo: 'estado', mensaje: 'Estado no válido. Use: pendiente, en proceso, completada, cancelada' },
      ],
    });
    assert.equal(invalida.cabeceras.get('access-control-allow-origin'), origen);

    const sinCuerpo = await pedir('/ordenes', 'POST');
    assert.equal(sinCuerpo.estado, 400);
    assert.equal(sinCuerpo.datos.error, 'La orden tiene datos inválidos');
    assert.deepEqual(sinCuerpo.datos.detalles.map((detalle) => detalle.campo), [
      'cliente', 'nit', 'departamento', 'categoria', 'tecnico', 'fecha', 'horas', 'monto', 'estado',
    ]);

    const texto = await pedir('/ordenes', 'POST', { ...ordenes[0], horas: '4', monto: '2400' });
    assert.equal(texto.estado, 400);
    assert.deepEqual(texto.datos.detalles.map((detalle) => detalle.campo), ['horas', 'monto']);
    assert.deepEqual((await pedir('/ordenes')).datos, antes);
  });

  await t.test('POST ignora extras, admite CF y no permite imponer ID ni código', async () => {
    const creada = await pedir('/ordenes', 'POST', {
      ...ordenes[0], nit: 'CF', descuento: 100, id: 999, codigo: 'OS-2026-999',
    });
    assert.equal(creada.estado, 201);
    const { id, codigo, ...campos } = creada.datos;
    const { id: originalId, codigo: originalCodigo, ...originales } = ordenes[0];
    assert.deepEqual(campos, { ...originales, nit: 'CF' });
    assert.equal(id, 25);
    assert.equal(codigo, 'OS-2026-025');
    await pedir(`/ordenes/${id}`, 'DELETE');
  });

  await t.test('PUT exige los nueve campos y PATCH valida solo los presentes sin mutar ante errores', async () => {
    const original = (await pedir('/ordenes/1')).datos;
    const parcialInvalida = await pedir('/ordenes/1', 'PATCH', { estado: 'terminada', monto: 900 });
    assert.equal(parcialInvalida.estado, 400);
    assert.deepEqual(parcialInvalida.datos.detalles.map((detalle) => detalle.campo), ['estado']);
    assert.deepEqual((await pedir('/ordenes/1')).datos, original);

    const incompleta = await pedir('/ordenes/1', 'PUT', { estado: 'completada' });
    assert.equal(incompleta.estado, 400);
    assert.equal(incompleta.datos.detalles.length, 8);
    assert.equal(incompleta.datos.detalles.some((detalle) => detalle.campo === 'estado'), false);
    assert.deepEqual((await pedir('/ordenes/1')).datos, original);

    const codigo = await pedir('/ordenes/1', 'PATCH', { codigo: 'OTRO', id: 999, descuento: 100 });
    assert.equal(codigo.estado, 200);
    assert.deepEqual(codigo.datos, original);
    const sinCambios = await pedir('/ordenes/1', 'PATCH', {});
    assert.equal(sinCambios.estado, 200);
    assert.deepEqual(sinCambios.datos, original);
  });

  await t.test('Reglas de texto, catálogos, NIT, fecha y límites numéricos', async () => {
    const original = (await pedir('/ordenes/1')).datos;
    for (const cambios of [
      { cliente: '   ' }, { tecnico: '   ' }, { tecnico: 1 },
      { nit: 'cf' }, { nit: '1234567-k' }, { departamento: 'guatemala' },
      { departamento: 'Sacatepequez' }, { categoria: 'Instalacion' },
      { fecha: '2026-1-01' }, { fecha: 20261111 },
      { horas: 0 }, { horas: 24.01 }, { horas: null }, { monto: 0 }, { monto: -1 },
    ]) {
      const respuesta = await pedir('/ordenes/1', 'PATCH', cambios);
      assert.equal(respuesta.estado, 400, JSON.stringify(cambios));
      assert.deepEqual(respuesta.datos.detalles.map((detalle) => detalle.campo), Object.keys(cambios));
    }
    assert.deepEqual((await pedir('/ordenes/1')).datos, original);

    for (const cambios of [
      { nit: 'CF' }, { nit: '1234567-K' }, { nit: '12345678' },
      { horas: 24 }, { horas: 0.5 }, { monto: 0.01 },
      // La guía valida el patrón, no la existencia de la fecha.
      { fecha: '2026-02-30' },
    ]) {
      const respuesta = await pedir('/ordenes/1', 'PATCH', cambios);
      assert.equal(respuesta.estado, 200, JSON.stringify(cambios));
      for (const [campo, valor] of Object.entries(cambios)) assert.equal(respuesta.datos[campo], valor);
    }
    await pedir('/ordenes/1', 'PUT', original);
  });

  await t.test('JSON mal escrito responde 400 uniforme y la API sigue funcionando', async () => {
    const antes = (await pedir('/ordenes')).datos;
    const respuesta = await fetch(api.base + '/ordenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origen },
      body: '{ "cliente": "Ferretería El Progreso\n}',
    });
    assert.equal(respuesta.status, 400);
    assert.deepEqual(await respuesta.json(), { error: 'El cuerpo no es un JSON válido', detalles: [] });
    assert.equal(respuesta.headers.get('access-control-allow-origin'), origen);
    assert.deepEqual((await pedir('/ordenes')).datos, antes);
  });

  await t.test('El reinicio restaura los datos y no modifica db.json', async () => {
    assert.equal((await pedir('/ordenes/1', 'PATCH', { estado: 'cancelada' })).estado, 200);
    assert.equal((await pedir('/ordenes', 'POST', ordenes[0])).estado, 201);
    assert.equal((await pedir('/ordenes/2', 'DELETE')).estado, 200);
    assert.equal(await readFile(rutaDatos, 'utf8'), contenidoOriginal);
    await detener(api.proceso);
    api = await iniciar(t);
    assert.deepEqual((await pedir('/ordenes')).datos, ordenes);
    assert.equal(await readFile(rutaDatos, 'utf8'), contenidoOriginal);
  });
});

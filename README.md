# Serviclima API

API de órdenes de servicio con Node.js y Express. Los datos iniciales están en `datos/db.json` y se cargan en memoria al arrancar.

## Requisitos y arranque

Node.js 22 o superior y npm. Desde la raíz del proyecto:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Si `.env` ya existe, conservar su configuración. `npm run dev` reinicia el servidor al guardar cambios de código; `npm start` lo ejecuta sin observación. Los cambios en `.env` requieren reiniciar el proceso.

La API escucha en `http://localhost:3001`. Variables locales:

```dotenv
PUERTO=3001
ORIGEN_FRONTEND=http://localhost:5173
```

`.env` y `node_modules/` están ignorados por Git. `.env.example` y `package-lock.json` se incluyen en el repositorio.

## Operaciones

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/ordenes` | Listado completo, `200`. |
| GET | `/ordenes/:id` | Detalle, `200`; si no existe, `404`. |
| GET | `/departamentos` | Catálogo de los ocho departamentos permitidos, `200`. |
| GET | `/categorias` | Catálogo de las cuatro categorías permitidas, `200`. |
| POST | `/ordenes` | Crea una orden y asigna ID/código, `201`. |
| PUT | `/ordenes/:id` | Reemplaza los datos conservando ID/código, `200`. |
| PATCH | `/ordenes/:id` | Combina los cambios conservando ID/código, `200`. |
| DELETE | `/ordenes/:id` | Elimina y responde JSON `{}`, `200`. |
| OPTIONS | `/ordenes` o `/ordenes/:id` | Preflight CORS, `204` sin cuerpo. |

PUT, PATCH y DELETE también devuelven `404` para órdenes inexistentes si el cuerpo enviado es válido. Un ID no numérico devuelve el mismo tipo de error. Las rutas desconocidas responden `404` en JSON.

## Validaciones y errores (sesión 4)

POST y PUT requieren los nueve campos siguientes. PATCH valida únicamente los campos presentes, sin exigir los restantes.

| Campo | Regla |
| --- | --- |
| `cliente`, `tecnico` | Texto con contenido, no solo espacios. |
| `nit` | `CF` o dígitos con guion opcional y verificador numérico o `K` mayúscula. Se valida el formato, no el dígito verificador real. |
| `departamento`, `categoria` | Coincidencia exacta con los catálogos, incluidas tildes y mayúsculas. |
| `fecha` | Formato `AAAA-MM-DD`; la guía no comprueba si la fecha existe. |
| `horas` | Número mayor que cero y hasta 24. |
| `monto` | Número mayor que cero. |
| `estado` | `pendiente`, `en proceso`, `completada` o `cancelada`. |

Los valores de horas y monto enviados como texto se rechazan. Los campos desconocidos se ignoran: `id` y `codigo` los administra el servidor. El código tiene formato `OS-2026-025` y se conserva al actualizar. Un PATCH con solo `codigo` responde `200` sin cambiar la orden, compatible con el flujo de creación del frontend.

Los errores comparten el formato `{ "error": "...", "detalles": [] }`. Los datos inválidos responden `400`, antes de modificar la orden, con un detalle por campo:

```json
{
  "error": "La orden tiene datos inválidos",
  "detalles": [
    { "campo": "estado", "mensaje": "Estado no válido. Use: pendiente, en proceso, completada, cancelada" }
  ]
}
```

Un JSON mal escrito responde `400` con `El cuerpo no es un JSON válido`. Una orden inexistente responde `404` con `No existe la orden 999` y detalles vacíos. Los errores inesperados responden `500` con `Error interno del servidor`; la traza solo se registra en el servidor.

Las creaciones, ediciones y eliminaciones son temporales: **al reiniciar se recuperan las 24 órdenes originales**. La API no escribe en `datos/db.json`.

## Estructura

- `index.js`: configura Express y registra rutas; termina con el 404 y el manejador central de errores.
- `src/catalogos.js`: departamentos, categorías y estados compartidos por las consultas y la validación.
- `src/errores.js`: clase `ErrorHttp`, con estado HTTP y detalles.
- `src/validaciones/ordenes.js`: reglas y selección de campos permitidos.
- `src/rutas/`: asocia métodos y rutas con validaciones y controladores de órdenes y catálogos.
- `src/controladores/`: recibe solicitudes, responde por HTTP y lanza errores de órdenes inexistentes.
- `src/servicios/ordenes.js`: carga los datos y realiza las operaciones en memoria.
- `src/middlewares/`: registro, CORS, validación completa/parcial, rutas inexistentes y manejo central de errores.

## Pruebas

```powershell
npm test
```

Las pruebas arrancan sus propios servidores en puertos disponibles. Comprueban los datos iniciales, CRUD, catálogos, validación completa y parcial, descarte de extras, errores `400`/`404`/`500`, CORS, conservación de ID/código y recuperación después del reinicio. Los errores internos se fuerzan en rutas exclusivas del test, sin añadir rutas de fallos al entregable. No necesitan otro servidor activo ni alteran el JSON original.

Para probar manualmente, iniciar la API y abrir `peticiones.http` con REST Client en VS Code. Ejecutar las peticiones en orden después de reiniciar: los ejemplos de creación y modificación utilizan el ID 25. Se conservan las solicitudes de la sesión 3 y se añaden los 12 casos de la sesión 4. El último JSON está mal escrito a propósito para comprobar el error del parser.

## Conexión con el frontend

Utilizar `cig-node-2026/frontend` en el repositorio del curso. En otra terminal, desde esa carpeta:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Conservar el `.env` si ya existe y verificar `VITE_API_URL=http://localhost:3001`. Abrir `http://localhost:5173` y comprobar listado, detalle, creación, edición, completar y eliminación.

Mantener ambas terminales activas. `ORIGEN_FRONTEND` debe coincidir con el origen del navegador; `localhost` y `127.0.0.1` son distintos. No iniciar `npm run api` del frontend mientras Express usa el puerto 3001, porque ese comando arranca otro backend con `json-server`.

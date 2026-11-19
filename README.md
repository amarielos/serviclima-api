# Serviclima API

API de órdenes de servicio con Node.js, Express y SQLite. Las órdenes se guardan en `datos/serviclima.db` y sobreviven a los reinicios del backend local. `datos/db.json` contiene los datos iniciales del curso.

## Requisitos y arranque

Node.js 24 o superior y npm. La guía recomienda Node 26; esta implementación se comprobó con Node `24.19.0` y su módulo integrado `node:sqlite`. SQLite no necesita paquetes adicionales de npm. Desde la raíz del proyecto:

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

`.env`, `node_modules/`, los archivos `*.db` y sus auxiliares SQLite están ignorados por Git. `.env.example` y `package-lock.json` se incluyen en el repositorio.

La ruta predeterminada de la base se calcula desde el código, independientemente del directorio de la terminal. Opcionalmente se puede definir `RUTA_DB` con una ruta absoluta para usar una base alternativa, como hacen las pruebas. Su carpeta debe existir.

## Operaciones

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/ordenes` | Listado completo, `200`. |
| GET | `/ordenes/:id` | Detalle, `200`; si no existe, `404`. |
| GET | `/ordenes?estado=pendiente` | Listado filtrado por estado, `200`. |
| GET | `/departamentos` | Catálogo de los ocho departamentos permitidos, `200`. |
| GET | `/categorias` | Catálogo de las cuatro categorías permitidas, `200`. |
| GET | `/resumen` | Totales y agrupaciones SQL por estado y técnico, `200`. |
| POST | `/ordenes` | Crea una orden y asigna ID/código, `201`. |
| PUT | `/ordenes/:id` | Reemplaza los datos conservando ID/código, `200`. |
| PATCH | `/ordenes/:id` | Combina los cambios conservando ID/código, `200`. |
| DELETE | `/ordenes/:id` | Elimina y responde JSON `{}`, `200`. |
| OPTIONS | `/ordenes` o `/ordenes/:id` | Preflight CORS, `204` sin cuerpo. |

PUT, PATCH y DELETE también devuelven `404` para órdenes inexistentes si el cuerpo enviado es válido. Un ID no numérico devuelve el mismo tipo de error. Las rutas desconocidas responden `404` en JSON.

## Filtros y resumen (sesión 5)

`GET /ordenes` acepta coincidencias exactas por `estado`, `tecnico` y `departamento`, combinadas con `AND`. Por ejemplo:

```http
GET /ordenes?estado=completada&tecnico=Ana%20Chac%C3%B3n
GET /ordenes?departamento=Guatemala
```

El listado se ordena por ID. Sin coincidencias devuelve `200` con `[]`. Los filtros desconocidos se ignoran, así como los valores que llegan como arreglos al repetir un mismo parámetro. Los nombres de las columnas salen de una lista permitida y los valores se enlazan como parámetros; no se concatenan datos del usuario en el SQL.

`GET /resumen` devuelve:

- `total`: cantidad de `ordenes` y suma de `monto`.
- `porEstado`: `estado`, `ordenes` y `monto`, ordenados por cantidad descendente.
- `porTecnico`: `tecnico`, `ordenes`, `horas` y `monto`, ordenados por monto descendente.

Los importes y las horas agregadas se redondean a dos decimales. Los resultados reflejan las creaciones, modificaciones y eliminaciones guardadas en la base. Si la tabla queda vacía durante la ejecución, `total.ordenes` es cero y `total.monto` es `null`, como en el `SUM` de la guía.

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

## Persistencia y datos iniciales

`src/db.js` abre o crea `datos/serviclima.db`, crea la tabla si no existe e importa el JSON únicamente si la tabla está vacía. Una base con órdenes no se sobrescribe ni vuelve a recibir el seed al arrancar. La API no modifica `datos/db.json`.

SQLite asigna el ID y el servicio genera el código dentro de la misma transacción. El seed también se inserta en una transacción para evitar cargas parciales. La tabla añade restricciones `UNIQUE`, `NOT NULL` y `CHECK` para códigos, campos requeridos, catálogos y límites numéricos.

Las creaciones, ediciones y eliminaciones **permanecen después de reiniciar la API** mientras se conserve el archivo de la base. Si se eliminan todas las órdenes, el próximo arranque vuelve a sembrar la tabla vacía, de acuerdo con la guía.

### Reinicio de desarrollo

El script `npm run reiniciar-db` **elimina la tabla de órdenes y todos sus datos actuales**, la recrea y carga `datos/db.json`. Lee el mismo `.env` de la API, incluida `RUTA_DB` si está configurada. Usarlo solo por decisión expresa con datos de desarrollo prescindibles: detener la API y respaldar el archivo antes. Cambiar `src/catalogos.js` no actualiza los `CHECK` de una tabla existente; el reinicio de desarrollo los recrea, pero borra las órdenes guardadas. Este script no forma parte del arranque ni de `npm test`.

La persistencia descrita es local. Un despliegue con disco efímero puede perder el archivo al reiniciarse o redesplegarse: el seed recupera datos iniciales, no las órdenes nuevas de usuarios.

## Estructura

- `index.js`: configura Express y registra rutas; termina con el 404 y el manejador central de errores.
- `src/catalogos.js`: departamentos, categorías y estados compartidos por las consultas y la validación.
- `src/errores.js`: clase `ErrorHttp`, con estado HTTP y detalles.
- `src/db.js`: conexión SQLite, esquema y seed inicial.
- `src/validaciones/ordenes.js`: reglas y selección de campos permitidos.
- `src/rutas/`: asocia métodos y rutas con validaciones y controladores de órdenes y catálogos.
- `src/controladores/`: recibe solicitudes, responde por HTTP y lanza errores de órdenes inexistentes.
- `src/servicios/ordenes.js`: CRUD, filtros y resumen mediante SQL parametrizado.
- `src/controladores/resumen.js` y `src/rutas/resumen.js`: publican el resumen manteniendo las capas.
- `src/middlewares/`: registro, CORS, validación completa/parcial, rutas inexistentes y manejo central de errores.
- `reiniciar-db.js`: utilidad destructiva de desarrollo para restaurar los datos iniciales.

## Pruebas

```powershell
npm test
```

Las pruebas arrancan sus propios servidores en puertos disponibles y crean una base SQLite temporal aislada de `datos/serviclima.db`. Comprueban datos iniciales, CRUD, validación, errores `400`/`404`/`500`, CORS, catálogos, filtros simples y combinados, inyección SQL, agregaciones, restricciones de SQLite y persistencia tras reiniciar. No ejecutan el script de reinicio ni alteran la base de uso o el JSON original. Los errores internos se fuerzan en rutas exclusivas del test.

Para probar manualmente, iniciar la API y abrir `peticiones.http` con REST Client en VS Code. Se conservan las solicitudes de las sesiones 3 y 4 y se añaden nueve de la sesión 5. El JSON mal escrito de la sesión 4 es intencional.

Los ejemplos anteriores usan el ID 25: ajustarlo al ID devuelto por cada POST si la base ya tiene cambios. Reiniciar el servidor ya no restablece los datos. Los conteos de la guía 5 suponen las 24 órdenes iniciales más su POST de persistencia; otras escrituras cambian esos resultados. No reiniciar ni borrar una base con datos útiles solo para igualar los ejemplos.

## Conexión con el frontend

Utilizar `cig-node-2026/frontend` en el repositorio del curso. En otra terminal, desde esa carpeta:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Conservar el `.env` si ya existe y verificar `VITE_API_URL=http://localhost:3001`. Abrir `http://localhost:5173` y comprobar listado, detalle, creación, edición, completar y eliminación. Crear una orden, reiniciar solo la API y recargar el listado: debe seguir presente. El código del frontend no cambia.

Mantener ambas terminales activas. `ORIGEN_FRONTEND` debe coincidir con el origen del navegador; `localhost` y `127.0.0.1` son distintos. No iniciar `npm run api` del frontend mientras Express usa el puerto 3001, porque ese comando arranca otro backend con `json-server`.

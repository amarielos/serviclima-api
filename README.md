# Serviclima API

API para gestionar órdenes de servicio de climatización, desarrollada con Node.js, Express y SQLite. Permite registrar clientes, técnicos, trabajos, horas y montos, consultar órdenes por estado y obtener un resumen de la actividad.

## Instalación

Requiere Node.js 26 y npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Si ya tienes un `.env`, conserva su configuración. La API queda disponible en `http://localhost:3001`.

```dotenv
PUERTO=3001
ORIGEN_FRONTEND=http://localhost:5173
```

`ORIGEN_FRONTEND` debe coincidir con el origen del frontend. Para conectarlo, configura allí `VITE_API_URL=http://localhost:3001`.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/ordenes` | Listar órdenes. |
| GET | `/ordenes/:id` | Consultar una orden. |
| POST | `/ordenes` | Crear una orden. |
| PUT | `/ordenes/:id` | Reemplazar una orden. |
| PATCH | `/ordenes/:id` | Actualizar campos de una orden. |
| DELETE | `/ordenes/:id` | Eliminar una orden. |
| GET | `/departamentos` | Consultar departamentos disponibles. |
| GET | `/categorias` | Consultar categorías de servicio. |
| GET | `/resumen` | Obtener totales y agrupaciones por estado y técnico. |

El listado admite filtros combinados por `estado`, `tecnico` y `departamento`:

```http
GET /ordenes?estado=pendiente&departamento=Guatemala
```

Para crear o reemplazar una orden se requieren `cliente`, `nit`, `departamento`, `categoria`, `tecnico`, `fecha`, `horas`, `monto` y `estado`. El servidor asigna el ID y el código. Los estados disponibles son `pendiente`, `en proceso`, `completada` y `cancelada`.

Los errores se devuelven en JSON con el formato `{ "error": "...", "detalles": [] }`. La API incluye encabezados de seguridad con Helmet, CORS y un límite de 100 solicitudes por cliente cada 15 minutos.

## Datos

Las órdenes se guardan en `datos/serviclima.db`. Al iniciar con una tabla vacía, se cargan las 24 órdenes de `datos/db.json`. Puedes definir `RUTA_DB` con una ruta absoluta para utilizar otra base; su carpeta debe existir.

Los cambios se conservan mientras exista el archivo SQLite. En un alojamiento con disco efímero pueden perderse al reiniciar o desplegar de nuevo. `.env`, las bases locales y `node_modules/` están excluidos de Git.

## Pruebas

```powershell
npm test
```

Las pruebas usan una base temporal y verifican el CRUD, validaciones, filtros, resumen, persistencia y protecciones de seguridad. Para hacer consultas manuales, abre `peticiones.http` con REST Client en VS Code.

## Ejecución en producción

```powershell
npm start
```

El arranque admite un entorno sin archivo `.env`. `PORT` tiene prioridad sobre `PUERTO`; en Render lo proporciona la plataforma. Configura `ORIGEN_FRONTEND` con el origen real del frontend, sin ruta ni barra final.

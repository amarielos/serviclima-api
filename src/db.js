import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ESTADOS, DEPARTAMENTOS, CATEGORIAS } from './catalogos.js';

// RUTA_DB permite usar un archivo aislado en las pruebas; la API usa datos/ por defecto.
const rutaDb = process.env.RUTA_DB ?? path.join(import.meta.dirname, '..', 'datos', 'serviclima.db');
const rutaSeed = path.join(import.meta.dirname, '..', 'datos', 'db.json');

export const db = new DatabaseSync(rutaDb);

function lista(valores) {
  // Estos valores son constantes del catálogo, nunca datos de una petición.
  return valores.map((valor) => `'${valor.replaceAll("'", "''")}'`).join(', ');
}

export function crearTabla() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ordenes (
      id           INTEGER PRIMARY KEY,
      codigo       TEXT UNIQUE,
      cliente      TEXT NOT NULL,
      nit          TEXT NOT NULL,
      departamento TEXT NOT NULL CHECK (departamento IN (${lista(DEPARTAMENTOS)})),
      categoria    TEXT NOT NULL CHECK (categoria IN (${lista(CATEGORIAS)})),
      tecnico      TEXT NOT NULL,
      fecha        TEXT NOT NULL,
      horas        REAL NOT NULL CHECK (horas > 0 AND horas <= 24),
      monto        REAL NOT NULL CHECK (monto > 0),
      estado       TEXT NOT NULL CHECK (estado IN (${lista(ESTADOS)}))
    )
  `);
}

export function sembrar() {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM ordenes').get();
  if (total > 0) return;

  const { ordenes } = JSON.parse(readFileSync(rutaSeed, 'utf8'));
  const insertar = db.prepare(`
    INSERT INTO ordenes (id, codigo, cliente, nit, departamento, categoria, tecnico, fecha, horas, monto, estado)
    VALUES (:id, :codigo, :cliente, :nit, :departamento, :categoria, :tecnico, :fecha, :horas, :monto, :estado)
  `);

  // Si falla una fila, el próximo arranque podrá intentar el seed completo.
  db.exec('BEGIN');
  try {
    for (const orden of ordenes) insertar.run(orden);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log(`Seed: ${ordenes.length} órdenes copiadas de db.json`);
}

crearTabla();
sembrar();

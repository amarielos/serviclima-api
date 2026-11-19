import { db } from '../db.js';

// Solo estos nombres pueden incorporarse al SQL; los valores siempre se enlazan.
const CAMPOS = ['cliente', 'nit', 'departamento', 'categoria', 'tecnico', 'fecha', 'horas', 'monto', 'estado'];
const FILTROS = ['estado', 'tecnico', 'departamento'];

function generarCodigo(id) {
  return 'OS-2026-' + String(id).padStart(3, '0');
}

export function listar(filtros = {}) {
  const condiciones = [];
  const valores = [];

  for (const campo of FILTROS) {
    const valor = filtros[campo];
    if (typeof valor === 'string') {
      condiciones.push(`${campo} = ?`);
      valores.push(valor);
    }
  }

  let sql = 'SELECT * FROM ordenes';
  if (condiciones.length > 0) sql += ' WHERE ' + condiciones.join(' AND ');
  sql += ' ORDER BY id';
  return db.prepare(sql).all(...valores);
}

export function buscarPorId(id) {
  return db.prepare('SELECT * FROM ordenes WHERE id = ?').get(id);
}

export function crear(datos) {
  // La inserción y su código se guardan juntos o se deshacen juntos.
  db.exec('BEGIN');
  try {
    const resultado = db.prepare(`
      INSERT INTO ordenes (cliente, nit, departamento, categoria, tecnico, fecha, horas, monto, estado)
      VALUES (:cliente, :nit, :departamento, :categoria, :tecnico, :fecha, :horas, :monto, :estado)
    `).run(datos);

    const id = Number(resultado.lastInsertRowid);
    db.prepare('UPDATE ordenes SET codigo = ? WHERE id = ?').run(generarCodigo(id), id);
    const nueva = buscarPorId(id);
    db.exec('COMMIT');
    return nueva;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function reemplazar(id, datos) {
  const resultado = db.prepare(`
    UPDATE ordenes
    SET cliente = :cliente, nit = :nit, departamento = :departamento, categoria = :categoria,
        tecnico = :tecnico, fecha = :fecha, horas = :horas, monto = :monto, estado = :estado
    WHERE id = :id
  `).run({ ...datos, id });

  if (resultado.changes === 0) return undefined;
  return buscarPorId(id);
}

export function actualizar(id, cambios) {
  const campos = Object.keys(cambios).filter((campo) => CAMPOS.includes(campo));
  // El PATCH con solo codigo del frontend se convierte en una consulta sin cambios.
  if (campos.length === 0) return buscarPorId(id);

  const asignaciones = campos.map((campo) => `${campo} = :${campo}`).join(', ');
  const valores = { id };
  for (const campo of campos) valores[campo] = cambios[campo];

  const resultado = db.prepare(`UPDATE ordenes SET ${asignaciones} WHERE id = :id`).run(valores);
  if (resultado.changes === 0) return undefined;
  return buscarPorId(id);
}

export function eliminar(id) {
  return db.prepare('DELETE FROM ordenes WHERE id = ?').run(id).changes > 0;
}

export function resumen() {
  const total = db.prepare(`
    SELECT COUNT(*) AS ordenes, ROUND(SUM(monto), 2) AS monto
    FROM ordenes
  `).get();

  const porEstado = db.prepare(`
    SELECT estado, COUNT(*) AS ordenes, ROUND(SUM(monto), 2) AS monto
    FROM ordenes
    GROUP BY estado
    ORDER BY ordenes DESC
  `).all();

  const porTecnico = db.prepare(`
    SELECT tecnico, COUNT(*) AS ordenes, ROUND(SUM(horas), 2) AS horas, ROUND(SUM(monto), 2) AS monto
    FROM ordenes
    GROUP BY tecnico
    ORDER BY monto DESC
  `).all();

  return { total, porEstado, porTecnico };
}

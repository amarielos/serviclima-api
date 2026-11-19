// Utilidad destructiva de desarrollo: elimina las órdenes actuales y restaura el seed.
// Detener la API y respaldar los datos antes de ejecutar npm run reiniciar-db.
import { db, crearTabla, sembrar } from './src/db.js';

db.exec('DROP TABLE IF EXISTS ordenes');
crearTabla();
sembrar();
db.close();
console.log('Base reiniciada');

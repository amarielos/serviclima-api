import { ESTADOS, DEPARTAMENTOS, CATEGORIAS } from '../catalogos.js';

function esTextoConContenido(valor) {
  return typeof valor === 'string' && valor.trim() !== '';
}

const reglas = {
  cliente: (valor) => {
    if (!esTextoConContenido(valor)) return 'El cliente es obligatorio';
    return null;
  },
  nit: (valor) => {
    if (typeof valor !== 'string' || !/^(CF|\d{1,12}-?[\dK])$/.test(valor)) {
      return 'Formato de NIT: 1234567-8 o CF';
    }
    return null;
  },
  departamento: (valor) => {
    if (!DEPARTAMENTOS.includes(valor)) return 'Departamento no válido';
    return null;
  },
  categoria: (valor) => {
    if (!CATEGORIAS.includes(valor)) return 'Categoría no válida';
    return null;
  },
  tecnico: (valor) => {
    if (!esTextoConContenido(valor)) return 'El técnico es obligatorio';
    return null;
  },
  fecha: (valor) => {
    // La guía comprueba el formato, sin validar la existencia real de la fecha.
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return 'La fecha debe tener formato AAAA-MM-DD';
    }
    return null;
  },
  horas: (valor) => {
    if (typeof valor !== 'number' || !(valor > 0 && valor <= 24)) {
      return 'Las horas deben ser un número mayor que 0 y hasta 24';
    }
    return null;
  },
  monto: (valor) => {
    if (typeof valor !== 'number' || !(valor > 0)) {
      return 'El monto debe ser un número mayor que cero';
    }
    return null;
  },
  estado: (valor) => {
    if (!ESTADOS.includes(valor)) return `Estado no válido. Use: ${ESTADOS.join(', ')}`;
    return null;
  },
};

// Solo los campos del esquema llegan al servicio; id, codigo y extras se ignoran.
export function validarOrden(datos, { parcial = false } = {}) {
  const limpios = {};
  const detalles = [];

  for (const campo in reglas) {
    const valor = datos[campo];
    if (parcial && valor === undefined) continue;

    const mensaje = reglas[campo](valor);
    if (mensaje) {
      detalles.push({ campo, mensaje });
    } else {
      limpios[campo] = valor;
    }
  }

  return { limpios, detalles };
}

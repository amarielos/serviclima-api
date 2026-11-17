export function registrarPeticion(req, res, next) {
  const fecha = new Date().toISOString();
  const inicio = performance.now();

  res.on('finish', () => {
    const ms = (performance.now() - inicio).toFixed(1);
    console.log(`[${fecha}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms} ms`);
  });

  next();
}

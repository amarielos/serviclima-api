export function permitirOrigen(req, res, next) {
  res.set('Access-Control-Allow-Origin', process.env.ORIGEN_FRONTEND);
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

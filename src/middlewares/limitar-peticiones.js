import { rateLimit } from 'express-rate-limit';

export const limitarPeticiones = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas peticiones. Intente de nuevo en unos minutos',
    detalles: [],
  },
});

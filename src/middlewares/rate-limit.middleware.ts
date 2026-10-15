import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

/**
 * Limitador de intentos en memoria por IP (suficiente para una sola instancia).
 * Frena la fuerza bruta contra login y registro.
 */
export const limitarIntentos = (max: number, ventanaMs: number) => {
    const intentos = new Map<string, { n: number; reinicio: number }>();
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (process.env.NODE_ENV === 'test') return next();
        const ahora = Date.now();
        const clave = req.ip ?? 'desconocida';
        let e = intentos.get(clave);
        if (!e || e.reinicio < ahora) {
            e = { n: 0, reinicio: ahora + ventanaMs };
            intentos.set(clave, e);
        }
        if (++e.n > max) return next(new AppError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.', 429));
        if (intentos.size > 10000) for (const [k, v] of intentos) if (v.reinicio < ahora) intentos.delete(k);
        next();
    };
};

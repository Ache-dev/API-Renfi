import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

const MAX_CLAVES = 50_000; // tope de IPs recordadas: el limitador no puede crecer sin límite en memoria

/**
 * Limitador de peticiones en memoria por IP (suficiente para una sola instancia: con varias instancias
 * cada una cuenta por separado; para un límite global usa Azure Front Door / API Management).
 * Detrás de un proxy (Azure App Service) hay que configurar TRUST_PROXY, o todos comparten la IP del proxy.
 *
 * @param max           peticiones permitidas por ventana
 * @param ventanaMs     duración de la ventana
 * @param soloEscrituras si es true, solo cuentan POST / PUT / DELETE
 */
export const limitarIntentos = (max: number, ventanaMs: number, soloEscrituras = false) => {
    const intentos = new Map<string, { n: number; reinicio: number }>();
    return (req: Request, res: Response, next: NextFunction): void => {
        if (process.env.NODE_ENV === 'test') return next();
        if (soloEscrituras && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        const ahora = Date.now();
        const clave = req.ip ?? 'desconocida';
        let e = intentos.get(clave);
        if (!e || e.reinicio < ahora) {
            e = { n: 0, reinicio: ahora + ventanaMs };
            intentos.set(clave, e);
        }
        if (++e.n > max) {
            res.setHeader('Retry-After', String(Math.max(1, Math.ceil((e.reinicio - ahora) / 1000))));
            return next(new AppError('Demasiadas peticiones. Espera unos minutos e inténtalo de nuevo.', 429));
        }
        if (intentos.size > MAX_CLAVES) {
            for (const [k, v] of intentos) if (v.reinicio < ahora) intentos.delete(k);
            // Si siguen siendo demasiadas (ataque con muchas IPs), se olvidan las más antiguas
            for (const k of intentos.keys()) {
                if (intentos.size <= MAX_CLAVES / 2) break;
                intentos.delete(k);
            }
        }
        next();
    };
};

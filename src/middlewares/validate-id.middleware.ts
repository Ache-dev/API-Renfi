import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

/**
 * Extrae y valida un ID numérico de req.params.id o req.query.id.
 * Lo almacena en req.params.id para uso unificado en controladores.
 */
export const validarId = (req: Request, _res: Response, next: NextFunction): void => {
    const rawId = req.params.id !== undefined ? req.params.id : (req.query.id as string | undefined);

    if (rawId === undefined || rawId === null || rawId === '') {
        return next(new AppError('El parámetro ID es requerido', 400));
    }

    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
        return next(new AppError(`ID inválido: '${rawId}'. Debe ser un número entero positivo.`, 400));
    }

    req.params.id = String(id);
    next();
};


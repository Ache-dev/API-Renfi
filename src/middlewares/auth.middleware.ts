import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import envConfig from '../config/env.config';
import { AppError } from './error.middleware';

export interface UserPayload {
    NumeroDocumento: number;
    IdUsuario?: number;
    Correo: string;
    IdRol?: number;
    NombreRol?: string;
    NombreUsuario?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

/**
 * Middleware para requerir autenticación JWT.
 */
export const autenticarJwt = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Acceso no autorizado. Token no proporcionado.', 401);
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new AppError('Acceso no autorizado. Token inválido.', 401);
        }

        const decoded = jwt.verify(token, envConfig.JWT.SECRET) as UserPayload;
        req.user = decoded;
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            next(new AppError('El token de sesión ha expirado.', 401));
        } else if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError('Token inválido o corrupto.', 401));
        }
    }
};

/**
 * Middleware opcional: si viene un token lo decodifica, si no continúa sin error.
 */
export const autenticarOpcional = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, envConfig.JWT.SECRET) as UserPayload;
                req.user = decoded;
            }
        }
    } catch {
        // Ignorar error en opcional
    }
    next();
};


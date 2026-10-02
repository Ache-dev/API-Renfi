import { Request, Response, NextFunction } from 'express';

/**
 * Clase para errores operacionales con código HTTP personalizado.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware centralizado para captura y manejo de errores.
 * Garantiza que toda respuesta de error sea en formato JSON estándar.
 */
export const errorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
    const message = err.message || 'Error interno del servidor';

    // Logging detallado en consola del servidor
    console.error(`[Error Handler] [Status ${statusCode}]:`, err);

    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack || err.toString() : undefined
    });
};


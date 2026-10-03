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

const CONN_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'EAI_AGAIN', 'ECONNABORTED']);

/**
 * true solo para fallos de conexion/arranque de la BD (no errores SQL ni de negocio).
 */
export const esErrorDeConexion = (err: any): boolean => {
    if (!err || err instanceof AppError) return false;
    const code = String(err.code ?? '');
    if (CONN_CODES.has(code) || code.startsWith('08') || code.startsWith('57P')) return true;
    if (/^[0-9A-Z]{5}$/.test(code)) return false; // SQLSTATE (constraint, sintaxis, etc.)
    return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|PGlite|Connection terminated|timeout expired/i.test(String(err.message ?? ''));
};

/**
 * Traduce errores de Postgres a { status, message } en espanol, sin filtrar SQL.
 */
const mapPgError = (err: any): { status: number; message: string } | null => {
    const detail = String(err.detail ?? '');
    const col = err.column ? ` '${err.column}'` : '';
    switch (err.code) {
        case '23503': {
            const m = /Key \(([^)]+)\)=\(([^)]*)\) is (?:not present in|still referenced from) table "([^"]+)"/.exec(detail);
            if (/still referenced/.test(detail)) return { status: 409, message: 'No se puede eliminar: existen registros relacionados que dependen de este.' };
            return { status: 409, message: m ? `El registro relacionado no existe: ${m[3]} con ${m[1]} = ${m[2]}.` : 'El registro relacionado no existe.' };
        }
        case '23505': return { status: 409, message: 'Ya existe un registro con esos datos (valor duplicado).' };
        case '23502': return { status: 400, message: `El campo${col} es obligatorio.` };
        case '22P02': case '22007': case '22008': case '22003':
            return { status: 400, message: 'Alguno de los datos enviados tiene un formato o valor inválido.' };
        case 'P0001': return { status: 400, message: err.message };
        default: return null;
    }
};

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
    const pg = mapPgError(err);
    let statusCode = pg?.status ?? (err.statusCode || (err.status ? Number(err.status) : 500));
    let message = pg?.message ?? err.message ?? 'Error interno del servidor';
    // Errores no controlados: no exponer detalle interno
    if (!pg && statusCode >= 500 && !err.isOperational) message = 'Error interno del servidor';

    console.error(`[Error Handler] [Status ${statusCode}]:`, err);

    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack || err.toString() : undefined
    });
};

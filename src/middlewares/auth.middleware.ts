import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as usuarioDao from '../dao/usuario.dao';
import envConfig from '../config/env.config';
import { AppError } from './error.middleware';

export interface UserPayload {
    NumeroDocumento: number;
    IdUsuario?: number;
    Correo: string;
    IdRol?: number | undefined;
    NombreRol?: string | undefined;
    NombreUsuario?: string | undefined;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

const ERRORES_JWT = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];
const SESION_INVALIDA = 'La sesión ya no es válida. Inicia sesión de nuevo.';

/**
 * Huella de la contraseña guardada. Va dentro del token: si la contraseña cambia
 * (o se migra a otro hash), los tokens anteriores dejan de valer.
 */
export const huellaContrasena = (almacenada?: string): string =>
    crypto.createHash('sha256').update(almacenada ?? '').digest('hex').slice(0, 16);

/**
 * Valida el token Y el estado actual del usuario en la base de datos, así un token
 * se "cancela" al instante cuando el usuario se desactiva, se elimina, cambia de rol
 * o cambia su contraseña. El rol que se usa es el actual, no el que trae el token.
 */
const verificarSesion = async (req: Request): Promise<UserPayload> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('Acceso no autorizado. Token no proporcionado.', 401);
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new AppError('Acceso no autorizado. Token inválido.', 401);
    }

    const decoded = jwt.verify(token, envConfig.JWT.SECRET) as UserPayload & { pv?: string };

    const actual = await usuarioDao.buscarPorId(Number(decoded.NumeroDocumento));
    if (!actual || String(actual.Estado ?? '').toLowerCase() !== 'activo' || decoded.pv !== huellaContrasena(actual.Contrasena)) {
        throw new AppError(SESION_INVALIDA, 401);
    }

    return {
        ...decoded,
        IdRol: actual.IdRol,
        NombreRol: actual.NombreRol,
        NombreUsuario: actual.NombreUsuario,
        Correo: actual.Correo
    };
};

/**
 * Middleware para requerir autenticación JWT.
 */
export const autenticarJwt = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        req.user = await verificarSesion(req);
        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            next(new AppError('El token de sesión ha expirado.', 401));
        } else if (error instanceof AppError) {
            next(error);
        } else if (ERRORES_JWT.includes(error.name)) {
            next(new AppError('Token inválido o corrupto.', 401));
        } else {
            next(error); // fallo de base de datos u otro error real: no se disfraza de 401
        }
    }
};

/**
 * Middleware opcional: con un token válido y vigente identifica al usuario;
 * sin token, o con uno inválido o cancelado, continúa como anónimo.
 */
export const autenticarOpcional = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        if (req.headers.authorization) req.user = await verificarSesion(req);
    } catch (error: any) {
        if (!(error instanceof AppError) && !ERRORES_JWT.includes(error.name)) return next(error);
    }
    next();
};

export const esAdmin = (u?: UserPayload): boolean => Number(u?.IdRol) === 1;

/** Nombre oficial del rol que publica y administra sus propias fincas (db/migraciones/003). */
export const ROL_DUENO = 'Dueño de finca';

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
// "Propietario" es el nombre heredado del seed anterior a la migración 003
const NOMBRES_DUENO = [sinTildes(ROL_DUENO), 'propietario'];

/**
 * El rol se reconoce por nombre (no por Id) porque los Id los genera la base.
 */
export const esNombreRolDueno = (nombre?: string | null): boolean => NOMBRES_DUENO.includes(sinTildes(String(nombre ?? '')));

export const esDueno = (u?: UserPayload): boolean => esNombreRolDueno(u?.NombreRol);

/**
 * Exige sesión iniciada y rol de administrador.
 */
export const soloAdmin = [
    autenticarJwt,
    (req: Request, _res: Response, next: NextFunction): void => {
        next(esAdmin(req.user) ? undefined : new AppError('No tienes permisos para realizar esta acción.', 403));
    }
];

/**
 * Exige sesión iniciada y rol de administrador o de dueño de finca.
 */
export const adminODueno = [
    autenticarJwt,
    (req: Request, _res: Response, next: NextFunction): void => {
        next(esAdmin(req.user) || esDueno(req.user) ? undefined : new AppError('Esta acción es solo para dueños de finca y administradores.', 403));
    }
];

/**
 * Exige sesión iniciada y que :param sea el documento del usuario autenticado (o ser administrador).
 */
export const propioOAdmin = (param: string) => [
    autenticarJwt,
    (req: Request, _res: Response, next: NextFunction): void => {
        const permitido = esAdmin(req.user) || Number(req.params[param]) === Number(req.user?.NumeroDocumento);
        next(permitido ? undefined : new AppError('No tienes permisos para acceder a este recurso.', 403));
    }
];

/**
 * Exige sesión iniciada y que el recurso :id pertenezca al usuario (o ser administrador).
 * `propietario` devuelve el NumeroDocumento del dueño, o null si el recurso no existe.
 */
export const duenoOAdmin = (propietario: (id: number) => Promise<number | null | undefined>) => [
    autenticarJwt,
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (esAdmin(req.user)) return next();
            const dueno = await propietario(Number(req.params.id));
            if (dueno === null || dueno === undefined) return next(new AppError('Recurso no encontrado.', 404));
            next(Number(dueno) === Number(req.user?.NumeroDocumento) ? undefined : new AppError('No tienes permisos para acceder a este recurso.', 403));
        } catch (err) {
            next(err);
        }
    }
];

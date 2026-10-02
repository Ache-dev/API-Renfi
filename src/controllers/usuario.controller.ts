import { Request, Response, NextFunction } from 'express';
import * as usuarioService from '../services/usuario.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Controlador de autenticación: login de usuario.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const correo = req.body.correo ?? req.body.Correo;
        const contrasena = req.body.contrasena ?? req.body.Contrasena;

        if (!correo || !contrasena) {
            throw new AppError('Correo y contraseña son requeridos', 400);
        }

        const resultado = await usuarioService.login(correo, contrasena);
        res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
};

/**
 * Obtiene la lista de todos los usuarios.
 */
export const getUsuarios = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const usuarios = await usuarioService.getUsuarios();
        res.status(200).json(usuarios);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca un usuario por su ID (número de documento).
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const usuario = await usuarioService.buscarPorId(id);

        if (!usuario) {
            throw new AppError(`Usuario con ID ${id} no encontrado`, 404);
        }

        res.status(200).json(usuario);
    } catch (error) {
        next(error);
    }
};

/**
 * Registra un nuevo usuario.
 */
export const crearUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await usuarioService.crearUsuario(req.body);
        res.status(201).json({
            message: 'Usuario creado correctamente',
            id: resultado.id,
            NumeroDocumento: resultado.id,
            IdUsuario: resultado.id,
            usuario: resultado.usuario
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza los datos de un usuario.
 */
export const actualizarUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizado = await usuarioService.actualizarUsuario(id, req.body);
        res.status(200).json({
            message: 'Usuario actualizado correctamente',
            usuario: actualizado,
            ...actualizado
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina un usuario por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await usuarioService.eliminarPorId(id);
        res.status(200).json({
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
};
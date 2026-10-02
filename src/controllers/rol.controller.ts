import { Request, Response, NextFunction } from 'express';
import * as rolService from '../services/rol.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los roles.
 */
export const getRoles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const roles = await rolService.getRoles();
        res.status(200).json(roles);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca un rol por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const rol = await rolService.buscarPorId(id);

        if (!rol) {
            throw new AppError(`Rol con ID ${id} no encontrado`, 404);
        }

        res.status(200).json(rol);
    } catch (error) {
        next(error);
    }
};

/**
 * Crea un nuevo rol.
 */
export const crearRol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await rolService.crearRol(req.body);
        res.status(201).json({
            message: 'Rol creado correctamente',
            id: resultado.id,
            IdRol: resultado.IdRol,
            rol: resultado.rol
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza un rol existente.
 */
export const actualizarRol = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizado = await rolService.actualizarRol(id, req.body);
        res.status(200).json({
            message: 'Rol actualizado correctamente',
            rol: actualizado
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina un rol por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await rolService.eliminarPorId(id);
        res.status(200).json({
            message: 'Rol eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};


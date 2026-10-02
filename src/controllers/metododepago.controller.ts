import { Request, Response, NextFunction } from 'express';
import * as metodoService from '../services/metododepago.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los métodos de pago.
 */
export const getMetodos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const metodos = await metodoService.getMetodos();
        res.status(200).json(metodos);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca un método de pago por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const metodo = await metodoService.buscarPorId(id);

        if (!metodo) {
            throw new AppError(`Método de pago con ID ${id} no encontrado`, 404);
        }

        res.status(200).json(metodo);
    } catch (error) {
        next(error);
    }
};

/**
 * Crea un nuevo método de pago.
 */
export const crearMetodo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await metodoService.crearMetodo(req.body);
        res.status(201).json({
            message: 'Método de pago creado correctamente',
            id: resultado.id,
            IdMetodoDePago: resultado.IdMetodoDePago,
            metodo: resultado.metodo
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza un método de pago existente.
 */
export const actualizarMetodo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizado = await metodoService.actualizarMetodo(id, req.body);
        res.status(200).json({
            message: 'Método de pago actualizado correctamente',
            metodo: actualizado
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina un método de pago por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await metodoService.eliminarPorId(id);
        res.status(200).json({
            message: 'Método de pago eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};

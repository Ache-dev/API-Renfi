import { Request, Response, NextFunction } from 'express';
import * as pagoService from '../services/pago.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los pagos.
 */
export const getPagos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const pagos = await pagoService.getPagos();
        res.status(200).json(pagos);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca un pago por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const pago = await pagoService.buscarPorId(id);

        if (!pago) {
            throw new AppError(`Pago con ID ${id} no encontrado`, 404);
        }

        res.status(200).json(pago);
    } catch (error) {
        next(error);
    }
};

/**
 * Registra un nuevo pago.
 */
export const crearPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await pagoService.crearPago(req.body);
        res.status(201).json({
            message: 'Pago creado correctamente',
            id: resultado.id,
            IdPago: resultado.IdPago,
            idPago: resultado.idPago,
            pago: resultado.pago
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza un pago existente.
 */
export const actualizarPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizado = await pagoService.actualizarPago(id, req.body);
        res.status(200).json({
            message: 'Pago actualizado correctamente',
            pago: actualizado
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina un pago por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await pagoService.eliminarPorId(id);
        res.status(200).json({
            message: 'Pago eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reporte: Pagos pendientes.
 */
export const getPagosPendientes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await pagoService.getPagosPendientes();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

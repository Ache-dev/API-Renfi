import { Request, Response, NextFunction } from 'express';
import * as reservaService from '../services/reserva.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Lista las reservas con soporte para filtros por query parameters.
 */
export const listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const filtros = req.query as any;
        const reservas = await reservaService.getReservas(filtros);
        res.status(200).json(reservas);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca una reserva por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const reserva = await reservaService.buscarPorId(id);

        if (!reserva) {
            throw new AppError(`Reserva con ID ${id} no encontrada`, 404);
        }

        res.status(200).json(reserva);
    } catch (error) {
        next(error);
    }
};

/**
 * Lista las reservas de un usuario por su número de documento.
 */
export const listarPorUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const numeroDocumento = Number(req.params.numeroDocumento);
        if (!Number.isInteger(numeroDocumento) || numeroDocumento <= 0) {
            throw new AppError('Número de documento inválido', 400);
        }

        const reservas = await reservaService.listarPorUsuario(numeroDocumento);
        res.status(200).json(reservas);
    } catch (error) {
        next(error);
    }
};

/**
 * Registra una nueva reserva.
 */
export const crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await reservaService.crearReserva(req.body);
        res.status(201).json({
            message: 'Reserva creada correctamente',
            id: resultado.id,
            IdReserva: resultado.IdReserva,
            idReserva: resultado.idReserva,
            IdFactura: resultado.IdFactura,
            reserva: resultado.reserva,
            data: {
                IdReserva: resultado.IdReserva,
                IdFactura: resultado.IdFactura,
                ...resultado.reserva
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza una reserva existente.
 */
export const actualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizada = await reservaService.actualizarReserva(id, req.body);
        res.status(200).json({
            message: 'Reserva actualizada correctamente',
            reserva: actualizada
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina una reserva por su ID.
 */
export const eliminar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await reservaService.eliminarPorId(id);
        res.status(200).json({
            message: 'Reserva eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};

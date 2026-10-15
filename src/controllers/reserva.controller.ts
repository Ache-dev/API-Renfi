import { Request, Response, NextFunction } from 'express';
import * as reservaService from '../services/reserva.service';
import { AppError } from '../middlewares/error.middleware';
import { esAdmin } from '../middlewares/auth.middleware';

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
 * Reservas recibidas en las fincas del dueño autenticado.
 */
export const listarMisFincas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.status(200).json(await reservaService.listarPorPropietario(Number(req.user?.NumeroDocumento)));
    } catch (error) {
        next(error);
    }
};

/**
 * El dueño de la finca (o el administrador) confirma, finaliza o cancela una reserva.
 */
export const cambiarEstado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const reserva = await reservaService.cambiarEstado(Number(req.params.id), req.body?.Estado);
        res.status(200).json({ message: 'Estado de la reserva actualizado', reserva });
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
 * Fechas ocupadas de una finca (publico, sin datos personales).
 */
export const ocupadasPorFinca = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.status(200).json(await reservaService.ocupadasPorFinca(Number(req.params.id)));
    } catch (error) {
        next(error);
    }
};

/**
 * Registra una nueva reserva.
 */
export const crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const admin = esAdmin(req.user);
        // Un cliente solo reserva a su nombre; el administrador puede reservar para cualquiera.
        const dto = admin ? req.body : { ...req.body, NumeroDocumentoUsuario: req.user?.NumeroDocumento };
        const resultado = await reservaService.crearReserva(dto, { esAdmin: admin });
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
        // Un cliente solo puede cancelar su reserva (la propiedad ya la verifico la ruta).
        if (!esAdmin(req.user) && String(req.body?.Estado ?? '').toLowerCase() !== 'cancelada') {
            throw new AppError('Solo puedes cancelar tu reserva.', 403);
        }
        const dto = esAdmin(req.user) ? req.body : { Estado: 'Cancelada' };
        const actualizada = await reservaService.actualizarReserva(id, dto);
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

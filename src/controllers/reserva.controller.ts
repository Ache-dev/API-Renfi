import { Request, Response } from 'express';
import * as reservaDao from '../dao/reserva.dao';
import * as facturaDao from '../dao/factura.dao';
import { Reserva } from '../models/reserva';
import { Factura } from '../models/factura';

const normalizeDate = (value: any): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

const parseReservaFromRequest = (body: any, idReserva?: number): Reserva => {
    const reserva: Reserva = {
        IdFinca: Number(body.IdFinca),
        FechaReserva: normalizeDate(body.FechaReserva) || new Date(),
        FechaEntrada: normalizeDate(body.FechaEntrada) || new Date(),
        FechaSalida: normalizeDate(body.FechaSalida) || new Date(),
        Estado: body.Estado ?? 'Activa',
        MontoReserva: Number(body.MontoReserva)
    };
    
    if (body.NumeroDocumentoUsuario) {
        reserva.NumeroDocumentoUsuario = Number(body.NumeroDocumentoUsuario);
    }
    
    if (idReserva !== undefined) {
        reserva.IdReserva = idReserva;
    }
    
    return reserva;
};

export const listar = async (_req: Request, res: Response): Promise<void> => {
    try {
        const reservas = await reservaDao.listar();
        res.status(200).json(reservas);
    } catch (error) {
        console.error('Error al listar reservas:', error);
        res.status(500).json({
            message: 'Error al listar reservas',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const buscarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            res.status(400).json({ message: 'ID inválido' });
            return;
        }

        const reserva = await reservaDao.buscarPorId(id);
        if (!reserva) {
            res.status(404).json({ message: 'Reserva no encontrada' });
            return;
        }

        res.status(200).json(reserva);
    } catch (error) {
        console.error('Error al buscar reserva:', error);
        res.status(500).json({
            message: 'Error al buscar reserva',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const crear = async (req: Request, res: Response): Promise<void> => {
    try {
        const { IdFinca, NumeroDocumentoUsuario, FechaEntrada, FechaSalida, MontoReserva } = req.body;

        if (!IdFinca || !NumeroDocumentoUsuario || !FechaEntrada || !FechaSalida || !MontoReserva) {
            res.status(400).json({
                message: 'Faltan campos obligatorios',
                required: ['IdFinca', 'NumeroDocumentoUsuario', 'FechaEntrada', 'FechaSalida', 'MontoReserva']
            });
            return;
        }

        const fechaEntrada = normalizeDate(FechaEntrada);
        const fechaSalida = normalizeDate(FechaSalida);

        if (!fechaEntrada || !fechaSalida || fechaSalida <= fechaEntrada) {
            res.status(400).json({
                message: 'Las fechas deben ser válidas y la fecha de salida posterior a la de entrada'
            });
            return;
        }

        const reservaPayload = parseReservaFromRequest(req.body);
        const nuevoId = await reservaDao.insertar(reservaPayload);

        let idFactura: number | undefined;
        try {
            const factura: Factura = {
                IdFactura: 0, // Se autogenera
                IdReserva: nuevoId,
                FechaFactura: new Date(),
                Total: MontoReserva
            };
            idFactura = await facturaDao.insertar(factura);
        } catch (facturaError) {
        }

        const reservaCompleta = await reservaDao.buscarPorId(nuevoId);

        const payload = {
            message: 'Reserva creada correctamente',
            IdReserva: nuevoId,
            id: nuevoId,
            idReserva: nuevoId,
            IdFactura: idFactura,
            reserva: reservaCompleta,
            data: { 
                IdReserva: nuevoId,
                IdFactura: idFactura,
                ...reservaCompleta
            }
        };

        res.status(201).json(payload);
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({
            message: 'Error al crear reserva',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const actualizar = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            res.status(400).json({ message: 'ID inválido' });
            return;
        }

        const reservaExistente = await reservaDao.buscarPorId(id);
        if (!reservaExistente) {
            res.status(404).json({ message: 'Reserva no encontrada' });
            return;
        }

        const fechaEntrada = normalizeDate(req.body.FechaEntrada);
        const fechaSalida = normalizeDate(req.body.FechaSalida);

        if (fechaEntrada && fechaSalida && fechaSalida <= fechaEntrada) {
            res.status(400).json({
                message: 'Las fechas deben ser válidas y la fecha de salida posterior a la de entrada'
            });
            return;
        }

        const reservaPayload = parseReservaFromRequest(req.body, id);
        await reservaDao.actualizar(reservaPayload);

        res.status(200).json({ message: 'Reserva actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        res.status(500).json({
            message: 'Error al actualizar reserva',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const eliminar = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        
        if (!Number.isInteger(id)) {
            res.status(400).json({ message: 'ID inválido' });
            return;
        }

        const reserva = await reservaDao.buscarPorId(id);
        if (!reserva) {
            res.status(404).json({ message: 'Reserva no encontrada' });
            return;
        }

        await reservaDao.eliminarPorId(id);

        res.status(200).json({ 
            message: 'Reserva cancelada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar reserva:', error);
        res.status(500).json({
            message: 'Error al eliminar reserva',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};

export const listarPorUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const numeroDocumento = Number(req.params.numeroDocumento);
        if (!Number.isInteger(numeroDocumento)) {
            res.status(400).json({ message: 'Número de documento inválido' });
            return;
        }

        const reservas = await reservaDao.listarPorUsuario(numeroDocumento);
        res.status(200).json(reservas);
    } catch (error) {
        console.error('Error al listar reservas por usuario:', error);
        res.status(500).json({
            message: 'Error al listar reservas por usuario',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
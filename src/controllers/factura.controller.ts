import { Request, Response, NextFunction } from 'express';
import * as facturaService from '../services/factura.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todas las facturas.
 */
export const getFacturas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const facturas = await facturaService.getFacturas();
        res.status(200).json(facturas);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca una factura por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const factura = await facturaService.buscarPorId(id);

        if (!factura) {
            throw new AppError(`Factura con ID ${id} no encontrada`, 404);
        }

        res.status(200).json(factura);
    } catch (error) {
        next(error);
    }
};

/**
 * Crea una nueva factura.
 */
export const crearFactura = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await facturaService.crearFactura(req.body);
        res.status(201).json({
            message: 'Factura creada correctamente',
            id: resultado.id,
            IdFactura: resultado.IdFactura,
            idFactura: resultado.idFactura,
            factura: resultado.factura
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza una factura existente.
 */
export const actualizarFactura = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizada = await facturaService.actualizarFactura(id, req.body);
        res.status(200).json({
            message: 'Factura actualizada correctamente',
            factura: actualizada
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina una factura por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await facturaService.eliminarPorId(id);
        res.status(200).json({
            message: 'Factura eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};


import * as pagoDao from '../dao/pago.dao';
import { Pago } from '../models/pago';

export const getPagos = async (): Promise<Pago[]> => {
    try {
        return await pagoDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearPago = async (pago: Pago): Promise<void> => {
    try {
        if (!pago.IdFactura || !pago.IdMetodoDePago || !pago.Monto || !pago.FechaPago || !pago.EstadoPago) {
            throw new Error('Faltan campos requeridos para crear pago');
        }
        await pagoDao.insertar(pago);
    } catch (error) {
        throw error;
    }
};

export const actualizarPago = async (pago: Pago): Promise<void> => {
    try {
        if (!pago.IdPago) {
            throw new Error('IdPago es requerido para actualizar');
        }
        await pagoDao.actualizar(pago);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await pagoDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Pago | null> => {
    try {
        return await pagoDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};

// Reporte: pagos pendientes
import { pagosPendientes, PagoPendiente } from '../dao/pago.dao';
export const getPagosPendientes = async (): Promise<PagoPendiente[]> => {
    try {
        return await pagosPendientes();
    } catch (error) {
        throw error;
    }
};
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
        await pagoDao.insertar(pago);
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
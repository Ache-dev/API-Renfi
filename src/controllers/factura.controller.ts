import * as facturaDao from '../dao/factura.dao';
import { Factura } from '../models/factura';

export const getFacturas = async (): Promise<Factura[]> => {
    try {
        return await facturaDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearFactura = async (factura: Factura): Promise<number> => {
    try {
        if (!factura.IdReserva || !factura.Total) {
            throw new Error('Faltan campos requeridos para crear factura');
        }
        const idFactura = await facturaDao.insertar(factura);
        return idFactura;
    } catch (error) {
        throw error;
    }
};

export const actualizarFactura = async (factura: Factura): Promise<void> => {
    try {
        if (!factura.IdFactura) {
            throw new Error('IdFactura es requerido para actualizar');
        }
        await facturaDao.actualizar(factura);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await facturaDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Factura | null> => {
    try {
        return await facturaDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};

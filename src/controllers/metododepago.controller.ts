import * as metodoDao from '../dao/metododepago.dao';
import { MetodoDePago } from '../models/metododepago';

export const getMetodos = async (): Promise<MetodoDePago[]> => {
    try {
        return await metodoDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearMetodo = async (metodo: MetodoDePago): Promise<void> => {
    try {
        if (!metodo.NombreMetodoDePago) {
            throw new Error('Faltan campos requeridos para crear método de pago');
        }
        await metodoDao.insertar(metodo);
    } catch (error) {
        throw error;
    }
};

export const actualizarMetodo = async (metodo: MetodoDePago): Promise<void> => {
    try {
        if (!metodo.IdMetodoDePago) {
            throw new Error('IdMetodoDePago es requerido para actualizar');
        }
        await metodoDao.actualizar(metodo);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await metodoDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    try {
        return await metodoDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};
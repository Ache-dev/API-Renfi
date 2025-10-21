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
        await metodoDao.insertar(metodo);
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
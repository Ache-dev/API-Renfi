import * as fincaDao from '../dao/finca.dao';
import { Finca } from '../models/finca';

export const getFincas = async (): Promise<Finca[]> => {
    try {
        return await fincaDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearFinca = async (finca: Finca): Promise<void> => {
    try {
        await fincaDao.insertar(finca);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await fincaDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Finca | null> => {
    try {
        return await fincaDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};
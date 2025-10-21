import * as municipioDao from '../dao/municipio.dao';
import { Municipio } from '../models/municipio';

export const getMunicipios = async (): Promise<Municipio[]> => {
    try {
        return await municipioDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearMunicipio = async (municipio: Municipio): Promise<void> => {
    try {
        await municipioDao.insertar(municipio);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await municipioDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Municipio | null> => {
    try {
        return await municipioDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};
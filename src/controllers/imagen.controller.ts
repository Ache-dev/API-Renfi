import * as imagenDao from '../dao/imagen.dao';
import { Imagen } from '../models/imagen';

export const getImagenes = async (): Promise<Imagen[]> => {
    try {
        return await imagenDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearImagen = async (imagen: Imagen): Promise<void> => {
    try {
        await imagenDao.insertar(imagen);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await imagenDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    try {
        return await imagenDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};
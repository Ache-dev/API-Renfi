import * as imagenDao from '../dao/imagen.dao';
import { Imagen } from '../models/imagen';

export const getImagenesPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    try {
        return await imagenDao.buscarPorIdFinca(idFinca);
    } catch (error) {
        throw error;
    }
};

export const getImagenes = async (): Promise<Imagen[]> => {
    try {
        return await imagenDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearImagen = async (imagen: Imagen): Promise<void> => {
    try {
        if (!imagen.UrlImagen || !imagen.IdFinca) {
            throw new Error('Faltan campos requeridos para crear imagen');
        }
        await imagenDao.insertar(imagen);
    } catch (error) {
        throw error;
    }
};

export const actualizarImagen = async (imagen: Imagen): Promise<void> => {
    try {
        if (!imagen.IdImagen) {
            throw new Error('IdImagen es requerido para actualizar');
        }
        await imagenDao.actualizar(imagen);
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
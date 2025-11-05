import * as rolDao from '../dao/rol.dao';
import { Rol } from '../models/rol';

export const getRoles = async (): Promise<Rol[]> => {
    try {
        return await rolDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearRol = async (rol: Rol): Promise<void> => {
    try {
        if (!rol.NombreRol) {
            throw new Error('Faltan campos requeridos para crear rol');
        }
        await rolDao.insertar(rol);
    } catch (error) {
        throw error;
    }
};

export const actualizarRol = async (rol: Rol): Promise<void> => {
    try {
        if (!rol.IdRol) {
            throw new Error('IdRol es requerido para actualizar');
        }
        await rolDao.actualizar(rol);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await rolDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Rol | null> => {
    try {
        return await rolDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};

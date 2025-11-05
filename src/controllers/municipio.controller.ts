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
        if (!municipio.NombreMunicipio) {
            throw new Error('Faltan campos requeridos para crear municipio');
        }
        await municipioDao.insertar(municipio);
    } catch (error) {
        throw error;
    }
};

export const actualizarMunicipio = async (municipio: Municipio): Promise<void> => {
    try {
        if (!municipio.IdMunicipio) {
            throw new Error('IdMunicipio es requerido para actualizar');
        }
        await municipioDao.actualizar(municipio);
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

// Reporte: municipios con más reservas
import { municipiosConMasReservas, MunicipioReservas } from '../dao/municipio.dao';
export const getMunicipiosConMasReservas = async (): Promise<MunicipioReservas[]> => {
    try {
        return await municipiosConMasReservas();
    } catch (error) {
        throw error;
    }
};
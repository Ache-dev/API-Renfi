import * as municipioDao from '../dao/municipio.dao';
import { Municipio, CrearMunicipioDto, ActualizarMunicipioDto, MunicipioReporte } from '../models/municipio';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los municipios.
 */
export const getMunicipios = async (): Promise<Municipio[]> => {
    return await municipioDao.listar();
};

/**
 * Busca un municipio por su ID.
 */
export const buscarPorId = async (id: number): Promise<Municipio | null> => {
    return await municipioDao.buscarPorId(id);
};

/**
 * Crea un nuevo municipio.
 */
export const crearMunicipio = async (dto: CrearMunicipioDto): Promise<{
    id: number;
    IdMunicipio: number;
    municipio: Municipio | null;
}> => {
    if (!dto.NombreMunicipio) {
        throw new AppError('El campo NombreMunicipio es obligatorio', 400);
    }

    const municipio: Municipio = {
        NombreMunicipio: dto.NombreMunicipio.trim()
    };

    const id = await municipioDao.insertar(municipio);
    const creado = await municipioDao.buscarPorId(id);

    return {
        id,
        IdMunicipio: id,
        municipio: creado
    };
};

/**
 * Actualiza un municipio existente.
 */
export const actualizarMunicipio = async (id: number, dto: ActualizarMunicipioDto): Promise<Municipio | null> => {
    const existente = await municipioDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Municipio con ID ${id} no encontrado`, 404);
    }

    const actualizado: Municipio = {
        IdMunicipio: id,
        NombreMunicipio: dto.NombreMunicipio !== undefined ? dto.NombreMunicipio.trim() : existente.NombreMunicipio
    };

    await municipioDao.actualizar(actualizado);
    return await municipioDao.buscarPorId(id);
};

/**
 * Elimina un municipio por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await municipioDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Municipio con ID ${id} no encontrado`, 404);
    }
    await municipioDao.eliminarPorId(id);
};

/**
 * Reporte: Municipios con más reservas.
 */
export const getMunicipiosConMasReservas = async (): Promise<MunicipioReporte[]> => {
    return await municipioDao.municipiosConMasReservas();
};


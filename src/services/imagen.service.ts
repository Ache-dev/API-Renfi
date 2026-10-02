import * as imagenDao from '../dao/imagen.dao';
import { Imagen, CrearImagenDto, ActualizarImagenDto } from '../models/imagen';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todas las imágenes.
 */
export const getImagenes = async (): Promise<Imagen[]> => {
    return await imagenDao.listar();
};

/**
 * Obtiene todas las imágenes asociadas a una finca.
 */
export const getImagenesPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    return await imagenDao.buscarPorIdFinca(idFinca);
};

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    return await imagenDao.buscarPorId(id);
};

/**
 * Registra una nueva imagen para una finca.
 */
export const crearImagen = async (dto: CrearImagenDto): Promise<{
    id: number;
    IdImagen: number;
    imagen: Imagen | null;
}> => {
    if (!dto.UrlImagen || !dto.IdFinca) {
        throw new AppError('Los campos UrlImagen e IdFinca son obligatorios', 400);
    }

    const imagen: Imagen = {
        UrlImagen: dto.UrlImagen.trim(),
        IdFinca: Number(dto.IdFinca)
    };

    const id = await imagenDao.insertar(imagen);
    const creada = await imagenDao.buscarPorId(id);

    return {
        id,
        IdImagen: id,
        imagen: creada
    };
};

/**
 * Actualiza una imagen existente.
 */
export const actualizarImagen = async (id: number, dto: ActualizarImagenDto): Promise<Imagen | null> => {
    const existente = await imagenDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Imagen con ID ${id} no encontrada`, 404);
    }

    const actualizada: Imagen = {
        IdImagen: id,
        UrlImagen: dto.UrlImagen !== undefined ? dto.UrlImagen.trim() : existente.UrlImagen,
        IdFinca: dto.IdFinca !== undefined ? Number(dto.IdFinca) : existente.IdFinca
    };

    await imagenDao.actualizar(actualizada);
    return await imagenDao.buscarPorId(id);
};

/**
 * Elimina una imagen por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await imagenDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Imagen con ID ${id} no encontrada`, 404);
    }
    await imagenDao.eliminarPorId(id);
};


import * as imagenDao from '../dao/imagen.dao';
import { Imagen, CrearImagenDto, ActualizarImagenDto } from '../models/imagen';
import { AppError } from '../middlewares/error.middleware';

// El front puede enviar Url/url/ImagenUrl/imagenUrl en lugar de UrlImagen.
const aliasUrl = <T extends { UrlImagen?: any }>(dto: T): T => {
    const d: any = dto ?? {};
    return { ...d, UrlImagen: d.UrlImagen ?? d.Url ?? d.url ?? d.ImagenUrl ?? d.imagenUrl };
};
const verificarFinca = async (idFinca: number): Promise<void> => {
    if (!(await imagenDao.existeFinca(idFinca))) {
        throw new AppError(`Finca con ID ${idFinca} no encontrada`, 404);
    }
};

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
    dto = aliasUrl(dto);
    if (typeof dto.UrlImagen !== 'string' || !dto.UrlImagen.trim() || !Number.isInteger(Number(dto.IdFinca)) || Number(dto.IdFinca) <= 0) {
        throw new AppError('Los campos UrlImagen e IdFinca son obligatorios', 400);
    }
    await verificarFinca(Number(dto.IdFinca));

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

    dto = aliasUrl(dto);
    if (dto.IdFinca !== undefined) {
        if (!Number.isInteger(Number(dto.IdFinca)) || Number(dto.IdFinca) <= 0) throw new AppError('IdFinca inválido', 400);
        await verificarFinca(Number(dto.IdFinca));
    }
    const actualizada: Imagen = {
        IdImagen: id,
        UrlImagen: typeof dto.UrlImagen === 'string' && dto.UrlImagen.trim() ? dto.UrlImagen.trim() : existente.UrlImagen,
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


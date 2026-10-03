import * as rolDao from '../dao/rol.dao';
import { Rol, CrearRolDto, ActualizarRolDto } from '../models/rol';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los roles.
 */
export const getRoles = async (): Promise<Rol[]> => {
    return await rolDao.listar();
};

/**
 * Busca un rol por su ID.
 */
export const buscarPorId = async (id: number): Promise<Rol | null> => {
    return await rolDao.buscarPorId(id);
};

/**
 * Registra un nuevo rol.
 */
export const crearRol = async (dto: CrearRolDto): Promise<{
    id: number;
    IdRol: number;
    rol: Rol | null;
}> => {
    if (typeof dto?.NombreRol !== 'string' || !dto.NombreRol.trim()) {
        throw new AppError('El campo NombreRol es obligatorio', 400);
    }

    const rol: Rol = {
        NombreRol: dto.NombreRol.trim()
    };

    const id = await rolDao.insertar(rol);
    const creado = await rolDao.buscarPorId(id);

    return {
        id,
        IdRol: id,
        rol: creado
    };
};

/**
 * Actualiza un rol existente.
 */
export const actualizarRol = async (id: number, dto: ActualizarRolDto): Promise<Rol | null> => {
    const existente = await rolDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Rol con ID ${id} no encontrado`, 404);
    }

    const actualizado: Rol = {
        IdRol: id,
        NombreRol: typeof dto?.NombreRol === 'string' && dto.NombreRol.trim() ? dto.NombreRol.trim() : existente.NombreRol
    };

    await rolDao.actualizar(actualizado);
    return await rolDao.buscarPorId(id);
};

/**
 * Elimina un rol por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await rolDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Rol con ID ${id} no encontrado`, 404);
    }
    if (await rolDao.contarReferencias(id) > 0) {
        throw new AppError('No se puede eliminar el rol: tiene usuarios asociados', 409);
    }
    await rolDao.eliminarPorId(id);
};


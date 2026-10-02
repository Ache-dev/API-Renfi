import * as metodoDao from '../dao/metododepago.dao';
import { MetodoDePago, CrearMetodoDePagoDto, ActualizarMetodoDePagoDto } from '../models/metododepago';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los métodos de pago.
 */
export const getMetodos = async (): Promise<MetodoDePago[]> => {
    return await metodoDao.listar();
};

/**
 * Busca un método de pago por su ID.
 */
export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    return await metodoDao.buscarPorId(id);
};

/**
 * Crea un nuevo método de pago.
 */
export const crearMetodo = async (dto: CrearMetodoDePagoDto): Promise<{
    id: number;
    IdMetodoDePago: number;
    metodo: MetodoDePago | null;
}> => {
    if (!dto.NombreMetodoDePago) {
        throw new AppError('El campo NombreMetodoDePago es obligatorio', 400);
    }

    const metodo: MetodoDePago = {
        NombreMetodoDePago: dto.NombreMetodoDePago.trim(),
        PagoMixto: Boolean(dto.PagoMixto)
    };

    const id = await metodoDao.insertar(metodo);
    const creado = await metodoDao.buscarPorId(id);

    return {
        id,
        IdMetodoDePago: id,
        metodo: creado
    };
};

/**
 * Actualiza un método de pago existente.
 */
export const actualizarMetodo = async (id: number, dto: ActualizarMetodoDePagoDto): Promise<MetodoDePago | null> => {
    const existente = await metodoDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Método de pago con ID ${id} no encontrado`, 404);
    }

    const actualizado: MetodoDePago = {
        IdMetodoDePago: id,
        NombreMetodoDePago: dto.NombreMetodoDePago !== undefined ? dto.NombreMetodoDePago.trim() : existente.NombreMetodoDePago,
        PagoMixto: dto.PagoMixto !== undefined ? Boolean(dto.PagoMixto) : existente.PagoMixto
    };

    await metodoDao.actualizar(actualizado);
    return await metodoDao.buscarPorId(id);
};

/**
 * Elimina un método de pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await metodoDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Método de pago con ID ${id} no encontrado`, 404);
    }
    await metodoDao.eliminarPorId(id);
};


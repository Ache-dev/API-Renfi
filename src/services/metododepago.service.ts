import * as metodoDao from '../dao/metododepago.dao';
import { MetodoDePago, CrearMetodoDePagoDto, ActualizarMetodoDePagoDto } from '../models/metododepago';
import { AppError } from '../middlewares/error.middleware';

// El front envía PagoMixto como texto ('true'/'false'/'Sí'/'No') y alias Nombre/IdMetodoPago.
const aBool = (v: unknown): boolean =>
    typeof v === 'string' ? ['true', '1', 'si', 'sí', 'yes'].includes(v.trim().toLowerCase()) : Boolean(v);
const aliasMetodo = <T extends { NombreMetodoDePago?: any }>(dto: T): T => {
    const d: any = dto ?? {};
    return { ...d, NombreMetodoDePago: d.NombreMetodoDePago ?? d.Nombre ?? d.nombre };
};

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
    dto = aliasMetodo(dto);
    if (typeof dto.NombreMetodoDePago !== 'string' || !dto.NombreMetodoDePago.trim()) {
        throw new AppError('El campo NombreMetodoDePago es obligatorio', 400);
    }

    const metodo: MetodoDePago = {
        NombreMetodoDePago: dto.NombreMetodoDePago.trim(),
        PagoMixto: aBool(dto.PagoMixto)
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

    dto = aliasMetodo(dto);
    const actualizado: MetodoDePago = {
        IdMetodoDePago: id,
        NombreMetodoDePago: typeof dto.NombreMetodoDePago === 'string' && dto.NombreMetodoDePago.trim() ? dto.NombreMetodoDePago.trim() : existente.NombreMetodoDePago,
        PagoMixto: dto.PagoMixto !== undefined ? aBool(dto.PagoMixto) : existente.PagoMixto
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
    if (await metodoDao.contarReferencias(id) > 0) {
        throw new AppError('No se puede eliminar el método de pago: tiene pagos asociados', 409);
    }
    await metodoDao.eliminarPorId(id);
};


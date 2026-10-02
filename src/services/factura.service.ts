import * as facturaDao from '../dao/factura.dao';
import { Factura, CrearFacturaDto, ActualizarFacturaDto } from '../models/factura';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todas las facturas registradas.
 */
export const getFacturas = async (): Promise<Factura[]> => {
    return await facturaDao.listar();
};

/**
 * Busca una factura por su ID.
 */
export const buscarPorId = async (id: number): Promise<Factura | null> => {
    return await facturaDao.buscarPorId(id);
};

/**
 * Registra una nueva factura y retorna el ID creado.
 */
export const crearFactura = async (dto: CrearFacturaDto): Promise<{
    id: number;
    IdFactura: number;
    idFactura: number;
    factura: Factura | null;
}> => {
    if (!dto.IdReserva || dto.Total === undefined) {
        throw new AppError('Los campos IdReserva y Total son obligatorios', 400);
    }

    const factura: Factura = {
        IdReserva: Number(dto.IdReserva),
        Total: Number(dto.Total),
        FechaFactura: dto.FechaFactura ? new Date(dto.FechaFactura) : new Date()
    };

    const idFactura = await facturaDao.insertar(factura);
    const facturaCreada = await facturaDao.buscarPorId(idFactura);

    return {
        id: idFactura,
        IdFactura: idFactura,
        idFactura: idFactura,
        factura: facturaCreada
    };
};

/**
 * Actualiza una factura existente.
 */
export const actualizarFactura = async (id: number, dto: ActualizarFacturaDto): Promise<Factura | null> => {
    const existente = await facturaDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Factura con ID ${id} no encontrada`, 404);
    }

    const facturaActualizada: Factura = {
        IdFactura: id,
        IdReserva: dto.IdReserva !== undefined ? Number(dto.IdReserva) : existente.IdReserva,
        Total: dto.Total !== undefined ? Number(dto.Total) : existente.Total,
        FechaFactura: dto.FechaFactura ? new Date(dto.FechaFactura) : existente.FechaFactura
    };

    await facturaDao.actualizar(facturaActualizada);
    return await facturaDao.buscarPorId(id);
};

/**
 * Elimina una factura por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await facturaDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Factura con ID ${id} no encontrada`, 404);
    }
    await facturaDao.eliminarPorId(id);
};


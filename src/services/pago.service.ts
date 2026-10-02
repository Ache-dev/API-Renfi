import * as pagoDao from '../dao/pago.dao';
import { Pago, CrearPagoDto, ActualizarPagoDto, PagoPendiente } from '../models/pago';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los pagos registrados.
 */
export const getPagos = async (): Promise<Pago[]> => {
    return await pagoDao.listar();
};

/**
 * Busca un pago por su ID.
 */
export const buscarPorId = async (id: number): Promise<Pago | null> => {
    return await pagoDao.buscarPorId(id);
};

/**
 * Registra un nuevo pago y retorna el ID creado.
 */
export const crearPago = async (dto: CrearPagoDto): Promise<{
    id: number;
    IdPago: number;
    idPago: number;
    pago: Pago | null;
}> => {
    if (!dto.IdFactura || !dto.IdMetodoDePago || !dto.Monto) {
        throw new AppError('Los campos IdFactura, IdMetodoDePago y Monto son obligatorios', 400);
    }

    const pago: Pago = {
        IdFactura: Number(dto.IdFactura),
        IdMetodoDePago: Number(dto.IdMetodoDePago),
        Monto: Number(dto.Monto),
        FechaPago: dto.FechaPago ? new Date(dto.FechaPago) : new Date(),
        EstadoPago: dto.EstadoPago || 'Pagado'
    };

    const idPago = await pagoDao.insertar(pago);
    const pagoCreado = await pagoDao.buscarPorId(idPago);

    return {
        id: idPago,
        IdPago: idPago,
        idPago: idPago,
        pago: pagoCreado
    };
};

/**
 * Actualiza un pago existente.
 */
export const actualizarPago = async (id: number, dto: ActualizarPagoDto): Promise<Pago | null> => {
    const existente = await pagoDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Pago con ID ${id} no encontrado`, 404);
    }

    const pagoActualizado: Pago = {
        IdPago: id,
        IdFactura: dto.IdFactura !== undefined ? Number(dto.IdFactura) : existente.IdFactura,
        IdMetodoDePago: dto.IdMetodoDePago !== undefined ? Number(dto.IdMetodoDePago) : existente.IdMetodoDePago,
        Monto: dto.Monto !== undefined ? Number(dto.Monto) : existente.Monto,
        FechaPago: dto.FechaPago ? new Date(dto.FechaPago) : existente.FechaPago,
        EstadoPago: dto.EstadoPago || existente.EstadoPago
    };

    await pagoDao.actualizar(pagoActualizado);
    return await pagoDao.buscarPorId(id);
};

/**
 * Elimina un pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await pagoDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Pago con ID ${id} no encontrado`, 404);
    }
    await pagoDao.eliminarPorId(id);
};

/**
 * Reporte: Pagos pendientes.
 */
export const getPagosPendientes = async (): Promise<PagoPendiente[]> => {
    return await pagoDao.pagosPendientes();
};


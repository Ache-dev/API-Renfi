import * as pagoDao from '../dao/pago.dao';
import * as facturaDao from '../dao/factura.dao';
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
export const crearPago = async (dto: CrearPagoDto, quien: { esAdmin: boolean; documento?: number | undefined } = { esAdmin: false }): Promise<{
    id: number;
    IdPago: number;
    idPago: number;
    pago: Pago | null;
}> => {
    if (!dto.IdFactura || !dto.IdMetodoDePago || !dto.Monto) {
        throw new AppError('Los campos IdFactura, IdMetodoDePago y Monto son obligatorios', 400);
    }

    let monto = Number(dto.Monto);
    let estado = dto.EstadoPago || 'Pagado';
    let fechaPago = dto.FechaPago ? new Date(dto.FechaPago) : new Date();
    if (!quien.esAdmin) {
        // Un cliente solo paga sus propias facturas, por el total facturado y con la fecha del servidor.
        const factura = await facturaDao.buscarPorId(Number(dto.IdFactura));
        if (!factura) throw new AppError('Factura no encontrada', 404);
        if (Number(factura.NumeroDocumentoCliente) !== Number(quien.documento)) {
            throw new AppError('No tienes permisos para pagar esta factura.', 403);
        }
        monto = Number(factura.Total);
        fechaPago = new Date();
        if (!['Pagado', 'Pendiente'].includes(estado)) estado = 'Pagado';
    }

    const pago: Pago = {
        IdFactura: Number(dto.IdFactura),
        IdMetodoDePago: Number(dto.IdMetodoDePago),
        Monto: monto,
        FechaPago: fechaPago,
        EstadoPago: estado
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


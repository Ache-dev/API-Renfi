import * as reservaDao from '../dao/reserva.dao';
import * as facturaDao from '../dao/factura.dao';
import { Reserva, ReservaFiltros, CrearReservaDto, ActualizarReservaDto } from '../models/reserva';
import { Factura } from '../models/factura';
import { AppError } from '../middlewares/error.middleware';

const normalizeDate = (value: any): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

/**
 * Lista las reservas con soporte para filtros por query params.
 */
export const getReservas = async (filtros?: ReservaFiltros): Promise<Reserva[]> => {
    return await reservaDao.listar(filtros);
};

/**
 * Busca una reserva por su ID.
 */
export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    return await reservaDao.buscarPorId(id);
};

/**
 * Lista reservas de un usuario por su número de documento.
 */
export const listarPorUsuario = async (numeroDocumento: number): Promise<Reserva[]> => {
    return await reservaDao.listarPorUsuario(numeroDocumento);
};

/**
 * Crea una reserva validando fechas y campos obligatorios.
 * Genera automáticamente la factura asociada si se requiere para flujo completo.
 */
export const crearReserva = async (dto: CrearReservaDto): Promise<{
    id: number;
    IdReserva: number;
    idReserva: number;
    IdFactura?: number | undefined;
    reserva: Reserva | null;
}> => {
    if (!dto.IdFinca || !dto.FechaEntrada || !dto.FechaSalida || !dto.MontoReserva) {
        throw new AppError('Los campos IdFinca, FechaEntrada, FechaSalida y MontoReserva son obligatorios', 400);
    }

    const fechaEntrada = normalizeDate(dto.FechaEntrada);
    const fechaSalida = normalizeDate(dto.FechaSalida);

    if (!fechaEntrada || !fechaSalida) {
        throw new AppError('Las fechas de entrada y salida deben ser fechas válidas', 400);
    }

    if (fechaSalida <= fechaEntrada) {
        throw new AppError('La fecha de salida debe ser posterior a la fecha de entrada', 400);
    }

    const reservaParaInsertar: Reserva = {
        IdFinca: Number(dto.IdFinca),
        NumeroDocumentoUsuario: dto.NumeroDocumentoUsuario ? Number(dto.NumeroDocumentoUsuario) : undefined,
        FechaReserva: normalizeDate(dto.FechaReserva) || new Date(),
        FechaEntrada: fechaEntrada,
        FechaSalida: fechaSalida,
        MontoReserva: Number(dto.MontoReserva),
        Estado: dto.Estado || 'Activa'
    };

    const idReserva = await reservaDao.insertar(reservaParaInsertar);

    // Intentar crear factura inicial asociada si no existe
    let idFactura: number | undefined;
    try {
        const factura: Factura = {
            IdFactura: 0,
            IdReserva: idReserva,
            FechaFactura: new Date(),
            Total: Number(dto.MontoReserva)
        };
        idFactura = await facturaDao.insertar(factura);
    } catch (e) {
        // La factura se puede crear en paso posterior por el frontend
    }

    const reservaCompleta = await reservaDao.buscarPorId(idReserva);

    return {
        id: idReserva,
        IdReserva: idReserva,
        idReserva: idReserva,
        IdFactura: idFactura,
        reserva: reservaCompleta
    };
};

/**
 * Actualiza una reserva existente.
 */
export const actualizarReserva = async (id: number, dto: ActualizarReservaDto): Promise<Reserva | null> => {
    const existente = await reservaDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Reserva con ID ${id} no encontrada`, 404);
    }

    const fechaEntrada = dto.FechaEntrada ? normalizeDate(dto.FechaEntrada) : normalizeDate(existente.FechaEntrada);
    const fechaSalida = dto.FechaSalida ? normalizeDate(dto.FechaSalida) : normalizeDate(existente.FechaSalida);

    if (fechaEntrada && fechaSalida && fechaSalida <= fechaEntrada) {
        throw new AppError('La fecha de salida debe ser posterior a la de entrada', 400);
    }

    const reservaActualizada: Reserva = {
        IdReserva: id,
        IdFinca: dto.IdFinca !== undefined ? Number(dto.IdFinca) : existente.IdFinca,
        NumeroDocumentoUsuario: dto.NumeroDocumentoUsuario !== undefined ? Number(dto.NumeroDocumentoUsuario) : existente.NumeroDocumentoUsuario,
        FechaReserva: dto.FechaReserva ? normalizeDate(dto.FechaReserva) || existente.FechaReserva : existente.FechaReserva,
        FechaEntrada: fechaEntrada || new Date(),
        FechaSalida: fechaSalida || new Date(),
        Estado: dto.Estado || existente.Estado || 'Activa',
        MontoReserva: dto.MontoReserva !== undefined ? Number(dto.MontoReserva) : existente.MontoReserva
    };

    await reservaDao.actualizar(reservaActualizada);
    return await reservaDao.buscarPorId(id);
};

/**
 * Elimina o cancela una reserva.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await reservaDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Reserva con ID ${id} no encontrada`, 404);
    }
    await reservaDao.eliminarPorId(id);
};

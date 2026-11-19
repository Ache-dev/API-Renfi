import * as reservaDao from '../dao/reserva.dao';
import * as facturaDao from '../dao/factura.dao';
import { Reserva, ReservaFiltros, CrearReservaDto, ActualizarReservaDto } from '../models/reserva';
import { Factura } from '../models/factura';
import { AppError } from '../middlewares/error.middleware';
import { entero, unoDe, ESTADOS_RESERVA, NOCHES_MAXIMAS, MONTO_MAXIMO } from './validacion';

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
 * Reservas recibidas en las fincas de un propietario.
 */
export const listarPorPropietario = async (numeroDocumento: number): Promise<Reserva[]> => {
    return await reservaDao.listarPorPropietario(numeroDocumento);
};

// Estados que el dueño de la finca puede asignar a una reserva
export const ESTADOS_RESERVA_DUENO = ['Activa', 'Confirmada', 'Finalizada', 'Cancelada'];

/**
 * El dueño de la finca (o el administrador) cambia el estado de una reserva: confirmarla, finalizarla o cancelarla.
 */
export const cambiarEstado = async (id: number, estado: unknown): Promise<Reserva | null> => {
    return await actualizarReserva(id, { Estado: unoDe('Estado', estado, ESTADOS_RESERVA_DUENO) });
};

const DIA_MS = 86_400_000;

/**
 * Crea una reserva validando fechas y campos obligatorios, y su factura.
 * Para un cliente el servidor decide monto, estado y fecha de reserva: lo que envíe se ignora.
 */
export const crearReserva = async (dto: CrearReservaDto, opciones: { esAdmin?: boolean } = {}): Promise<{
    id: number;
    IdReserva: number;
    idReserva: number;
    IdFactura: number;
    reserva: Reserva | null;
}> => {
    const admin = Boolean(opciones.esAdmin);
    if (!dto.IdFinca || !dto.NumeroDocumentoUsuario || !dto.FechaEntrada || !dto.FechaSalida || (admin && !dto.MontoReserva)) {
        throw new AppError(`Los campos IdFinca, NumeroDocumentoUsuario, FechaEntrada, FechaSalida${admin ? ' y MontoReserva' : ''} son obligatorios`, 400);
    }
    const idFinca = entero('IdFinca', dto.IdFinca, 1, 2_147_483_647);
    const documento = entero('NumeroDocumentoUsuario', dto.NumeroDocumentoUsuario, 1, 2_147_483_647);

    const fechaEntrada = normalizeDate(dto.FechaEntrada);
    const fechaSalida = normalizeDate(dto.FechaSalida);
    if (!fechaEntrada || !fechaSalida) {
        throw new AppError('Las fechas de entrada y salida deben ser fechas válidas', 400);
    }
    if (fechaSalida <= fechaEntrada) {
        throw new AppError('La fecha de salida debe ser posterior a la fecha de entrada', 400);
    }
    const noches = Math.max(1, Math.round((fechaSalida.getTime() - fechaEntrada.getTime()) / DIA_MS));
    if (noches > NOCHES_MAXIMAS) throw new AppError(`Una reserva admite máximo ${NOCHES_MAXIMAS} noches`, 400);

    const finca = await reservaDao.reglasFinca(idFinca);
    if (!finca) throw new AppError('La finca indicada no existe', 404);

    const huespedes = dto.Huespedes ?? dto.huespedes;
    if (huespedes !== undefined && huespedes !== null) {
        const n = entero('El número de huéspedes', huespedes, 1, 500);
        if (n > finca.Capacidad) {
            throw new AppError(`El número de huéspedes (${n}) supera la capacidad de la finca (${finca.Capacidad})`, 400);
        }
    }

    let monto: number;
    if (admin) {
        monto = entero('MontoReserva', dto.MontoReserva, 1, MONTO_MAXIMO);
    } else {
        // Un cliente no decide cuánto paga ni reserva en el pasado; el dueño puede pausar su finca
        if (fechaEntrada.getTime() < Date.now() - DIA_MS) throw new AppError('La fecha de entrada no puede estar en el pasado', 400);
        if (noches < finca.NochesMinimas) throw new AppError(`Esta finca exige mínimo ${finca.NochesMinimas} noches`, 400);
        if (finca.Estado?.trim().toLowerCase() === 'no disponible') {
            throw new AppError('La finca no está disponible para reservas por ahora', 409);
        }
        monto = finca.Precio * noches;
    }

    // Aviso amable; la garantía real contra reservas simultáneas es la restricción EXCLUDE de la base (migración 004)
    if (await reservaDao.contarSolapes(idFinca, fechaEntrada, fechaSalida) > 0) {
        throw new AppError('La finca ya tiene una reserva en las fechas seleccionadas', 409);
    }

    const idReserva = await reservaDao.insertar({
        IdFinca: idFinca,
        NumeroDocumentoUsuario: documento,
        FechaReserva: admin ? normalizeDate(dto.FechaReserva) || new Date() : new Date(),
        FechaEntrada: fechaEntrada,
        FechaSalida: fechaSalida,
        MontoReserva: monto,
        Estado: admin && dto.Estado ? unoDe('Estado', dto.Estado, ESTADOS_RESERVA) : 'Activa'
    });

    // La factura se crea siempre junto con la reserva; si falla se revierte la reserva.
    let idFactura: number;
    try {
        const factura: Factura = {
            IdFactura: 0,
            IdReserva: idReserva,
            FechaFactura: new Date(),
            Total: monto
        };
        idFactura = await facturaDao.insertar(factura);
    } catch (e) {
        await reservaDao.eliminarPorId(idReserva);
        throw e;
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
 * Fechas ocupadas de una finca (para el calendario de reserva), sin datos personales.
 */
export const ocupadasPorFinca = async (idFinca: number) => reservaDao.ocupadasPorFinca(idFinca);

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
        IdFinca: dto.IdFinca !== undefined ? entero('IdFinca', dto.IdFinca, 1, 2_147_483_647) : existente.IdFinca,
        NumeroDocumentoUsuario: dto.NumeroDocumentoUsuario !== undefined ? entero('NumeroDocumentoUsuario', dto.NumeroDocumentoUsuario, 1, 2_147_483_647) : existente.NumeroDocumentoUsuario,
        FechaReserva: dto.FechaReserva ? normalizeDate(dto.FechaReserva) || existente.FechaReserva : existente.FechaReserva,
        FechaEntrada: fechaEntrada || new Date(),
        FechaSalida: fechaSalida || new Date(),
        Estado: dto.Estado ? unoDe('Estado', dto.Estado, ESTADOS_RESERVA) : existente.Estado || 'Activa',
        MontoReserva: dto.MontoReserva !== undefined ? entero('MontoReserva', dto.MontoReserva, 1, MONTO_MAXIMO) : existente.MontoReserva
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

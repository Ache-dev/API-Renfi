import { filas, fila, insertar as insertarSp, ejecutar } from "../conexion/postgres";
import { Reserva, ReservaFiltros } from "../models/reserva";

const toDateOrNull = (value?: Date | string): string | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Lista las reservas, con soporte opcional para filtros dinámicos (correo, documento, finca, estado).
 */
export const listar = (filtros?: ReservaFiltros): Promise<Reserva[]> => {
    const documento = filtros?.NumeroDocumento ?? filtros?.numeroDocumento ?? filtros?.documento ?? filtros?.IdUsuario ?? filtros?.idUsuario;
    const fincaId = filtros?.IdFinca ?? filtros?.idFinca ?? filtros?.fincaId;
    const estado = (filtros?.Estado ?? filtros?.estado)?.trim();
    const correo = (filtros?.Correo ?? filtros?.correo)?.trim();
    return filas('sp_reserva_listar', [
        documento ? Number(documento) : null,
        fincaId ? Number(fincaId) : null,
        estado || null,
        correo || null
    ]);
};

/**
 * Inserta una nueva reserva y retorna el IdReserva generado.
 */
export const insertar = (reserva: Reserva): Promise<number> => {
    const ahora = new Date().toISOString();
    return insertarSp('sp_reserva_insertar', [
        reserva.IdFinca,
        reserva.NumeroDocumentoUsuario || null,
        toDateOrNull(reserva.FechaReserva) ?? ahora,
        toDateOrNull(reserva.FechaEntrada) ?? ahora,
        toDateOrNull(reserva.FechaSalida) ?? ahora,
        reserva.MontoReserva,
        reserva.Estado ?? 'Pendiente'
    ]);
};

/**
 * Actualiza una reserva existente.
 */
export const actualizar = (reserva: Reserva): Promise<void> =>
    ejecutar('sp_reserva_actualizar', [
        reserva.IdReserva,
        reserva.IdFinca,
        reserva.NumeroDocumentoUsuario || null,
        toDateOrNull(reserva.FechaReserva),
        toDateOrNull(reserva.FechaEntrada),
        toDateOrNull(reserva.FechaSalida),
        reserva.Estado ?? 'Pendiente',
        reserva.MontoReserva
    ]);

/**
 * Elimina una reserva por su identificador.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_reserva_eliminar', [id]);

/**
 * Busca una reserva específica por su ID.
 */
export const buscarPorId = (id: number): Promise<Reserva | null> => fila('sp_reserva_buscar', [id]);

/**
 * Lista las reservas de un usuario por su número de documento.
 */
export const listarPorUsuario = (numeroDocumento: number): Promise<Reserva[]> => filas('sp_reserva_listar_usuario', [numeroDocumento]);

/**
 * Reservas hechas sobre las fincas de un propietario.
 */
export const listarPorPropietario = (numeroDocumento: number): Promise<Reserva[]> => filas('sp_reserva_listar_propietario', [numeroDocumento]);

/**
 * Cuenta reservas no canceladas de la finca que se solapan con [entrada, salida).
 */
export const contarSolapes = async (idFinca: number, entrada: Date, salida: Date, excluirId = 0): Promise<number> =>
    Number((await fila<number>('sp_reserva_contar_solapes', [idFinca, entrada.toISOString(), salida.toISOString(), excluirId])) ?? 0);

/**
 * Datos de la finca que condicionan una reserva (null si no existe).
 */
export const reglasFinca = (idFinca: number): Promise<{ Precio: number; Estado: string; Capacidad: number; NochesMinimas: number } | null> =>
    fila('sp_reserva_reglas_finca', [idFinca]);

/**
 * Fechas ocupadas de una finca (reservas no canceladas), sin datos personales.
 */
export const ocupadasPorFinca = (idFinca: number): Promise<{ IdFinca: number; FechaEntrada: string; FechaSalida: string }[]> =>
    filas('sp_reserva_ocupadas_finca', [idFinca]);

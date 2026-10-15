import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { Reserva, ReservaFiltros } from "../models/reserva";

const SELECT_RESERVA = 'IdReserva, IdFinca, NumeroDocumentoUsuario, FechaReserva, FechaEntrada, FechaSalida, Estado, MontoReserva, Finca(IdFinca, NombreFinca, Precio, Estado, Capacidad, Municipio(NombreMunicipio), Usuario(NumeroDocumento, NombreUsuario, ApellidoUsuario, Telefono)), Cliente:Usuario(NumeroDocumento, NombreUsuario, ApellidoUsuario, Telefono, Correo)';

const ESTADOS_CANCELADA = ['cancelada', 'cancelado', 'anulada', 'anulado'];

// ilike trata % y _ como comodines: se escapan para comparar de forma literal.
const literal = (texto: string) => texto.replace(/[\\%_]/g, '\\$&');

const toDateOrNull = (value?: Date | string): string | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
};

const aplanar = ({ Finca: f, Cliente: c, ...r }: any): Reserva => ({
    ...r,
    NombreFinca: f?.NombreFinca ?? null,
    PrecioFinca: f?.Precio ?? null,
    EstadoFinca: f?.Estado ?? null,
    Capacidad: f?.Capacidad ?? null,
    NombreMunicipio: f?.Municipio?.NombreMunicipio ?? null,
    IdPropietario: f?.Usuario?.NumeroDocumento ?? null,
    NombrePropietario: f?.Usuario?.NombreUsuario ?? null,
    ApellidoPropietario: f?.Usuario?.ApellidoUsuario ?? null,
    TelefonoPropietario: f?.Usuario?.Telefono ?? null,
    NumeroDocumentoCliente: c?.NumeroDocumento ?? null,
    NombreCliente: c?.NombreUsuario ?? null,
    ApellidoCliente: c?.ApellidoUsuario ?? null,
    TelefonoCliente: c?.Telefono ?? null,
    CorreoCliente: c?.Correo ?? null
});

/**
 * Lista las reservas, con soporte opcional para filtros dinámicos (correo, documento, finca, estado).
 */
export const listar = async (filtros?: ReservaFiltros): Promise<Reserva[]> => {
    let consulta = getSupabase().from('Reserva').select(SELECT_RESERVA);

    const documento = filtros?.NumeroDocumento ?? filtros?.numeroDocumento ?? filtros?.documento ?? filtros?.IdUsuario ?? filtros?.idUsuario;
    if (documento) consulta = consulta.eq('NumeroDocumentoUsuario', Number(documento));

    const fincaId = filtros?.IdFinca ?? filtros?.idFinca ?? filtros?.fincaId;
    if (fincaId) consulta = consulta.eq('IdFinca', Number(fincaId));

    const estado = filtros?.Estado ?? filtros?.estado;
    if (estado) consulta = consulta.ilike('Estado', literal(estado.trim()));

    const filas: any[] = await unwrap(consulta.order('FechaReserva', { ascending: false }));
    let reservas = filas.map(aplanar);

    const correo = (filtros?.Correo ?? filtros?.correo)?.trim().toLowerCase();
    if (correo) reservas = reservas.filter(r => String(r.CorreoCliente ?? '').toLowerCase() === correo);
    return reservas;
};

/**
 * Inserta una nueva reserva y retorna el IdReserva generado.
 */
export const insertar = async (reserva: Reserva): Promise<number> => {
    const ahora = new Date().toISOString();
    const fila = await unwrapOne(
        getSupabase().from('Reserva').insert({
            IdFinca: reserva.IdFinca,
            NumeroDocumentoUsuario: reserva.NumeroDocumentoUsuario || null,
            FechaReserva: toDateOrNull(reserva.FechaReserva) ?? ahora,
            FechaEntrada: toDateOrNull(reserva.FechaEntrada) ?? ahora,
            FechaSalida: toDateOrNull(reserva.FechaSalida) ?? ahora,
            MontoReserva: reserva.MontoReserva,
            Estado: reserva.Estado ?? 'Pendiente'
        }).select('IdReserva').single()
    );
    return Number(fila.IdReserva);
};

/**
 * Actualiza una reserva existente.
 */
export const actualizar = async (reserva: Reserva): Promise<void> => {
    await unwrap(
        getSupabase().from('Reserva').update({
            IdFinca: reserva.IdFinca,
            NumeroDocumentoUsuario: reserva.NumeroDocumentoUsuario || null,
            FechaReserva: toDateOrNull(reserva.FechaReserva),
            FechaEntrada: toDateOrNull(reserva.FechaEntrada),
            FechaSalida: toDateOrNull(reserva.FechaSalida),
            Estado: reserva.Estado ?? 'Pendiente',
            MontoReserva: reserva.MontoReserva
        }).eq('IdReserva', reserva.IdReserva)
    );
};

/**
 * Elimina una reserva por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Reserva').delete().eq('IdReserva', id));
};

/**
 * Busca una reserva específica por su ID.
 */
export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    const fila = await unwrap(getSupabase().from('Reserva').select(SELECT_RESERVA).eq('IdReserva', id).maybeSingle());
    return fila ? aplanar(fila) : null;
};

/**
 * Lista las reservas de un usuario por su número de documento.
 */
export const listarPorUsuario = async (numeroDocumento: number): Promise<Reserva[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Reserva').select(SELECT_RESERVA)
            .eq('NumeroDocumentoUsuario', numeroDocumento)
            .order('FechaReserva', { ascending: false })
    );
    return filas.map(aplanar);
};

/**
 * Reservas hechas sobre las fincas de un propietario.
 */
export const listarPorPropietario = async (numeroDocumento: number): Promise<Reserva[]> => {
    const fincas: any[] = await unwrap(getSupabase().from('Finca').select('IdFinca').eq('NumeroDocumentoUsuario', numeroDocumento));
    if (fincas.length === 0) return [];
    const filas: any[] = await unwrap(
        getSupabase().from('Reserva').select(SELECT_RESERVA)
            .in('IdFinca', fincas.map((f) => f.IdFinca))
            .order('FechaReserva', { ascending: false })
    );
    return filas.map(aplanar);
};

/**
 * Cuenta reservas no canceladas de la finca que se solapan con [entrada, salida).
 */
export const contarSolapes = async (idFinca: number, entrada: Date, salida: Date, excluirId = 0): Promise<number> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Reserva').select('IdReserva, Estado')
            .eq('IdFinca', idFinca)
            .neq('IdReserva', excluirId)
            .lt('FechaEntrada', salida.toISOString())
            .gt('FechaSalida', entrada.toISOString())
    );
    return filas.filter(r => !ESTADOS_CANCELADA.includes(String(r.Estado ?? '').toLowerCase())).length;
};

/**
 * Precio por noche de una finca (null si no existe).
 */
export const precioFinca = async (idFinca: number): Promise<number | null> => {
    const fila: any = await unwrap(getSupabase().from('Finca').select('Precio').eq('IdFinca', idFinca).maybeSingle());
    return fila ? Number(fila.Precio) : null;
};

/**
 * Estado de la finca (null si no existe).
 */
export const estadoFinca = async (idFinca: number): Promise<string | null> => {
    const fila: any = await unwrap(getSupabase().from('Finca').select('Estado').eq('IdFinca', idFinca).maybeSingle());
    return fila ? String(fila.Estado ?? '') : null;
};

/**
 * Fechas ocupadas de una finca (reservas no canceladas), sin datos personales.
 */
export const ocupadasPorFinca = async (idFinca: number): Promise<{ IdFinca: number; FechaEntrada: string; FechaSalida: string }[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Reserva').select('IdFinca, FechaEntrada, FechaSalida, Estado').eq('IdFinca', idFinca)
    );
    return filas
        .filter(r => !ESTADOS_CANCELADA.includes(String(r.Estado ?? '').toLowerCase()))
        .map(r => ({ IdFinca: r.IdFinca, FechaEntrada: r.FechaEntrada, FechaSalida: r.FechaSalida }));
};

/**
 * Capacidad de una finca (null si no existe).
 */
export const capacidadFinca = async (idFinca: number): Promise<number | null> => {
    const fila: any = await unwrap(getSupabase().from('Finca').select('Capacidad').eq('IdFinca', idFinca).maybeSingle());
    return fila ? Number(fila.Capacidad) : null;
};

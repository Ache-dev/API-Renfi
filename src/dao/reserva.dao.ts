import { query } from "../conexion/connection";
import { Reserva, ReservaFiltros } from "../models/reserva";

const toDateOrNull = (value?: Date | string): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

/**
 * Lista las reservas, con soporte opcional para filtros dinámicos (correo, documento, finca, estado).
 */
export const listar = async (filtros?: ReservaFiltros): Promise<Reserva[]> => {
    const hasFilters = filtros && Object.values(filtros).some(v => v !== undefined && v !== null && v !== '');
    if (!hasFilters) {
        const rs = await query<Reserva>('SELECT * FROM public."SP_ListarReservas"()');
        return rs.rows;
    }

    let queryText = `
        SELECT 
            R."IdReserva",
            R."FechaReserva",
            R."FechaEntrada",
            R."FechaSalida",
            R."MontoReserva",
            R."Estado",
            R."NumeroDocumentoUsuario",
            F."IdFinca",
            F."NombreFinca",
            F."Precio" AS "PrecioFinca",
            F."Estado" AS "EstadoFinca",
            M."NombreMunicipio",
            PropietarioFinca."NumeroDocumento" AS "IdPropietario",
            PropietarioFinca."NombreUsuario" AS "NombrePropietario",
            PropietarioFinca."ApellidoUsuario" AS "ApellidoPropietario",
            Cliente."NumeroDocumento" AS "NumeroDocumentoCliente",
            Cliente."NombreUsuario" AS "NombreCliente",
            Cliente."ApellidoUsuario" AS "ApellidoCliente",
            Cliente."Telefono" AS "TelefonoCliente",
            Cliente."Correo" AS "CorreoCliente"
        FROM public."Reserva" R
        INNER JOIN public."Finca" F ON R."IdFinca" = F."IdFinca"
        INNER JOIN public."Municipio" M ON F."IdMunicipio" = M."IdMunicipio"
        INNER JOIN public."Usuario" PropietarioFinca ON F."NumeroDocumentoUsuario" = PropietarioFinca."NumeroDocumento"
        LEFT JOIN public."Usuario" Cliente ON R."NumeroDocumentoUsuario" = Cliente."NumeroDocumento"
        WHERE 1=1
    `;

    const params: any[] = [];

    const documento = filtros.NumeroDocumento ?? filtros.numeroDocumento ?? filtros.documento ?? filtros.IdUsuario ?? filtros.idUsuario;
    if (documento) {
        params.push(Number(documento));
        queryText += ` AND R."NumeroDocumentoUsuario" = $${params.length}`;
    }

    const correo = filtros.Correo ?? filtros.correo;
    if (correo) {
        params.push(correo.trim());
        queryText += ` AND LOWER(Cliente."Correo") = LOWER($${params.length})`;
    }

    const fincaId = filtros.IdFinca ?? filtros.idFinca ?? filtros.fincaId;
    if (fincaId) {
        params.push(Number(fincaId));
        queryText += ` AND R."IdFinca" = $${params.length}`;
    }

    const estado = filtros.Estado ?? filtros.estado;
    if (estado) {
        params.push(estado.trim());
        queryText += ` AND LOWER(R."Estado") = LOWER($${params.length})`;
    }

    queryText += ' ORDER BY R."FechaReserva" DESC';

    const rs = await query<Reserva>(queryText, params);
    return rs.rows;
};

/**
 * Inserta una nueva reserva y retorna el IdReserva generado.
 */
export const insertar = async (reserva: Reserva): Promise<number> => {
    const fechaReserva = toDateOrNull(reserva.FechaReserva) ?? new Date();
    const fechaEntrada = toDateOrNull(reserva.FechaEntrada) ?? new Date();
    const fechaSalida = toDateOrNull(reserva.FechaSalida) ?? new Date();

    const rs = await query<{ IdReserva: number }>(
        'SELECT public."SP_RegistrarReserva"($1, $2, $3, $4, $5, $6, $7) AS "IdReserva"',
        [
            reserva.IdFinca,
            reserva.NumeroDocumentoUsuario || null,
            fechaReserva,
            fechaEntrada,
            fechaSalida,
            reserva.MontoReserva,
            reserva.Estado ?? 'Pendiente'
        ]
    );

    const idReserva = rs.rows[0]?.IdReserva;
    if (!idReserva) {
        throw new Error('No se pudo obtener el ID de la reserva creada');
    }
    return Number(idReserva);
};

/**
 * Actualiza una reserva existente.
 */
export const actualizar = async (reserva: Reserva): Promise<void> => {
    const fechaReserva = toDateOrNull(reserva.FechaReserva);
    const fechaEntrada = toDateOrNull(reserva.FechaEntrada);
    const fechaSalida = toDateOrNull(reserva.FechaSalida);

    await query(
        'SELECT public."SP_ActualizarReserva"($1, $2, $3, $4, $5, $6, $7, $8)',
        [
            reserva.IdReserva,
            reserva.IdFinca,
            reserva.NumeroDocumentoUsuario || null,
            fechaReserva,
            fechaEntrada,
            fechaSalida,
            reserva.Estado ?? 'Pendiente',
            reserva.MontoReserva
        ]
    );
};

/**
 * Elimina una reserva por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."Reserva" WHERE "IdReserva" = $1', [id]);
};

/**
 * Busca una reserva específica por su ID.
 */
export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    const rs = await query<Reserva>(
        `SELECT 
            R."IdReserva", 
            R."IdFinca", 
            R."NumeroDocumentoUsuario", 
            R."FechaReserva", 
            R."FechaEntrada", 
            R."FechaSalida", 
            R."Estado", 
            R."MontoReserva", 
            F."NombreFinca", 
            F."Precio" AS "PrecioFinca", 
            F."Estado" AS "EstadoFinca", 
            M."NombreMunicipio", 
            U."NumeroDocumento" AS "IdPropietario", 
            U."NombreUsuario" AS "NombrePropietario", 
            U."ApellidoUsuario" AS "ApellidoPropietario", 
            C."NombreUsuario" AS "NombreCliente", 
            C."ApellidoUsuario" AS "ApellidoCliente", 
            C."Telefono" AS "TelefonoCliente",
            C."Correo" AS "CorreoCliente"
        FROM public."Reserva" R 
        LEFT JOIN public."Finca" F ON R."IdFinca" = F."IdFinca" 
        LEFT JOIN public."Municipio" M ON F."IdMunicipio" = M."IdMunicipio" 
        LEFT JOIN public."Usuario" U ON F."NumeroDocumentoUsuario" = U."NumeroDocumento" 
        LEFT JOIN public."Usuario" C ON R."NumeroDocumentoUsuario" = C."NumeroDocumento" 
        WHERE R."IdReserva" = $1`,
        [id]
    );
    return rs.rows[0] || null;
};

/**
 * Lista las reservas de un usuario por su número de documento.
 */
export const listarPorUsuario = async (numeroDocumento: number): Promise<Reserva[]> => {
    const rs = await query<Reserva>(
        'SELECT * FROM public."SP_ListarReservasPorUsuario"($1)',
        [numeroDocumento]
    );
    return rs.rows;
};

/**
 * Cuenta reservas no canceladas de la finca que se solapan con [entrada, salida).
 */
export const contarSolapes = async (idFinca: number, entrada: Date, salida: Date, excluirId = 0): Promise<number> => {
    const rs = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM public."Reserva"
         WHERE "IdFinca" = $1 AND "IdReserva" <> $4 AND LOWER(COALESCE("Estado",'')) NOT IN ('cancelada','cancelado','anulada','anulado')
           AND "FechaEntrada" < $3::timestamp AND "FechaSalida" > $2::timestamp`,
        [idFinca, entrada, salida, excluirId]
    );
    return rs.rows[0]?.n ?? 0;
};

/**
 * Capacidad de una finca (null si no existe).
 */
export const capacidadFinca = async (idFinca: number): Promise<number | null> => {
    const rs = await query<{ Capacidad: number }>('SELECT "Capacidad" FROM public."Finca" WHERE "IdFinca" = $1', [idFinca]);
    return rs.rows[0] ? Number(rs.rows[0].Capacidad) : null;
};

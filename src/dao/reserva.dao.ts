import getConnection from "../conexion/connection";
import { Reserva, ReservaFiltros } from "../models/reserva";
import sql from 'mssql';

const toDateOrNull = (value?: Date | string): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

/**
 * Lista las reservas, con soporte opcional para filtros dinámicos (correo, documento, finca, estado).
 */
export const listar = async (filtros?: ReservaFiltros): Promise<Reserva[]> => {
    try {
        const pool = await getConnection();

        // Si no hay filtros aplicados, ejecutar el procedimiento almacenado estándar
        const hasFilters = filtros && Object.values(filtros).some(v => v !== undefined && v !== null && v !== '');
        if (!hasFilters) {
            const rs = await pool.request().execute('SP_ListarReservas');
            return (rs?.recordset as Reserva[]) ?? [];
        }

        // Construir consulta filtrada parametrizada
        let query = `
            SELECT 
                R.IdReserva,
                R.FechaReserva,
                R.FechaEntrada,
                R.FechaSalida,
                R.MontoReserva,
                R.Estado,
                R.NumeroDocumentoUsuario,
                F.IdFinca,
                F.NombreFinca,
                F.Precio AS PrecioFinca,
                F.Estado AS EstadoFinca,
                M.NombreMunicipio,
                PropietarioFinca.NumeroDocumento AS IdPropietario,
                PropietarioFinca.NombreUsuario AS NombrePropietario,
                PropietarioFinca.ApellidoUsuario AS ApellidoPropietario,
                Cliente.NumeroDocumento AS NumeroDocumentoCliente,
                Cliente.NombreUsuario AS NombreCliente,
                Cliente.ApellidoUsuario AS ApellidoCliente,
                Cliente.Telefono AS TelefonoCliente,
                Cliente.Correo AS CorreoCliente
            FROM Reserva R
            INNER JOIN Finca F ON R.IdFinca = F.IdFinca
            INNER JOIN Municipio M ON F.IdMunicipio = M.IdMunicipio
            INNER JOIN Usuario PropietarioFinca ON F.NumeroDocumentoUsuario = PropietarioFinca.NumeroDocumento
            LEFT JOIN Usuario Cliente ON R.NumeroDocumentoUsuario = Cliente.NumeroDocumento
            WHERE 1=1
        `;

        const request = pool.request();

        const documento = filtros.NumeroDocumento ?? filtros.numeroDocumento ?? filtros.documento ?? filtros.IdUsuario ?? filtros.idUsuario;
        if (documento) {
            query += ' AND R.NumeroDocumentoUsuario = @documento';
            request.input('documento', sql.Int, Number(documento));
        }

        const correo = filtros.Correo ?? filtros.correo;
        if (correo) {
            query += ' AND LOWER(Cliente.Correo) = LOWER(@correo)';
            request.input('correo', sql.VarChar(500), correo.trim());
        }

        const fincaId = filtros.IdFinca ?? filtros.idFinca ?? filtros.fincaId;
        if (fincaId) {
            query += ' AND R.IdFinca = @fincaId';
            request.input('fincaId', sql.Int, Number(fincaId));
        }

        const estado = filtros.Estado ?? filtros.estado;
        if (estado) {
            query += ' AND LOWER(R.Estado) = LOWER(@estado)';
            request.input('estado', sql.VarChar(150), estado.trim());
        }

        query += ' ORDER BY R.FechaReserva DESC';

        const rs = await request.query(query);
        return (rs?.recordset as Reserva[]) ?? [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta una nueva reserva y retorna el IdReserva generado.
 */
export const insertar = async (reserva: Reserva): Promise<number> => {
    try {
        const pool = await getConnection();

        const fechaReserva = toDateOrNull(reserva.FechaReserva) ?? new Date();
        const fechaEntrada = toDateOrNull(reserva.FechaEntrada) ?? new Date();
        const fechaSalida = toDateOrNull(reserva.FechaSalida) ?? new Date();

        const result = await pool.request()
            .input('IdFinca', sql.Int, reserva.IdFinca)
            .input('NumeroDocumentoUsuario', sql.Int, reserva.NumeroDocumentoUsuario || null)
            .input('FechaReserva', sql.DateTime, fechaReserva)
            .input('FechaEntrada', sql.DateTime, fechaEntrada)
            .input('FechaSalida', sql.DateTime, fechaSalida)
            .input('MontoReserva', sql.Int, reserva.MontoReserva)
            .input('Estado', sql.VarChar(150), reserva.Estado ?? 'Activa')
            .query(`
                INSERT INTO Reserva (IdFinca, NumeroDocumentoUsuario, FechaReserva, FechaEntrada, FechaSalida, MontoReserva, Estado)
                VALUES (@IdFinca, @NumeroDocumentoUsuario, @FechaReserva, @FechaEntrada, @FechaSalida, @MontoReserva, @Estado);
                
                SELECT SCOPE_IDENTITY() AS IdReserva;
            `);

        const idReserva = result?.recordset?.[0]?.IdReserva;
        if (!idReserva) {
            throw new Error('No se pudo obtener el ID de la reserva creada');
        }
        return Number(idReserva);
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza una reserva existente.
 */
export const actualizar = async (reserva: Reserva): Promise<void> => {
    try {
        const pool = await getConnection();

        const fechaReserva = toDateOrNull(reserva.FechaReserva);
        const fechaEntrada = toDateOrNull(reserva.FechaEntrada);
        const fechaSalida = toDateOrNull(reserva.FechaSalida);

        await pool.request()
            .input('IdReserva', sql.Int, reserva.IdReserva)
            .input('IdFinca', sql.Int, reserva.IdFinca)
            .input('NumeroDocumentoUsuario', sql.Int, reserva.NumeroDocumentoUsuario || null)
            .input('FechaReserva', sql.DateTime, fechaReserva)
            .input('FechaEntrada', sql.DateTime, fechaEntrada)
            .input('FechaSalida', sql.DateTime, fechaSalida)
            .input('Estado', sql.VarChar(150), reserva.Estado ?? 'Activa')
            .input('MontoReserva', sql.Int, reserva.MontoReserva)
            .execute('SP_ActualizarReserva');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina una reserva por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdReserva', sql.Int, id)
            .query('DELETE FROM Reserva WHERE IdReserva = @IdReserva');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca una reserva específica por su ID.
 */
export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdReserva', sql.Int, id)
            .query(`
                SELECT 
                    R.IdReserva, 
                    R.IdFinca, 
                    R.NumeroDocumentoUsuario, 
                    R.FechaReserva, 
                    R.FechaEntrada, 
                    R.FechaSalida, 
                    R.Estado, 
                    R.MontoReserva, 
                    F.NombreFinca, 
                    F.Precio AS PrecioFinca, 
                    F.Estado AS EstadoFinca, 
                    M.NombreMunicipio, 
                    U.NumeroDocumento AS IdPropietario, 
                    U.NombreUsuario AS NombrePropietario, 
                    U.ApellidoUsuario AS ApellidoPropietario, 
                    C.NombreUsuario AS NombreCliente, 
                    C.ApellidoUsuario AS ApellidoCliente, 
                    C.Telefono AS TelefonoCliente,
                    C.Correo AS CorreoCliente
                FROM Reserva R 
                LEFT JOIN Finca F ON R.IdFinca = F.IdFinca 
                LEFT JOIN Municipio M ON F.IdMunicipio = M.IdMunicipio 
                LEFT JOIN Usuario U ON F.NumeroDocumentoUsuario = U.NumeroDocumento 
                LEFT JOIN Usuario C ON R.NumeroDocumentoUsuario = C.NumeroDocumento 
                WHERE R.IdReserva = @IdReserva
            `);
        return rs?.recordset?.[0] ?? null;
    } catch (error) {
        throw error;
    }
};

/**
 * Lista las reservas de un usuario por su número de documento.
 */
export const listarPorUsuario = async (numeroDocumento: number): Promise<Reserva[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('NumeroDocumentoUsuario', sql.Int, numeroDocumento)
            .execute('SP_ListarReservasPorUsuario');
        return (rs?.recordset as Reserva[]) ?? [];
    } catch (error) {
        throw error;
    }
};
};
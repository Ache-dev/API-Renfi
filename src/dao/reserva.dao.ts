import getConnection from "../conexion/connection";
import { Reserva } from "../models/reserva";
import sql from 'mssql';

const toDateOrNull = (value?: Date | string): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

export const listar = async (): Promise<Reserva[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarReservas');
        return (rs?.recordset as Reserva[]) ?? [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (reserva: Reserva): Promise<number> => {
    try {
        const pool = await getConnection();

        const fechaReserva = toDateOrNull(reserva.FechaReserva) ?? new Date();
        const fechaEntrada = toDateOrNull(reserva.FechaEntrada);
        const fechaSalida = toDateOrNull(reserva.FechaSalida);

        const result = await pool.request()
            .input('IdFinca', sql.Int, reserva.IdFinca)
            .input('FechaReserva', sql.DateTime, fechaReserva)
            .input('FechaEntrada', sql.DateTime, fechaEntrada)
            .input('FechaSalida', sql.DateTime, fechaSalida)
            .input('MontoReserva', sql.Int, reserva.MontoReserva)
            .input('Estado', sql.VarChar(150), reserva.Estado)
            .query(`
                DECLARE @IdReserva INT;
                
                INSERT INTO Reserva (IdFinca, FechaReserva, FechaEntrada, FechaSalida, MontoReserva, Estado)
                VALUES (@IdFinca, @FechaReserva, @FechaEntrada, @FechaSalida, @MontoReserva, @Estado);
                
                SET @IdReserva = SCOPE_IDENTITY();
                SELECT @IdReserva AS IdReserva;
            `);

        const idReserva = result?.recordset?.[0]?.IdReserva;
        if (!idReserva) throw new Error('No se pudo obtener el ID de la reserva creada');
        return idReserva;
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (reserva: Reserva): Promise<void> => {
    try {
        const pool = await getConnection();

        const fechaReserva = toDateOrNull(reserva.FechaReserva);
        const fechaEntrada = toDateOrNull(reserva.FechaEntrada);
        const fechaSalida = toDateOrNull(reserva.FechaSalida);

        await pool.request()
            .input('IdReserva', sql.Int, reserva.IdReserva)
            .input('IdFinca', sql.Int, reserva.IdFinca)
            .input('FechaReserva', sql.DateTime, fechaReserva)
            .input('FechaEntrada', sql.DateTime, fechaEntrada)
            .input('FechaSalida', sql.DateTime, fechaSalida)
            .input('Estado', sql.VarChar(150), reserva.Estado)
            .input('MontoReserva', sql.Int, reserva.MontoReserva)
            .execute('SP_ActualizarReserva');
    } catch (error) {
        throw error;
    }
};

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

export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdReserva', sql.Int, id)
            .query(`
                SELECT 
                    R.IdReserva, 
                    R.IdFinca, 
                    R.FechaReserva, 
                    R.FechaEntrada, 
                    R.FechaSalida, 
                    R.Estado, 
                    R.MontoReserva, 
                    F.NombreFinca, 
                    F.Precio, 
                    F.Estado AS EstadoFinca,
                    M.NombreMunicipio,
                    U.NumeroDocumento AS IdPropietario,
                    U.NombreUsuario AS NombrePropietario,
                    U.ApellidoUsuario AS ApellidoPropietario
                FROM Reserva R 
                LEFT JOIN Finca F ON R.IdFinca = F.IdFinca 
                LEFT JOIN Municipio M ON F.IdMunicipio = M.IdMunicipio
                LEFT JOIN Usuario U ON F.NumeroDocumentoUsuario = U.NumeroDocumento 
                WHERE R.IdReserva = @IdReserva
            `);
        return rs?.recordset?.[0] ?? null;
    } catch (error) {
        throw error;
    }
};
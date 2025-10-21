import getConnection from "../conexion/connection";
import { Reserva } from "../models/reserva";

export const listar = async (): Promise<Reserva[]> => {
    try {
        const tsql = "SELECT * FROM Reserva";
        const pool = await getConnection();
        const rs = await pool.query<Reserva>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (reserva: Reserva): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdReserva', reserva.IdReserva)
            .input('IdFinca', reserva.IdFinca)
            .input('FechaReserva', reserva.FechaReserva)
            .input('FechaEntrada', reserva.FechaEntrada)
            .input('FechaSalida', reserva.FechaSalida)
            .input('Estado', reserva.Estado)
            .input('MontoReserva', reserva.MontoReserva)
            .execute('sp_InsertarReserva');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdReserva', id)
            .query('DELETE FROM Reserva WHERE IdReserva = @IdReserva');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdReserva', id)
            .query('SELECT * FROM Reserva WHERE IdReserva = @IdReserva');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
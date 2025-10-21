import getConnection from "../conexion/connection";
import { Pago } from "../models/pago";

export const listar = async (): Promise<Pago[]> => {
    try {
        const tsql = "SELECT * FROM Pago";
        const pool = await getConnection();
        const rs = await pool.query<Pago>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (pago: Pago): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdPago', pago.IdPago)
            .input('IdFactura', pago.IdFactura)
            .input('Monto', pago.Monto)
            .input('FechaPago', pago.FechaPago)
            .input('EstadoPago', pago.EstadoPago)
            .input('IdMetodo', pago.IdMetodo)
            .execute('sp_InsertarPago');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdPago', id)
            .query('DELETE FROM Pago WHERE IdPago = @IdPago');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Pago | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdPago', id)
            .query('SELECT * FROM Pago WHERE IdPago = @IdPago');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
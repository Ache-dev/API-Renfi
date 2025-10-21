import getConnection from "../conexion/connection";
import { MetodoDePago } from "../models/metododepago";

export const listar = async (): Promise<MetodoDePago[]> => {
    try {
        const tsql = "SELECT * FROM MetodoDePago";
        const pool = await getConnection();
        const rs = await pool.query<MetodoDePago>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (metodo: MetodoDePago): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMetodo', metodo.IdMetodo)
            .input('Efectivo', metodo.Efectivo)
            .input('Tarjeta', metodo.Tarjeta)
            .input('PagoMixto', metodo.PagoMixto)
            .execute('sp_InsertarMetodoDePago');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMetodo', id)
            .query('DELETE FROM MetodoDePago WHERE IdMetodo = @IdMetodo');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdMetodo', id)
            .query('SELECT * FROM MetodoDePago WHERE IdMetodo = @IdMetodo');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
import getConnection from "../conexion/connection";
import { MetodoDePago } from "../models/metododepago";

export const listar = async (): Promise<MetodoDePago[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarMetodosDePago');
        if (rs && rs.recordset) {
            return rs.recordset as MetodoDePago[];
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
            .input('NombreMetodoDePago', metodo.NombreMetodoDePago)
            .input('PagoMixto', metodo.PagoMixto)
            .execute('SP_RegistrarMetodoDePago');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (metodo: MetodoDePago): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMetodoDePago', metodo.IdMetodoDePago)
            .input('NombreMetodoDePago', metodo.NombreMetodoDePago)
            .input('PagoMixto', metodo.PagoMixto)
            .execute('SP_ActualizarMetodoDePago');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMetodoDePago', id)
            .query('DELETE FROM MetodoDePago WHERE IdMetodoDePago = @IdMetodoDePago');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdMetodoDePago', id)
            .query('SELECT * FROM MetodoDePago WHERE IdMetodoDePago = @IdMetodoDePago');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as MetodoDePago;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
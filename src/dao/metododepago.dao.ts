import getConnection from "../conexion/connection";
import { MetodoDePago } from "../models/metododepago";
import sql from 'mssql';

/**
 * Lista todos los métodos de pago.
 */
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

/**
 * Inserta un método de pago y retorna el IdMetodoDePago generado.
 */
export const insertar = async (metodo: MetodoDePago): Promise<number> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('NombreMetodoDePago', sql.VarChar(150), metodo.NombreMetodoDePago)
            .input('PagoMixto', sql.Bit, metodo.PagoMixto ? 1 : 0)
            .query(`
                INSERT INTO MetodoDePago (NombreMetodoDePago, PagoMixto)
                VALUES (@NombreMetodoDePago, @PagoMixto);
                
                SELECT SCOPE_IDENTITY() AS IdMetodoDePago;
            `);

        const id = rs?.recordset?.[0]?.IdMetodoDePago;
        if (!id) {
            throw new Error('No se pudo obtener el identificador del método de pago creado.');
        }
        return Number(id);
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza un método de pago existente.
 */
export const actualizar = async (metodo: MetodoDePago): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMetodoDePago', sql.Int, metodo.IdMetodoDePago)
            .input('NombreMetodoDePago', sql.VarChar(150), metodo.NombreMetodoDePago)
            .input('PagoMixto', sql.Bit, metodo.PagoMixto ? 1 : 0)
            .execute('SP_ActualizarMetodoDePago');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un método de pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMetodoDePago', sql.Int, id)
            .query('DELETE FROM MetodoDePago WHERE IdMetodoDePago = @IdMetodoDePago');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca un método de pago por su ID.
 */
export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdMetodoDePago', sql.Int, id)
            .query('SELECT IdMetodoDePago, NombreMetodoDePago, PagoMixto FROM MetodoDePago WHERE IdMetodoDePago = @IdMetodoDePago');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as MetodoDePago;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
};
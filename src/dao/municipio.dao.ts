import getConnection from "../conexion/connection";
import { Municipio } from "../models/municipio";

export const listar = async (): Promise<Municipio[]> => {
    try {
        const tsql = "SELECT * FROM Municipio";
        const pool = await getConnection();
        const rs = await pool.query<Municipio>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (municipio: Municipio): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMunicipio', municipio.IdMunicipio)
            .input('NombreMunicipio', municipio.NombreMunicipio)
            .execute('sp_InsertarMunicipio');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMunicipio', id)
            .query('DELETE FROM Municipio WHERE IdMunicipio = @IdMunicipio');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Municipio | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdMunicipio', id)
            .query('SELECT * FROM Municipio WHERE IdMunicipio = @IdMunicipio');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
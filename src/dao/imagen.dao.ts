import getConnection from "../conexion/connection";
import { Imagen } from "../models/imagen";

export const listar = async (): Promise<Imagen[]> => {
    try {
        const tsql = "SELECT * FROM Imagen";
        const pool = await getConnection();
        const rs = await pool.query<Imagen>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (imagen: Imagen): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdImagen', imagen.IdImagen)
            .input('UrlImagen', imagen.UrlImagen)
            .input('IdFinca', imagen.IdFinca)
            .execute('sp_InsertarImagen');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdImagen', id)
            .query('DELETE FROM Imagen WHERE IdImagen = @IdImagen');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdImagen', id)
            .query('SELECT * FROM Imagen WHERE IdImagen = @IdImagen');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
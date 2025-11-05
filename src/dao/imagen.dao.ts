import getConnection from "../conexion/connection";
import { Imagen } from "../models/imagen";

export const listar = async (): Promise<Imagen[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarImagenes');
        if (rs && rs.recordset) {
            return rs.recordset as Imagen[];
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
            .input('UrlImagen', imagen.UrlImagen)
            .input('IdFinca', imagen.IdFinca)
            .execute('SP_RegistrarImagen');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (imagen: Imagen): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdImagen', imagen.IdImagen)
            .input('UrlImagen', imagen.UrlImagen)
            .input('IdFinca', imagen.IdFinca)
            .execute('SP_ActualizarImagen');
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
            .query('SELECT I.IdImagen, I.UrlImagen, I.IdFinca, F.NombreFinca FROM Imagen I LEFT JOIN Finca F ON I.IdFinca = F.IdFinca WHERE I.IdImagen = @IdImagen');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Imagen;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

// Buscar todas las imágenes por IdFinca
export const buscarPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFinca', idFinca)
            .query('SELECT I.IdImagen, I.UrlImagen, I.IdFinca, F.NombreFinca FROM Imagen I LEFT JOIN Finca F ON I.IdFinca = F.IdFinca WHERE I.IdFinca = @IdFinca');
        if (rs && rs.recordset) {
            return rs.recordset as Imagen[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};
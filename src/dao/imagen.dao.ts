import getConnection from "../conexion/connection";
import { Imagen } from "../models/imagen";
import sql from 'mssql';

/**
 * Lista todas las imágenes registradas.
 */
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

/**
 * Obtiene todas las imágenes asociadas a una finca específica.
 */
export const buscarPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFinca', sql.Int, idFinca)
            .query('SELECT IdImagen, UrlImagen, IdFinca FROM Imagen WHERE IdFinca = @IdFinca');
        return (rs?.recordset as Imagen[]) ?? [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta una nueva imagen y retorna el IdImagen generado.
 */
export const insertar = async (imagen: Imagen): Promise<number> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('UrlImagen', sql.VarChar(500), imagen.UrlImagen)
            .input('IdFinca', sql.Int, imagen.IdFinca)
            .query(`
                INSERT INTO Imagen (UrlImagen, IdFinca)
                VALUES (@UrlImagen, @IdFinca);
                
                SELECT SCOPE_IDENTITY() AS IdImagen;
            `);

        const idImagen = rs?.recordset?.[0]?.IdImagen;
        if (!idImagen) {
            throw new Error('No se pudo obtener el identificador de la imagen creada.');
        }
        return Number(idImagen);
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza una imagen existente.
 */
export const actualizar = async (imagen: Imagen): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdImagen', sql.Int, imagen.IdImagen)
            .input('UrlImagen', sql.VarChar(500), imagen.UrlImagen)
            .input('IdFinca', sql.Int, imagen.IdFinca)
            .execute('SP_ActualizarImagen');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina una imagen por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdImagen', sql.Int, id)
            .query('DELETE FROM Imagen WHERE IdImagen = @IdImagen');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdImagen', sql.Int, id)
            .query('SELECT I.IdImagen, I.UrlImagen, I.IdFinca, F.NombreFinca FROM Imagen I LEFT JOIN Finca F ON I.IdFinca = F.IdFinca WHERE I.IdImagen = @IdImagen');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Imagen;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
};
import { query } from "../conexion/connection";
import { Imagen } from "../models/imagen";

/**
 * Lista todas las imágenes registradas.
 */
export const listar = async (): Promise<Imagen[]> => {
    const rs = await query<Imagen>('SELECT * FROM public."SP_ListarImagenes"()');
    return rs.rows;
};

/**
 * Obtiene todas las imágenes asociadas a una finca específica.
 */
export const buscarPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    const rs = await query<Imagen>(
        'SELECT "IdImagen", "UrlImagen", "IdFinca" FROM public."Imagen" WHERE "IdFinca" = $1',
        [idFinca]
    );
    return rs.rows;
};

/**
 * Inserta una nueva imagen y retorna el IdImagen generado.
 */
export const insertar = async (imagen: Imagen): Promise<number> => {
    const rs = await query<{ IdImagen: number }>(
        'SELECT public."SP_RegistrarImagen"($1, $2) AS "IdImagen"',
        [imagen.UrlImagen, imagen.IdFinca]
    );

    const idImagen = rs.rows[0]?.IdImagen;
    if (!idImagen) {
        throw new Error('No se pudo obtener el identificador de la imagen creada.');
    }
    return Number(idImagen);
};

/**
 * Actualiza una imagen existente.
 */
export const actualizar = async (imagen: Imagen): Promise<void> => {
    await query(
        'SELECT public."SP_ActualizarImagen"($1, $2, $3)',
        [imagen.IdImagen, imagen.UrlImagen, imagen.IdFinca]
    );
};

/**
 * Elimina una imagen por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."Imagen" WHERE "IdImagen" = $1', [id]);
};

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    const rs = await query<Imagen>(
        `SELECT I."IdImagen", I."UrlImagen", I."IdFinca", F."NombreFinca" 
         FROM public."Imagen" I 
         LEFT JOIN public."Finca" F ON I."IdFinca" = F."IdFinca" 
         WHERE I."IdImagen" = $1`,
        [id]
    );
    return rs.rows[0] || null;
};
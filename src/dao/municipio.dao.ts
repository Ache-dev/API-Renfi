import { query } from "../conexion/connection";
import { Municipio, MunicipioReporte } from "../models/municipio";

export type { MunicipioReporte };

/**
 * Reporte: Municipios con mayor número de reservas.
 */
export const municipiosConMasReservas = async (): Promise<MunicipioReporte[]> => {
    const rs = await query<MunicipioReporte>('SELECT * FROM public."SP_MunicipiosConMasReservas"()');
    return rs.rows;
};

/**
 * Lista todos los municipios.
 */
export const listar = async (): Promise<Municipio[]> => {
    const rs = await query<Municipio>('SELECT * FROM public."SP_ListarMunicipios"()');
    return rs.rows;
};

/**
 * Inserta un nuevo municipio y retorna el IdMunicipio generado.
 */
export const insertar = async (municipio: Municipio): Promise<number> => {
    const rs = await query<{ IdMunicipio: number }>(
        'SELECT public."SP_RegistrarMunicipio"($1) AS "IdMunicipio"',
        [municipio.NombreMunicipio]
    );

    const id = rs.rows[0]?.IdMunicipio;
    if (!id) {
        throw new Error('No se pudo obtener el identificador del municipio creado.');
    }
    return Number(id);
};

/**
 * Actualiza un municipio existente.
 */
export const actualizar = async (municipio: Municipio): Promise<void> => {
    await query(
        'SELECT public."SP_ActualizarMunicipio"($1, $2)',
        [municipio.IdMunicipio, municipio.NombreMunicipio]
    );
};

/**
 * Elimina un municipio por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."Municipio" WHERE "IdMunicipio" = $1', [id]);
};

/**
 * Busca un municipio por su ID.
 */
export const buscarPorId = async (id: number): Promise<Municipio | null> => {
    const rs = await query<Municipio>(
        'SELECT "IdMunicipio", "NombreMunicipio" FROM public."Municipio" WHERE "IdMunicipio" = $1',
        [id]
    );
    return rs.rows[0] || null;
};
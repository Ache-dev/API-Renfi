import getConnection from "../conexion/connection";
import { Municipio, MunicipioReporte } from "../models/municipio";
import sql from 'mssql';

export type { MunicipioReporte };

/**
 * Reporte: Municipios con mayor número de reservas.
 */
export const municipiosConMasReservas = async (): Promise<MunicipioReporte[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_MunicipiosConMasReservas');
        return (rs?.recordset as MunicipioReporte[]) ?? [];
    } catch (error) {
        throw error;
    }
};

/**
 * Lista todos los municipios.
 */
export const listar = async (): Promise<Municipio[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarMunicipios');
        if (rs && rs.recordset) {
            return rs.recordset as Municipio[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta un nuevo municipio y retorna el IdMunicipio generado.
 */
export const insertar = async (municipio: Municipio): Promise<number> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('NombreMunicipio', sql.VarChar(150), municipio.NombreMunicipio)
            .query(`
                INSERT INTO Municipio (NombreMunicipio)
                VALUES (@NombreMunicipio);
                
                SELECT SCOPE_IDENTITY() AS IdMunicipio;
            `);

        const id = rs?.recordset?.[0]?.IdMunicipio;
        if (!id) {
            throw new Error('No se pudo obtener el identificador del municipio creado.');
        }
        return Number(id);
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza un municipio existente.
 */
export const actualizar = async (municipio: Municipio): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMunicipio', sql.Int, municipio.IdMunicipio)
            .input('NombreMunicipio', sql.VarChar(150), municipio.NombreMunicipio)
            .execute('SP_ActualizarMunicipio');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un municipio por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMunicipio', sql.Int, id)
            .query('DELETE FROM Municipio WHERE IdMunicipio = @IdMunicipio');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca un municipio por su ID.
 */
export const buscarPorId = async (id: number): Promise<Municipio | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdMunicipio', sql.Int, id)
            .query('SELECT IdMunicipio, NombreMunicipio FROM Municipio WHERE IdMunicipio = @IdMunicipio');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Municipio;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
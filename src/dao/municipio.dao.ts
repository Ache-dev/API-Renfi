import getConnection from "../conexion/connection";
import { Municipio } from "../models/municipio";
// Reporte: Municipios con más reservas
export interface MunicipioReservas {
    NombreMunicipio: string;
    TotalReservas: number;
}

export const municipiosConMasReservas = async (): Promise<MunicipioReservas[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_MunicipiosConMasReservas');
        return rs.recordset as MunicipioReservas[];
    } catch (error) {
        throw error;
    }
};

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

export const insertar = async (municipio: Municipio): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('NombreMunicipio', municipio.NombreMunicipio)
            .execute('SP_RegistrarMunicipio');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (municipio: Municipio): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMunicipio', municipio.IdMunicipio)
            .input('NombreMunicipio', municipio.NombreMunicipio)
            .execute('SP_ActualizarMunicipio');
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
            return rs.recordset[0] as Municipio;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
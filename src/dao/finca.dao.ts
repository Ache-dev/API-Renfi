import getConnection from "../conexion/connection";
import { Finca } from "../models/finca";

export const listar = async (): Promise<Finca[]> => {
    try {
        const tsql = "SELECT * FROM Finca";
        const pool = await getConnection();
        const rs = await pool.query<Finca>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (finca: Finca): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFinca', finca.IdFinca)
            .input('IdMunicipio', finca.IdMunicipio)
            .input('IdImagen', finca.IdImagen)
            .input('NombreFinca', finca.NombreFinca)
            .input('Direccion', finca.Direccion)
            .input('InformacionAdicional', finca.InformacionAdicional)
            .input('Capacidad', finca.Capacidad)
            .input('Precio', finca.Precio)
            .input('Estado', finca.Estado)
            .input('Calificacion', finca.Calificacion)
            .input('UsuarioId', finca.UsuarioId)
            .execute('sp_InsertarFinca');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFinca', id)
            .query('DELETE FROM Finca WHERE IdFinca = @IdFinca');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Finca | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFinca', id)
            .query('SELECT * FROM Finca WHERE IdFinca = @IdFinca');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
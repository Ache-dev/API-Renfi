import getConnection from "../conexion/connection";
import { Rol } from "../models/rol";

export const listar = async (): Promise<Rol[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().query('SELECT * FROM Rol');
        if (rs && rs.recordset) {
            return rs.recordset as Rol[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (rol: Rol): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('NombreRol', rol.NombreRol)
            .execute('SP_InsertarRol');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (rol: Rol): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdRol', rol.IdRol)
            .input('NombreRol', rol.NombreRol)
            .execute('SP_ActualizarRol');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdRol', id)
            .execute('SP_EliminarRol');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Rol | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdRol', id)
            .query('SELECT * FROM Rol WHERE IdRol = @IdRol');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Rol;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

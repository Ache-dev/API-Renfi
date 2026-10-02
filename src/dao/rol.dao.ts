import getConnection from "../conexion/connection";
import { Rol } from "../models/rol";
import sql from 'mssql';

/**
 * Lista todos los roles registrados.
 */
export const listar = async (): Promise<Rol[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarRol');
        if (rs && rs.recordset) {
            return rs.recordset as Rol[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta un nuevo rol y retorna el IdRol generado.
 */
export const insertar = async (rol: Rol): Promise<number> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('NombreRol', sql.VarChar(300), rol.NombreRol)
            .query(`
                INSERT INTO Rol (NombreRol)
                VALUES (@NombreRol);
                
                SELECT SCOPE_IDENTITY() AS IdRol;
            `);

        const id = rs?.recordset?.[0]?.IdRol;
        if (!id) {
            throw new Error('No se pudo obtener el identificador del rol creado.');
        }
        return Number(id);
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza un rol existente.
 */
export const actualizar = async (rol: Rol): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdRol', sql.Int, rol.IdRol)
            .input('NombreRol', sql.VarChar(300), rol.NombreRol)
            .execute('SP_ActualizarRol');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un rol por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdRol', sql.Int, id)
            .execute('SP_EliminarRol');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca un rol por su ID.
 */
export const buscarPorId = async (id: number): Promise<Rol | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdRol', sql.Int, id)
            .query('SELECT IdRol, NombreRol FROM Rol WHERE IdRol = @IdRol');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Rol;
        }
        return null;
    } catch (error) {
        throw error;
    }
};


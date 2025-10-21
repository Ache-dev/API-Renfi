import getConnection from "../conexion/connection";
import { Usuario } from "../models/usuario";

export const listar = async (): Promise<Usuario[]> => {
    try {
        const tsql = "SELECT * FROM Usuario";
        const pool = await getConnection();
        const rs = await pool.query<Usuario>(tsql);
        if (rs != undefined) {
            return rs.recordset;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (usuario: Usuario): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdUsuario', usuario.IdUsuario)
            .input('NombreUsuario', usuario.NombreUsuario)
            .input('ApellidoUsuario', usuario.ApellidoUsuario)
            .input('Telefono', usuario.Telefono)
            .input('Correo', usuario.Correo)
            .input('Contraseña', usuario.Contraseña)
            .input('Rol', usuario.Rol)
            .execute('sp_InsertarUsuario');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdUsuario', id)
            .query('DELETE FROM Usuario WHERE IdUsuario = @IdUsuario');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Usuario | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdUsuario', id)
            .query('SELECT * FROM Usuario WHERE IdUsuario = @IdUsuario');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0];
        }
        return null;
    } catch (error) {
        throw error;
    }
};
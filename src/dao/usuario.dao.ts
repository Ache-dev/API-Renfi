import getConnection from "../conexion/connection";
import { Usuario } from "../models/usuario";

export const listar = async (): Promise<Usuario[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarUsuarios');
        if (rs && rs.recordset) {
            return rs.recordset as Usuario[];
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
            .input('IdRol', usuario.IdRol)
            .input('NombreUsuario', usuario.NombreUsuario)
            .input('ApellidoUsuario', usuario.ApellidoUsuario)
            .input('Telefono', usuario.Telefono)
            .input('Contrasena', usuario.Contrasena)
            .input('Correo', usuario.Correo)
            .input('Estado', usuario.Estado)
            .execute('SP_RegistrarUsuario');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (usuario: Usuario): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('NumeroDocumento', usuario.NumeroDocumento)
            .input('IdRol', usuario.IdRol)
            .input('NombreUsuario', usuario.NombreUsuario)
            .input('ApellidoUsuario', usuario.ApellidoUsuario)
            .input('Telefono', usuario.Telefono)
            .input('Contrasena', usuario.Contrasena)
            .input('Estado', usuario.Estado)
            .execute('SP_ActualizarUsuario');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (numeroDocumento: number): Promise<void> => {
    try {
        const pool = await getConnection();
        // La base de datos tiene un TRIGGER INSTEAD OF DELETE que marcará el usuario como 'Suspendido'
        await pool.request()
            .input('NumeroDocumento', numeroDocumento)
            .query('DELETE FROM Usuario WHERE NumeroDocumento = @NumeroDocumento');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (numeroDocumento: number): Promise<Usuario | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('NumeroDocumento', numeroDocumento)
            .query('SELECT U.NumeroDocumento, U.IdRol, U.NombreUsuario, U.ApellidoUsuario, U.Telefono, U.Contrasena, U.Estado, R.NombreRol FROM Usuario U LEFT JOIN Rol R ON U.IdRol = R.IdRol WHERE U.NumeroDocumento = @NumeroDocumento');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Usuario;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

export const login = async (correo: string, contrasena: string): Promise<Usuario | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('Correo', correo)
            .input('Contrasena', contrasena)
            .execute('SP_IniciarSesion');
        
        if (rs && rs.recordset && rs.recordset.length > 0) {
            const usuario = rs.recordset[0] as Usuario;
            return usuario;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
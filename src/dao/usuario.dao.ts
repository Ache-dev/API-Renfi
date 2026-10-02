import getConnection from "../conexion/connection";
import { Usuario } from "../models/usuario";
import sql from 'mssql';

/**
 * Obtiene la lista de todos los usuarios registrados.
 */
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

/**
 * Inserta un nuevo usuario y retorna el NumeroDocumento generado (SCOPE_IDENTITY).
 */
export const insertar = async (usuario: Usuario): Promise<number> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdRol', sql.Int, usuario.IdRol ?? 2) // Por defecto rol 2 (Usuario/Cliente)
            .input('NombreUsuario', sql.VarChar(300), usuario.NombreUsuario)
            .input('ApellidoUsuario', sql.VarChar(300), usuario.ApellidoUsuario)
            .input('Telefono', sql.VarChar(100), usuario.Telefono ?? null)
            .input('Contrasena', sql.VarChar(300), usuario.Contrasena ?? '')
            .input('Correo', sql.VarChar(300), usuario.Correo)
            .input('Estado', sql.VarChar(150), usuario.Estado ?? 'Activo')
            .execute('SP_RegistrarUsuario');

        const nuevoId = rs?.recordset?.[0]?.NumeroDocumento;
        if (nuevoId) {
            return Number(nuevoId);
        }

        // Fallback: buscar por correo si no vino SCOPE_IDENTITY directo
        const encontrado = await buscarPorCorreo(usuario.Correo);
        if (encontrado?.NumeroDocumento) {
            return encontrado.NumeroDocumento;
        }

        throw new Error('No se pudo obtener el identificador del usuario registrado.');
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza los datos de un usuario existente.
 */
export const actualizar = async (usuario: Usuario): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('NumeroDocumento', sql.Int, usuario.NumeroDocumento)
            .input('IdRol', sql.Int, usuario.IdRol)
            .input('NombreUsuario', sql.VarChar(300), usuario.NombreUsuario)
            .input('ApellidoUsuario', sql.VarChar(300), usuario.ApellidoUsuario)
            .input('Telefono', sql.VarChar(100), usuario.Telefono)
            .input('Contrasena', sql.VarChar(300), usuario.Contrasena)
            .input('Estado', sql.VarChar(150), usuario.Estado)
            .execute('SP_ActualizarUsuario');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un usuario por su número de documento.
 */
export const eliminarPorId = async (numeroDocumento: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('NumeroDocumento', sql.Int, numeroDocumento)
            .query('DELETE FROM Usuario WHERE NumeroDocumento = @NumeroDocumento');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca un usuario por su número de documento (incluye Correo y NombreRol).
 */
export const buscarPorId = async (numeroDocumento: number): Promise<Usuario | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('NumeroDocumento', sql.Int, numeroDocumento)
            .query(`
                SELECT 
                    U.NumeroDocumento, 
                    U.IdRol, 
                    U.NombreUsuario, 
                    U.ApellidoUsuario, 
                    U.Telefono, 
                    U.Correo,
                    U.Contrasena, 
                    U.Estado, 
                    R.NombreRol 
                FROM Usuario U 
                LEFT JOIN Rol R ON U.IdRol = R.IdRol 
                WHERE U.NumeroDocumento = @NumeroDocumento
            `);
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Usuario;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

/**
 * Busca un usuario por su correo electrónico.
 */
export const buscarPorCorreo = async (correo: string): Promise<Usuario | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('Correo', sql.VarChar(500), correo.trim().toLowerCase())
            .query(`
                SELECT 
                    U.NumeroDocumento, 
                    U.IdRol, 
                    U.NombreUsuario, 
                    U.ApellidoUsuario, 
                    U.Telefono, 
                    U.Correo, 
                    U.Contrasena, 
                    U.Estado, 
                    R.NombreRol 
                FROM Usuario U 
                LEFT JOIN Rol R ON U.IdRol = R.IdRol 
                WHERE LOWER(U.Correo) = LOWER(@Correo)
            `);
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Usuario;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

/**
 * Ejecuta el inicio de sesión contra la base de datos.
 */
export const login = async (correo: string, contrasena: string): Promise<Usuario | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('Correo', sql.VarChar(500), correo)
            .input('Contrasena', sql.VarChar(256), contrasena)
            .execute('SP_IniciarSesion');
        
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Usuario;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
};
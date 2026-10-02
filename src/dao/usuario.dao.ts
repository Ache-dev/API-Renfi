import { query } from "../conexion/connection";
import { Usuario } from "../models/usuario";

/**
 * Obtiene la lista de todos los usuarios registrados.
 */
export const listar = async (): Promise<Usuario[]> => {
    const rs = await query<Usuario>('SELECT * FROM public."SP_ListarUsuarios"()');
    return rs.rows;
};

/**
 * Inserta un nuevo usuario y retorna el NumeroDocumento generado.
 */
export const insertar = async (usuario: Usuario): Promise<number> => {
    const rs = await query<{ NumeroDocumento: number }>(
        'SELECT public."SP_RegistrarUsuario"($1, $2, $3, $4, $5, $6, $7) AS "NumeroDocumento"',
        [
            usuario.IdRol ?? 2, // Por defecto rol 2 (Usuario/Cliente)
            usuario.NombreUsuario,
            usuario.ApellidoUsuario,
            usuario.Telefono ?? null,
            usuario.Correo,
            usuario.Contrasena ?? '',
            usuario.Estado ?? 'Activo'
        ]
    );

    const nuevoId = rs.rows[0]?.NumeroDocumento;
    if (nuevoId) {
        return Number(nuevoId);
    }

    // Fallback: buscar por correo si no vino NumeroDocumento directo
    const encontrado = await buscarPorCorreo(usuario.Correo);
    if (encontrado?.NumeroDocumento) {
        return encontrado.NumeroDocumento;
    }

    throw new Error('No se pudo obtener el identificador del usuario registrado.');
};

/**
 * Actualiza los datos de un usuario existente.
 */
export const actualizar = async (usuario: Usuario): Promise<void> => {
    await query(
        'SELECT public."SP_ActualizarUsuario"($1, $2, $3, $4, $5, $6, $7)',
        [
            usuario.NumeroDocumento,
            usuario.IdRol,
            usuario.NombreUsuario,
            usuario.ApellidoUsuario,
            usuario.Telefono ?? null,
            usuario.Contrasena ?? '',
            usuario.Estado ?? 'Activo'
        ]
    );
};

/**
 * Elimina un usuario por su número de documento.
 */
export const eliminarPorId = async (numeroDocumento: number): Promise<void> => {
    await query('DELETE FROM public."Usuario" WHERE "NumeroDocumento" = $1', [numeroDocumento]);
};

/**
 * Busca un usuario por su número de documento (incluye Correo y NombreRol).
 */
export const buscarPorId = async (numeroDocumento: number): Promise<Usuario | null> => {
    const rs = await query<Usuario>(
        `SELECT 
            U."NumeroDocumento", 
            U."IdRol", 
            U."NombreUsuario", 
            U."ApellidoUsuario", 
            U."Telefono", 
            U."Correo",
            U."Contrasena", 
            U."Estado", 
            R."NombreRol" 
        FROM public."Usuario" U 
        LEFT JOIN public."Rol" R ON U."IdRol" = R."IdRol" 
        WHERE U."NumeroDocumento" = $1`,
        [numeroDocumento]
    );
    return rs.rows[0] || null;
};

/**
 * Busca un usuario por su correo electrónico.
 */
export const buscarPorCorreo = async (correo: string): Promise<Usuario | null> => {
    const rs = await query<Usuario>(
        `SELECT 
            U."NumeroDocumento", 
            U."IdRol", 
            U."NombreUsuario", 
            U."ApellidoUsuario", 
            U."Telefono", 
            U."Correo", 
            U."Contrasena", 
            U."Estado", 
            R."NombreRol" 
        FROM public."Usuario" U 
        LEFT JOIN public."Rol" R ON U."IdRol" = R."IdRol" 
        WHERE LOWER(U."Correo") = LOWER($1)`,
        [correo.trim()]
    );
    return rs.rows[0] || null;
};

/**
 * Ejecuta el inicio de sesión contra la base de datos.
 */
export const login = async (correo: string, contrasena: string): Promise<Usuario | null> => {
    const rs = await query<Usuario>(
        'SELECT * FROM public."SP_IniciarSesion"($1, $2)',
        [correo.trim(), contrasena]
    );
    return rs.rows[0] || null;
};
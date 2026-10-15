import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { Usuario } from "../models/usuario";

const COLUMNAS = 'NumeroDocumento, IdRol, NombreUsuario, ApellidoUsuario, Telefono, Correo, Contrasena, Estado, Rol(NombreRol)';

// ilike trata % y _ como comodines: se escapan para comparar el correo de forma literal.
const literal = (texto: string) => texto.replace(/[\\%_]/g, '\\$&');

const aplanar = ({ Rol, ...u }: any): Usuario => ({ ...u, NombreRol: Rol?.NombreRol ?? null });

/**
 * Obtiene la lista de todos los usuarios registrados.
 */
export const listar = async (): Promise<Usuario[]> => {
    const filas: any[] = await unwrap(getSupabase().from('Usuario').select(COLUMNAS).order('NumeroDocumento'));
    return filas.map(aplanar);
};

/**
 * Inserta un nuevo usuario y retorna el NumeroDocumento generado.
 */
export const insertar = async (usuario: Usuario): Promise<number> => {
    const fila = await unwrapOne(
        getSupabase().from('Usuario').insert({
            IdRol: usuario.IdRol ?? 2, // Por defecto rol 2 (Usuario/Cliente)
            NombreUsuario: usuario.NombreUsuario,
            ApellidoUsuario: usuario.ApellidoUsuario,
            Telefono: usuario.Telefono ?? null,
            Correo: usuario.Correo,
            Contrasena: usuario.Contrasena ?? '',
            Estado: usuario.Estado ?? 'Activo'
        }).select('NumeroDocumento').single()
    );
    return Number(fila.NumeroDocumento);
};

/**
 * Actualiza los datos de un usuario existente.
 */
export const actualizar = async (usuario: Usuario): Promise<void> => {
    await unwrap(
        getSupabase().from('Usuario').update({
            IdRol: usuario.IdRol,
            NombreUsuario: usuario.NombreUsuario,
            ApellidoUsuario: usuario.ApellidoUsuario,
            Telefono: usuario.Telefono ?? null,
            Correo: usuario.Correo,
            Contrasena: usuario.Contrasena ?? '',
            Estado: usuario.Estado ?? 'Activo'
        }).eq('NumeroDocumento', usuario.NumeroDocumento)
    );
};

/**
 * Elimina un usuario por su número de documento.
 */
export const eliminarPorId = async (numeroDocumento: number): Promise<void> => {
    await unwrap(getSupabase().from('Usuario').delete().eq('NumeroDocumento', numeroDocumento));
};

/**
 * Busca un usuario por su número de documento (incluye Correo y NombreRol).
 */
export const buscarPorId = async (numeroDocumento: number): Promise<Usuario | null> => {
    const fila = await unwrap(getSupabase().from('Usuario').select(COLUMNAS).eq('NumeroDocumento', numeroDocumento).maybeSingle());
    return fila ? aplanar(fila) : null;
};

/**
 * Busca un usuario por su correo electrónico.
 */
export const buscarPorCorreo = async (correo: string): Promise<Usuario | null> => {
    const fila = await unwrap(
        getSupabase().from('Usuario').select(COLUMNAS).ilike('Correo', literal(correo.trim())).limit(1).maybeSingle()
    );
    return fila ? aplanar(fila) : null;
};

/**
 * Inicio de sesión: correo + contraseña de un usuario activo (no devuelve la contraseña).
 */
export const login = async (correo: string, contrasena: string): Promise<Usuario | null> => {
    const fila = await unwrap(
        getSupabase().from('Usuario').select(COLUMNAS)
            .ilike('Correo', literal(correo.trim()))
            .eq('Contrasena', contrasena)
            .eq('Estado', 'Activo')
            .limit(1).maybeSingle()
    );
    if (!fila) return null;
    const { Contrasena: _omitida, ...usuario } = aplanar(fila);
    return usuario as Usuario;
};

import getSupabase, { unwrap, unwrapOne, contar } from "../conexion/supabase";
import { Rol } from "../models/rol";

/**
 * Lista todos los roles registrados.
 */
export const listar = async (): Promise<Rol[]> => {
    return unwrap(getSupabase().from('Rol').select('IdRol, NombreRol').order('IdRol')) as Promise<Rol[]>;
};

/**
 * Inserta un nuevo rol y retorna el IdRol generado.
 */
export const insertar = async (rol: Rol): Promise<number> => {
    const fila = await unwrapOne(getSupabase().from('Rol').insert({ NombreRol: rol.NombreRol }).select('IdRol').single());
    return Number(fila.IdRol);
};

/**
 * Actualiza un rol existente.
 */
export const actualizar = async (rol: Rol): Promise<void> => {
    await unwrap(getSupabase().from('Rol').update({ NombreRol: rol.NombreRol }).eq('IdRol', rol.IdRol));
};

/**
 * Elimina un rol por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Rol').delete().eq('IdRol', id));
};

/**
 * Busca un rol por su ID.
 */
export const buscarPorId = async (id: number): Promise<Rol | null> => {
    return unwrap(getSupabase().from('Rol').select('IdRol, NombreRol').eq('IdRol', id).maybeSingle()) as Promise<Rol | null>;
};

/**
 * Cuenta registros de Usuario que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = (id: number): Promise<number> => contar('Usuario', 'IdRol', id);

import { filas, fila, insertar as insertarSp, ejecutar } from "../conexion/postgres";
import { Usuario } from "../models/usuario";

/**
 * Obtiene la lista de todos los usuarios registrados.
 */
export const listar = (): Promise<Usuario[]> => filas('sp_usuario_listar');

/**
 * Inserta un nuevo usuario y retorna el NumeroDocumento generado.
 */
export const insertar = (usuario: Usuario): Promise<number> =>
    insertarSp('sp_usuario_insertar', [
        usuario.IdRol ?? 2, // Por defecto rol 2 (Cliente)
        usuario.NombreUsuario,
        usuario.ApellidoUsuario,
        usuario.Telefono ?? null,
        usuario.Correo,
        usuario.Contrasena ?? '',
        usuario.Estado ?? 'Activo'
    ]);

/**
 * Actualiza los datos de un usuario existente.
 */
export const actualizar = (usuario: Usuario): Promise<void> =>
    ejecutar('sp_usuario_actualizar', [
        usuario.NumeroDocumento,
        usuario.IdRol ?? null,
        usuario.NombreUsuario,
        usuario.ApellidoUsuario,
        usuario.Telefono ?? null,
        usuario.Correo,
        usuario.Contrasena ?? '',
        usuario.Estado ?? 'Activo'
    ]);

/**
 * Elimina un usuario por su número de documento.
 */
export const eliminarPorId = (numeroDocumento: number): Promise<void> => ejecutar('sp_usuario_eliminar', [numeroDocumento]);

/**
 * Busca un usuario por su número de documento (incluye Correo y NombreRol).
 */
export const buscarPorId = (numeroDocumento: number): Promise<Usuario | null> => fila('sp_usuario_buscar', [numeroDocumento]);

/**
 * Busca un usuario por su correo electrónico (sin distinguir mayúsculas).
 */
export const buscarPorCorreo = (correo: string): Promise<Usuario | null> => fila('sp_usuario_buscar_correo', [correo]);

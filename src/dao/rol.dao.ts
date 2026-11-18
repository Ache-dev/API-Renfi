import { filas, fila, insertar as insertarSp, ejecutar, contar } from "../conexion/postgres";
import { Rol } from "../models/rol";

/**
 * Lista todos los roles registrados.
 */
export const listar = (): Promise<Rol[]> => filas('sp_rol_listar');

/**
 * Inserta un nuevo rol y retorna el IdRol generado.
 */
export const insertar = (rol: Rol): Promise<number> => insertarSp('sp_rol_insertar', [rol.NombreRol]);

/**
 * Actualiza un rol existente.
 */
export const actualizar = (rol: Rol): Promise<void> => ejecutar('sp_rol_actualizar', [rol.IdRol, rol.NombreRol]);

/**
 * Elimina un rol por su ID.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_rol_eliminar', [id]);

/**
 * Busca un rol por su ID.
 */
export const buscarPorId = (id: number): Promise<Rol | null> => fila('sp_rol_buscar', [id]);

/**
 * Cuenta registros de Usuario que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = (id: number): Promise<number> => contar('sp_rol_contar_usuarios', id);

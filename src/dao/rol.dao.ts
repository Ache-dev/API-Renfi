import { query } from "../conexion/connection";
import { Rol } from "../models/rol";

/**
 * Lista todos los roles registrados.
 */
export const listar = async (): Promise<Rol[]> => {
    const rs = await query<Rol>('SELECT * FROM public."SP_ListarRol"()');
    return rs.rows;
};

/**
 * Inserta un nuevo rol y retorna el IdRol generado.
 */
export const insertar = async (rol: Rol): Promise<number> => {
    const rs = await query<{ IdRol: number }>(
        'SELECT public."SP_InsertarRol"($1) AS "IdRol"',
        [rol.NombreRol]
    );
    const id = rs.rows[0]?.IdRol;
    if (!id) {
        throw new Error('No se pudo obtener el identificador del rol creado.');
    }
    return Number(id);
};

/**
 * Actualiza un rol existente.
 */
export const actualizar = async (rol: Rol): Promise<void> => {
    await query(
        'SELECT public."SP_ActualizarRol"($1, $2)',
        [rol.IdRol, rol.NombreRol]
    );
};

/**
 * Elimina un rol por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('SELECT public."SP_EliminarRol"($1)', [id]);
};

/**
 * Busca un rol por su ID.
 */
export const buscarPorId = async (id: number): Promise<Rol | null> => {
    const rs = await query<Rol>(
        'SELECT "IdRol", "NombreRol" FROM public."Rol" WHERE "IdRol" = $1',
        [id]
    );
    return rs.rows[0] || null;
};


/**
 * Cuenta registros de Usuario que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = async (id: number): Promise<number> => {
    const rs = await query<{ n: string }>('SELECT COUNT(*) AS n FROM public."Usuario" WHERE "IdRol" = $1', [id]);
    return Number(rs.rows[0]?.n ?? 0);
};

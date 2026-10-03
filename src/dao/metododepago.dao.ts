import { query } from "../conexion/connection";
import { MetodoDePago } from "../models/metododepago";

/**
 * Lista todos los métodos de pago.
 */
export const listar = async (): Promise<MetodoDePago[]> => {
    const rs = await query<MetodoDePago>('SELECT * FROM public."SP_ListarMetodosDePago"()');
    return rs.rows;
};

/**
 * Inserta un método de pago y retorna el IdMetodoDePago generado.
 */
export const insertar = async (metodo: MetodoDePago): Promise<number> => {
    const rs = await query<{ IdMetodoDePago: number }>(
        'SELECT public."SP_RegistrarMetodoDePago"($1, $2) AS "IdMetodoDePago"',
        [metodo.NombreMetodoDePago, Boolean(metodo.PagoMixto)]
    );

    const id = rs.rows[0]?.IdMetodoDePago;
    if (!id) {
        throw new Error('No se pudo obtener el identificador del método de pago creado.');
    }
    return Number(id);
};

/**
 * Actualiza un método de pago existente.
 */
export const actualizar = async (metodo: MetodoDePago): Promise<void> => {
    await query(
        'SELECT public."SP_ActualizarMetodoDePago"($1, $2, $3)',
        [metodo.IdMetodoDePago, metodo.NombreMetodoDePago, Boolean(metodo.PagoMixto)]
    );
};

/**
 * Elimina un método de pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."MetodoDePago" WHERE "IdMetodoDePago" = $1', [id]);
};

/**
 * Busca un método de pago por su ID.
 */
export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    const rs = await query<MetodoDePago>(
        'SELECT "IdMetodoDePago", "NombreMetodoDePago", "PagoMixto" FROM public."MetodoDePago" WHERE "IdMetodoDePago" = $1',
        [id]
    );
    return rs.rows[0] || null;
};

/**
 * Cuenta registros de Pago que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = async (id: number): Promise<number> => {
    const rs = await query<{ n: string }>('SELECT COUNT(*) AS n FROM public."Pago" WHERE "IdMetodoDePago" = $1', [id]);
    return Number(rs.rows[0]?.n ?? 0);
};

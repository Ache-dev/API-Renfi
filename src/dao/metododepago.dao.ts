import getSupabase, { unwrap, unwrapOne, contar } from "../conexion/supabase";
import { MetodoDePago } from "../models/metododepago";

const COLUMNAS = 'IdMetodoDePago, NombreMetodoDePago, PagoMixto';

/**
 * Lista todos los métodos de pago.
 */
export const listar = async (): Promise<MetodoDePago[]> => {
    return unwrap(getSupabase().from('MetodoDePago').select(COLUMNAS).order('IdMetodoDePago')) as Promise<MetodoDePago[]>;
};

/**
 * Inserta un método de pago y retorna el IdMetodoDePago generado.
 */
export const insertar = async (metodo: MetodoDePago): Promise<number> => {
    const fila = await unwrapOne(
        getSupabase().from('MetodoDePago')
            .insert({ NombreMetodoDePago: metodo.NombreMetodoDePago, PagoMixto: Boolean(metodo.PagoMixto) })
            .select('IdMetodoDePago').single()
    );
    return Number(fila.IdMetodoDePago);
};

/**
 * Actualiza un método de pago existente.
 */
export const actualizar = async (metodo: MetodoDePago): Promise<void> => {
    await unwrap(
        getSupabase().from('MetodoDePago')
            .update({ NombreMetodoDePago: metodo.NombreMetodoDePago, PagoMixto: Boolean(metodo.PagoMixto) })
            .eq('IdMetodoDePago', metodo.IdMetodoDePago)
    );
};

/**
 * Elimina un método de pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('MetodoDePago').delete().eq('IdMetodoDePago', id));
};

/**
 * Busca un método de pago por su ID.
 */
export const buscarPorId = async (id: number): Promise<MetodoDePago | null> => {
    return unwrap(getSupabase().from('MetodoDePago').select(COLUMNAS).eq('IdMetodoDePago', id).maybeSingle()) as Promise<MetodoDePago | null>;
};

/**
 * Cuenta registros de Pago que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = (id: number): Promise<number> => contar('Pago', 'IdMetodoDePago', id);

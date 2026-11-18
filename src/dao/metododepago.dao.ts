import { filas, fila, insertar as insertarSp, ejecutar, contar } from "../conexion/postgres";
import { MetodoDePago } from "../models/metododepago";

/**
 * Lista todos los métodos de pago.
 */
export const listar = (): Promise<MetodoDePago[]> => filas('sp_metodo_listar');

/**
 * Inserta un método de pago y retorna el IdMetodoDePago generado.
 */
export const insertar = (metodo: MetodoDePago): Promise<number> =>
    insertarSp('sp_metodo_insertar', [metodo.NombreMetodoDePago, Boolean(metodo.PagoMixto)]);

/**
 * Actualiza un método de pago existente.
 */
export const actualizar = (metodo: MetodoDePago): Promise<void> =>
    ejecutar('sp_metodo_actualizar', [metodo.IdMetodoDePago, metodo.NombreMetodoDePago, Boolean(metodo.PagoMixto)]);

/**
 * Elimina un método de pago por su ID.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_metodo_eliminar', [id]);

/**
 * Busca un método de pago por su ID.
 */
export const buscarPorId = (id: number): Promise<MetodoDePago | null> => fila('sp_metodo_buscar', [id]);

/**
 * Cuenta registros de Pago que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = (id: number): Promise<number> => contar('sp_metodo_contar_pagos', id);

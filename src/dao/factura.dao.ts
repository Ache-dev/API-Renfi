import { filas, fila, insertar as insertarSp, ejecutar } from "../conexion/postgres";
import { Factura } from "../models/factura";

const aFecha = (valor?: Date | string): string => (valor instanceof Date ? valor : new Date(valor || Date.now())).toISOString();

/**
 * Lista todas las facturas registradas.
 */
export const listar = (): Promise<Factura[]> => filas('sp_factura_listar');

/**
 * Inserta una nueva factura y retorna el IdFactura generado.
 */
export const insertar = (factura: Factura): Promise<number> =>
    insertarSp('sp_factura_insertar', [factura.IdReserva, aFecha(factura.FechaFactura), factura.Total]);

/**
 * Actualiza una factura existente.
 */
export const actualizar = (factura: Factura): Promise<void> =>
    ejecutar('sp_factura_actualizar', [factura.IdFactura, factura.IdReserva, aFecha(factura.FechaFactura), factura.Total]);

/**
 * Elimina una factura por su ID.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_factura_eliminar', [id]);

/**
 * Busca una factura por su ID con datos relacionados de la reserva.
 */
export const buscarPorId = (id: number): Promise<Factura | null> => fila('sp_factura_buscar', [id]);

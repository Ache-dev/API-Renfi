import { filas, fila, insertar as insertarSp, ejecutar } from "../conexion/postgres";
import { Pago, PagoPendiente } from "../models/pago";

export type { PagoPendiente };

const aFecha = (valor?: Date | string): string => (valor instanceof Date ? valor : new Date(valor || Date.now())).toISOString();

/**
 * Reporte: Pagos pendientes por confirmar.
 */
export const pagosPendientes = (): Promise<PagoPendiente[]> => filas('sp_pago_pendientes');

/**
 * Lista todos los pagos registrados con detalles de método de pago y factura.
 */
export const listar = (): Promise<Pago[]> => filas('sp_pago_listar');

/**
 * Pagos recibidos por las reservas de las fincas de un propietario.
 */
export const listarPorPropietario = (numeroDocumento: number): Promise<Pago[]> => filas('sp_pago_listar_propietario', [numeroDocumento]);

/**
 * Inserta un nuevo pago y retorna el IdPago generado.
 */
export const insertar = (pago: Pago): Promise<number> =>
    insertarSp('sp_pago_insertar', [pago.IdFactura, pago.IdMetodoDePago, pago.Monto, aFecha(pago.FechaPago), pago.EstadoPago ?? 'Pagado']);

/**
 * Actualiza un pago existente.
 */
export const actualizar = (pago: Pago): Promise<void> =>
    ejecutar('sp_pago_actualizar', [pago.IdPago, pago.IdFactura, pago.IdMetodoDePago, pago.Monto, aFecha(pago.FechaPago), pago.EstadoPago]);

/**
 * Elimina un pago por su ID.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_pago_eliminar', [id]);

/**
 * Busca un pago por su ID con datos relacionados.
 */
export const buscarPorId = (id: number): Promise<Pago | null> => fila('sp_pago_buscar', [id]);

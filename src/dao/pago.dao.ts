import { query } from "../conexion/connection";
import { Pago, PagoPendiente } from "../models/pago";

export type { PagoPendiente };

/**
 * Reporte: Pagos pendientes por confirmar.
 */
export const pagosPendientes = async (): Promise<PagoPendiente[]> => {
    const rs = await query<PagoPendiente>('SELECT * FROM public."SP_PagosPendientes"()');
    return rs.rows;
};

/**
 * Lista todos los pagos registrados con detalles de método de pago y factura.
 */
export const listar = async (): Promise<Pago[]> => {
    const rs = await query<Pago>('SELECT * FROM public."SP_ListarPagos"()');
    return rs.rows;
};

/**
 * Inserta un nuevo pago y retorna el IdPago generado.
 */
export const insertar = async (pago: Pago): Promise<number> => {
    const fechaPago = pago.FechaPago instanceof Date ? pago.FechaPago : new Date(pago.FechaPago || Date.now());

    const rs = await query<{ IdPago: number }>(
        'SELECT public."SP_RegistrarPago"($1, $2, $3, $4, $5) AS "IdPago"',
        [
            pago.IdFactura,
            pago.IdMetodoDePago,
            pago.Monto,
            fechaPago,
            pago.EstadoPago ?? 'Pagado'
        ]
    );

    const idPago = rs.rows[0]?.IdPago;
    if (idPago) {
        return Number(idPago);
    }

    const fallback = await query<{ IdPago: number }>(
        'SELECT "IdPago" FROM public."Pago" WHERE "IdFactura" = $1 ORDER BY "IdPago" DESC LIMIT 1',
        [pago.IdFactura]
    );

    const fallbackId = fallback.rows[0]?.IdPago;
    if (fallbackId) {
        return Number(fallbackId);
    }

    throw new Error('No se pudo obtener el identificador del pago registrado.');
};

/**
 * Actualiza un pago existente.
 */
export const actualizar = async (pago: Pago): Promise<void> => {
    const fechaPago = pago.FechaPago instanceof Date ? pago.FechaPago : new Date(pago.FechaPago || Date.now());

    await query(
        'SELECT public."SP_ActualizarPago"($1, $2, $3, $4, $5, $6)',
        [
            pago.IdPago,
            pago.IdFactura,
            pago.IdMetodoDePago,
            pago.Monto,
            fechaPago,
            pago.EstadoPago
        ]
    );
};

/**
 * Elimina un pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."Pago" WHERE "IdPago" = $1', [id]);
};

/**
 * Busca un pago por su ID con datos relacionados.
 */
export const buscarPorId = async (id: number): Promise<Pago | null> => {
    const rs = await query<Pago>(
        `SELECT 
            P."IdPago", 
            P."IdFactura", 
            P."IdMetodoDePago", 
            P."Monto", 
            P."FechaPago", 
            P."EstadoPago", 
            M."NombreMetodoDePago", 
            M."PagoMixto", 
            Fa."Total" AS "TotalFactura", 
            Fa."IdReserva" 
        FROM public."Pago" P 
        LEFT JOIN public."MetodoDePago" M ON P."IdMetodoDePago" = M."IdMetodoDePago" 
        LEFT JOIN public."Factura" Fa ON P."IdFactura" = Fa."IdFactura" 
        WHERE P."IdPago" = $1`,
        [id]
    );
    return rs.rows[0] || null;
};
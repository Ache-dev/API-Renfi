import getConnection from "../conexion/connection";
import { Pago, PagoPendiente } from "../models/pago";
import sql from 'mssql';

export type { PagoPendiente };

/**
 * Reporte: Pagos pendientes por confirmar.
 */
export const pagosPendientes = async (): Promise<PagoPendiente[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_PagosPendientes');
        return (rs?.recordset as PagoPendiente[]) ?? [];
    } catch (error) {
        throw error;
    }
};

/**
 * Lista todos los pagos registrados con detalles de método de pago y factura.
 */
export const listar = async (): Promise<Pago[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarPagos');
        if (rs && rs.recordset) {
            return rs.recordset as Pago[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta un nuevo pago y retorna el IdPago generado (SCOPE_IDENTITY).
 */
export const insertar = async (pago: Pago): Promise<number> => {
    try {
        const pool = await getConnection();
        const fechaPago = pago.FechaPago instanceof Date ? pago.FechaPago : new Date(pago.FechaPago || Date.now());

        const rs = await pool.request()
            .input('IdFactura', sql.Int, pago.IdFactura)
            .input('IdMetodoDePago', sql.Int, pago.IdMetodoDePago)
            .input('Monto', sql.Int, pago.Monto)
            .input('FechaPago', sql.DateTime, fechaPago)
            .input('EstadoPago', sql.VarChar(150), pago.EstadoPago ?? 'Pagado')
            .execute('SP_RegistrarPago');

        const idPago = rs?.recordset?.[0]?.IdPago;
        if (idPago) {
            return Number(idPago);
        }

        // Fallback en caso de que el procedimiento no retorne el recordset
        const fallback = await pool.request()
            .input('IdFactura', sql.Int, pago.IdFactura)
            .query('SELECT TOP 1 IdPago FROM Pago WHERE IdFactura = @IdFactura ORDER BY IdPago DESC');

        const fallbackId = fallback?.recordset?.[0]?.IdPago;
        if (fallbackId) {
            return Number(fallbackId);
        }

        throw new Error('No se pudo obtener el identificador del pago registrado.');
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza un pago existente.
 */
export const actualizar = async (pago: Pago): Promise<void> => {
    try {
        const pool = await getConnection();
        const fechaPago = pago.FechaPago instanceof Date ? pago.FechaPago : new Date(pago.FechaPago || Date.now());

        await pool.request()
            .input('IdPago', sql.Int, pago.IdPago)
            .input('IdFactura', sql.Int, pago.IdFactura)
            .input('IdMetodoDePago', sql.Int, pago.IdMetodoDePago)
            .input('Monto', sql.Int, pago.Monto)
            .input('FechaPago', sql.DateTime, fechaPago)
            .input('EstadoPago', sql.VarChar(150), pago.EstadoPago)
            .execute('SP_ActualizarPago');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina un pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdPago', sql.Int, id)
            .query('DELETE FROM Pago WHERE IdPago = @IdPago');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca un pago por su ID con datos relacionados.
 */
export const buscarPorId = async (id: number): Promise<Pago | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdPago', sql.Int, id)
            .query(`
                SELECT 
                    P.IdPago, 
                    P.IdFactura, 
                    P.IdMetodoDePago, 
                    P.Monto, 
                    P.FechaPago, 
                    P.EstadoPago, 
                    M.NombreMetodoDePago, 
                    M.PagoMixto,
                    Fa.Total AS TotalFactura,
                    Fa.IdReserva
                FROM Pago P 
                LEFT JOIN MetodoDePago M ON P.IdMetodoDePago = M.IdMetodoDePago 
                LEFT JOIN Factura Fa ON P.IdFactura = Fa.IdFactura 
                WHERE P.IdPago = @IdPago
            `);
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Pago;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
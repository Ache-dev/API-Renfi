import getConnection from "../conexion/connection";
import { Pago } from "../models/pago";
// Reporte: Pagos pendientes
export interface PagoPendiente {
    IdPago: number;
    IdFactura: number;
    NombreFinca: string;
    Monto: number;
    FechaPago: string;
    EstadoPago: string;
}

export const pagosPendientes = async (): Promise<PagoPendiente[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_PagosPendientes');
        return rs.recordset as PagoPendiente[];
    } catch (error) {
        throw error;
    }
};

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

export const insertar = async (pago: Pago): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFactura', pago.IdFactura)
            .input('IdMetodoDePago', pago.IdMetodoDePago)
            .input('Monto', pago.Monto)
            .input('FechaPago', pago.FechaPago)
            .input('EstadoPago', pago.EstadoPago)
            .execute('SP_RegistrarPago');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (pago: Pago): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdPago', pago.IdPago)
            .input('IdFactura', pago.IdFactura)
            .input('IdMetodoDePago', pago.IdMetodoDePago)
            .input('Monto', pago.Monto)
            .input('FechaPago', pago.FechaPago)
            .input('EstadoPago', pago.EstadoPago)
            .execute('SP_ActualizarPago');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdPago', id)
            .query('DELETE FROM Pago WHERE IdPago = @IdPago');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Pago | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdPago', id)
            .query('SELECT P.IdPago, P.IdFactura, P.IdMetodoDePago, P.Monto, P.FechaPago, P.EstadoPago, M.NombreMetodoDePago, Fa.Total AS TotalFactura FROM Pago P LEFT JOIN MetodoDePago M ON P.IdMetodoDePago = M.IdMetodoDePago LEFT JOIN Factura Fa ON P.IdFactura = Fa.IdFactura WHERE P.IdPago = @IdPago');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Pago;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
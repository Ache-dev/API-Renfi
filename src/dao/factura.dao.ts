import getConnection from "../conexion/connection";
import { Factura } from "../models/factura";
import sql from 'mssql';

/**
 * Lista todas las facturas registradas.
 */
export const listar = async (): Promise<Factura[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarFacturas');
        if (rs && rs.recordset) {
            return rs.recordset as Factura[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta una nueva factura y retorna el IdFactura generado.
 */
export const insertar = async (factura: Factura): Promise<number> => {
    try {
        const pool = await getConnection();
        const fechaFactura = factura.FechaFactura instanceof Date ? factura.FechaFactura : new Date(factura.FechaFactura || Date.now());

        const rs = await pool.request()
            .input('IdReserva', sql.Int, factura.IdReserva)
            .input('FechaFactura', sql.DateTime, fechaFactura)
            .input('Total', sql.Int, factura.Total)
            .execute('SP_RegistrarFactura');

        const idFactura = rs?.recordset?.[0]?.IdFactura;
        if (idFactura) {
            return Number(idFactura);
        }

        const fallback = await pool.request()
            .input('IdReserva', sql.Int, factura.IdReserva)
            .query('SELECT TOP 1 IdFactura FROM Factura WHERE IdReserva = @IdReserva ORDER BY IdFactura DESC');

        const fallbackId = fallback?.recordset?.[0]?.IdFactura;
        if (fallbackId) {
            return Number(fallbackId);
        }

        throw new Error('No se pudo obtener el identificador de la factura creada.');
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza una factura existente.
 */
export const actualizar = async (factura: Factura): Promise<void> => {
    try {
        const pool = await getConnection();
        const fechaFactura = factura.FechaFactura instanceof Date ? factura.FechaFactura : new Date(factura.FechaFactura || Date.now());

        await pool.request()
            .input('IdFactura', sql.Int, factura.IdFactura)
            .input('IdReserva', sql.Int, factura.IdReserva)
            .input('FechaFactura', sql.DateTime, fechaFactura)
            .input('Total', sql.Int, factura.Total)
            .execute('SP_ActualizarFactura');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina una factura por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFactura', sql.Int, id)
            .query('DELETE FROM Factura WHERE IdFactura = @IdFactura');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca una factura por su ID con datos relacionados de la reserva.
 */
export const buscarPorId = async (id: number): Promise<Factura | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFactura', sql.Int, id)
            .query(`
                SELECT 
                    Fa.IdFactura, 
                    Fa.IdReserva, 
                    Fa.FechaFactura, 
                    Fa.Total,
                    R.Estado AS EstadoReserva,
                    F.NombreFinca,
                    F.Precio AS PrecioFinca,
                    M.NombreMunicipio,
                    U.NumeroDocumento AS IdPropietario,
                    U.NombreUsuario AS NombrePropietario,
                    U.ApellidoUsuario AS ApellidoPropietario
                FROM Factura Fa
                LEFT JOIN Reserva R ON Fa.IdReserva = R.IdReserva
                LEFT JOIN Finca F ON R.IdFinca = F.IdFinca
                LEFT JOIN Municipio M ON F.IdMunicipio = M.IdMunicipio
                LEFT JOIN Usuario U ON F.NumeroDocumentoUsuario = U.NumeroDocumento
                WHERE Fa.IdFactura = @IdFactura
            `);
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Factura;
        }
        return null;
    } catch (error) {
        throw error;
    }
};


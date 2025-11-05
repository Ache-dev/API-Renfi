import getConnection from "../conexion/connection";
import { Factura } from "../models/factura";
import sql from 'mssql';

export const listar = async (): Promise<Factura[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().query('SELECT * FROM Factura');
        if (rs && rs.recordset) {
            return rs.recordset as Factura[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const insertar = async (factura: Factura): Promise<number> => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('IdReserva', sql.Int, factura.IdReserva)
            .input('FechaFactura', sql.DateTime, factura.FechaFactura || new Date())
            .input('Total', sql.Decimal(10, 2), factura.Total)
            .query(`
                DECLARE @IdFactura INT;
                
                INSERT INTO Factura (IdReserva, FechaFactura, Total)
                VALUES (@IdReserva, @FechaFactura, @Total);
                
                SET @IdFactura = SCOPE_IDENTITY();
                SELECT @IdFactura AS IdFactura;
            `);
        
        const idFactura = result?.recordset?.[0]?.IdFactura;
        if (!idFactura) throw new Error('No se pudo crear la factura');
        return idFactura;
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (factura: Factura): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFactura', sql.Int, factura.IdFactura)
            .input('IdReserva', sql.Int, factura.IdReserva)
            .input('FechaFactura', sql.DateTime, factura.FechaFactura)
            .input('Total', sql.Decimal(10, 2), factura.Total)
            .query(`
                UPDATE Factura 
                SET IdReserva = @IdReserva,
                    FechaFactura = @FechaFactura,
                    Total = @Total
                WHERE IdFactura = @IdFactura
            `);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFactura', id)
            .query('DELETE FROM Factura WHERE IdFactura = @IdFactura');
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Factura | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFactura', id)
            .query('SELECT Fa.IdFactura, Fa.IdReserva, Fa.FechaFactura, Fa.Total, R.IdReserva, Fi.NombreFinca FROM Factura Fa LEFT JOIN Reserva R ON Fa.IdReserva = R.IdReserva LEFT JOIN Finca Fi ON R.IdFinca = Fi.IdFinca WHERE Fa.IdFactura = @IdFactura');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Factura;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

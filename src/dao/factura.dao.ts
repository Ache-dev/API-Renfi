import { query } from "../conexion/connection";
import { Factura } from "../models/factura";

/**
 * Lista todas las facturas registradas.
 */
export const listar = async (): Promise<Factura[]> => {
    const rs = await query<Factura>('SELECT * FROM public."SP_ListarFacturas"()');
    return rs.rows;
};

/**
 * Inserta una nueva factura y retorna el IdFactura generado.
 */
export const insertar = async (factura: Factura): Promise<number> => {
    const fechaFactura = factura.FechaFactura instanceof Date ? factura.FechaFactura : new Date(factura.FechaFactura || Date.now());

    const rs = await query<{ IdFactura: number }>(
        'SELECT public."SP_RegistrarFactura"($1, $2, $3) AS "IdFactura"',
        [factura.IdReserva, fechaFactura, factura.Total]
    );

    const idFactura = rs.rows[0]?.IdFactura;
    if (idFactura) {
        return Number(idFactura);
    }

    const fallback = await query<{ IdFactura: number }>(
        'SELECT "IdFactura" FROM public."Factura" WHERE "IdReserva" = $1 ORDER BY "IdFactura" DESC LIMIT 1',
        [factura.IdReserva]
    );

    const fallbackId = fallback.rows[0]?.IdFactura;
    if (fallbackId) {
        return Number(fallbackId);
    }

    throw new Error('No se pudo obtener el identificador de la factura creada.');
};

/**
 * Actualiza una factura existente.
 */
export const actualizar = async (factura: Factura): Promise<void> => {
    const fechaFactura = factura.FechaFactura instanceof Date ? factura.FechaFactura : new Date(factura.FechaFactura || Date.now());

    await query(
        'SELECT public."SP_ActualizarFactura"($1, $2, $3, $4)',
        [factura.IdFactura, factura.IdReserva, fechaFactura, factura.Total]
    );
};

/**
 * Elimina una factura por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."Factura" WHERE "IdFactura" = $1', [id]);
};

/**
 * Busca una factura por su ID con datos relacionados de la reserva.
 */
export const buscarPorId = async (id: number): Promise<Factura | null> => {
    const rs = await query<Factura>(
        `SELECT 
            Fa."IdFactura", 
            Fa."IdReserva", 
            Fa."FechaFactura", 
            Fa."Total",
            R."Estado" AS "EstadoReserva",
            F."NombreFinca",
            F."Precio" AS "PrecioFinca",
            M."NombreMunicipio",
            U."NumeroDocumento" AS "IdPropietario",
            U."NombreUsuario" AS "NombrePropietario",
            U."ApellidoUsuario" AS "ApellidoPropietario"
        FROM public."Factura" Fa
        LEFT JOIN public."Reserva" R ON Fa."IdReserva" = R."IdReserva"
        LEFT JOIN public."Finca" F ON R."IdFinca" = F."IdFinca"
        LEFT JOIN public."Municipio" M ON F."IdMunicipio" = M."IdMunicipio"
        LEFT JOIN public."Usuario" U ON F."NumeroDocumentoUsuario" = U."NumeroDocumento"
        WHERE Fa."IdFactura" = $1`,
        [id]
    );
    return rs.rows[0] || null;
};

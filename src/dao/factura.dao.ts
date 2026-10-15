import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { Factura } from "../models/factura";

const SELECT_FACTURA = 'IdFactura, IdReserva, FechaFactura, Total, Reserva(IdReserva, NumeroDocumentoUsuario, FechaReserva, Estado, Finca(IdFinca, NombreFinca, Precio, Municipio(NombreMunicipio), Usuario(NumeroDocumento, NombreUsuario, ApellidoUsuario)))';

const aFecha = (valor?: Date | string): string => (valor instanceof Date ? valor : new Date(valor || Date.now())).toISOString();

const aplanar = (f: any): Factura => {
    const { Reserva: r, ...base } = f;
    const finca = r?.Finca;
    return {
        ...base,
        NumeroDocumentoCliente: r?.NumeroDocumentoUsuario ?? null,
        FechaReserva: r?.FechaReserva ?? null,
        EstadoReserva: r?.Estado ?? null,
        IdFinca: finca?.IdFinca ?? null,
        NombreFinca: finca?.NombreFinca ?? null,
        PrecioFinca: finca?.Precio ?? null,
        NombreMunicipio: finca?.Municipio?.NombreMunicipio ?? null,
        IdPropietario: finca?.Usuario?.NumeroDocumento ?? null,
        NombrePropietario: finca?.Usuario?.NombreUsuario ?? null,
        ApellidoPropietario: finca?.Usuario?.ApellidoUsuario ?? null
    };
};

/**
 * Lista todas las facturas registradas.
 */
export const listar = async (): Promise<Factura[]> => {
    const filas: any[] = await unwrap(getSupabase().from('Factura').select(SELECT_FACTURA).order('IdFactura', { ascending: false }));
    return filas.map(aplanar);
};

/**
 * Inserta una nueva factura y retorna el IdFactura generado.
 */
export const insertar = async (factura: Factura): Promise<number> => {
    const fila = await unwrapOne(
        getSupabase().from('Factura')
            .insert({ IdReserva: factura.IdReserva, FechaFactura: aFecha(factura.FechaFactura), Total: factura.Total })
            .select('IdFactura').single()
    );
    return Number(fila.IdFactura);
};

/**
 * Actualiza una factura existente.
 */
export const actualizar = async (factura: Factura): Promise<void> => {
    await unwrap(
        getSupabase().from('Factura')
            .update({ IdReserva: factura.IdReserva, FechaFactura: aFecha(factura.FechaFactura), Total: factura.Total })
            .eq('IdFactura', factura.IdFactura)
    );
};

/**
 * Elimina una factura por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Factura').delete().eq('IdFactura', id));
};

/**
 * Busca una factura por su ID con datos relacionados de la reserva.
 */
export const buscarPorId = async (id: number): Promise<Factura | null> => {
    const fila = await unwrap(getSupabase().from('Factura').select(SELECT_FACTURA).eq('IdFactura', id).maybeSingle());
    return fila ? aplanar(fila) : null;
};

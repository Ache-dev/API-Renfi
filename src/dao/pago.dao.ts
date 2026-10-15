import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { Pago, PagoPendiente } from "../models/pago";

export type { PagoPendiente };

const SELECT_PAGO = 'IdPago, IdFactura, IdMetodoDePago, Monto, FechaPago, EstadoPago, MetodoDePago(NombreMetodoDePago, PagoMixto), Factura(FechaFactura, Total, IdReserva, Reserva(Estado, NumeroDocumentoUsuario, Finca(IdFinca, NombreFinca, Precio, Municipio(NombreMunicipio), Usuario(NumeroDocumento, NombreUsuario, ApellidoUsuario))))';

const aFecha = (valor?: Date | string): string => (valor instanceof Date ? valor : new Date(valor || Date.now())).toISOString();

const aplanar = (p: any): Pago => {
    const { MetodoDePago: m, Factura: fa, ...base } = p;
    const finca = fa?.Reserva?.Finca;
    return {
        ...base,
        NombreMetodoDePago: m?.NombreMetodoDePago ?? null,
        PagoMixto: m?.PagoMixto ?? null,
        FechaFactura: fa?.FechaFactura ?? null,
        TotalFactura: fa?.Total ?? null,
        IdReserva: fa?.IdReserva ?? null,
        NumeroDocumentoCliente: fa?.Reserva?.NumeroDocumentoUsuario ?? null,
        EstadoReserva: fa?.Reserva?.Estado ?? null,
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
 * Reporte: Pagos pendientes por confirmar.
 */
export const pagosPendientes = async (): Promise<PagoPendiente[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Pago')
            .select('IdPago, IdFactura, Monto, FechaPago, EstadoPago, Factura!inner(Reserva!inner(Finca!inner(IdFinca, NombreFinca)))')
            .eq('EstadoPago', 'Pendiente')
            .order('IdPago')
    );
    return filas.map(({ Factura: fa, ...p }) => ({
        IdPago: p.IdPago,
        IdFactura: p.IdFactura,
        IdFinca: fa.Reserva.Finca.IdFinca,
        NombreFinca: fa.Reserva.Finca.NombreFinca,
        Monto: p.Monto,
        FechaPago: p.FechaPago,
        EstadoPago: p.EstadoPago
    }));
};

/**
 * Lista todos los pagos registrados con detalles de método de pago y factura.
 */
export const listar = async (): Promise<Pago[]> => {
    const filas: any[] = await unwrap(getSupabase().from('Pago').select(SELECT_PAGO).order('IdPago', { ascending: false }));
    return filas.map(aplanar);
};

/**
 * Pagos recibidos por las reservas de las fincas de un propietario.
 */
export const listarPorPropietario = async (numeroDocumento: number): Promise<Pago[]> => {
    const fincas: any[] = await unwrap(getSupabase().from('Finca').select('IdFinca').eq('NumeroDocumentoUsuario', numeroDocumento));
    if (fincas.length === 0) return [];
    const reservas: any[] = await unwrap(getSupabase().from('Reserva').select('IdReserva').in('IdFinca', fincas.map((f) => f.IdFinca)));
    if (reservas.length === 0) return [];
    const facturas: any[] = await unwrap(getSupabase().from('Factura').select('IdFactura').in('IdReserva', reservas.map((r) => r.IdReserva)));
    if (facturas.length === 0) return [];
    const filas: any[] = await unwrap(
        getSupabase().from('Pago').select(SELECT_PAGO).in('IdFactura', facturas.map((f) => f.IdFactura)).order('IdPago', { ascending: false })
    );
    return filas.map(aplanar);
};

/**
 * Inserta un nuevo pago y retorna el IdPago generado.
 */
export const insertar = async (pago: Pago): Promise<number> => {
    const fila = await unwrapOne(
        getSupabase().from('Pago').insert({
            IdFactura: pago.IdFactura,
            IdMetodoDePago: pago.IdMetodoDePago,
            Monto: pago.Monto,
            FechaPago: aFecha(pago.FechaPago),
            EstadoPago: pago.EstadoPago ?? 'Pagado'
        }).select('IdPago').single()
    );
    return Number(fila.IdPago);
};

/**
 * Actualiza un pago existente.
 */
export const actualizar = async (pago: Pago): Promise<void> => {
    await unwrap(
        getSupabase().from('Pago').update({
            IdFactura: pago.IdFactura,
            IdMetodoDePago: pago.IdMetodoDePago,
            Monto: pago.Monto,
            FechaPago: aFecha(pago.FechaPago),
            EstadoPago: pago.EstadoPago
        }).eq('IdPago', pago.IdPago)
    );
};

/**
 * Elimina un pago por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Pago').delete().eq('IdPago', id));
};

/**
 * Busca un pago por su ID con datos relacionados.
 */
export const buscarPorId = async (id: number): Promise<Pago | null> => {
    const fila = await unwrap(getSupabase().from('Pago').select(SELECT_PAGO).eq('IdPago', id).maybeSingle());
    return fila ? aplanar(fila) : null;
};

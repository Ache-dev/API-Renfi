/**
 * Entidad de Pago en la base de datos SQL Server.
 */
export interface Pago {
    IdPago?: number | undefined;
    IdFactura: number;
    IdMetodoDePago: number;
    Monto: number;
    FechaPago: Date | string;
    EstadoPago: string;

    // Campos del JOIN con MetodoDePago y Factura
    NombreMetodoDePago?: string | undefined;
    TotalFactura?: number | undefined;
    IdReserva?: number | undefined;
    PagoMixto?: boolean | undefined;
}

/**
 * Reporte de pagos pendientes.
 */
export interface PagoPendiente {
    IdPago: number;
    IdFactura: number;
    NombreFinca: string;
    Monto: number;
    FechaPago: string;
    EstadoPago: string;
}

/**
 * DTO para registrar un pago.
 */
export interface CrearPagoDto {
    IdFactura: number;
    IdMetodoDePago: number;
    Monto: number;
    FechaPago?: Date | string | undefined;
    EstadoPago?: string | undefined;
}

/**
 * DTO para actualizar un pago.
 */
export interface ActualizarPagoDto {
    IdPago?: number | undefined;
    IdFactura?: number | undefined;
    IdMetodoDePago?: number | undefined;
    Monto?: number | undefined;
    FechaPago?: Date | string | undefined;
    EstadoPago?: string | undefined;
}
}
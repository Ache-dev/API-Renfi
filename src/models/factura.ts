/**
 * Entidad de Factura en la base de datos SQL Server.
 */
export interface Factura {
    IdFactura?: number | undefined;
    IdReserva: number;
    FechaFactura?: Date | string | undefined;
    Total: number;

    // Campos del JOIN opcionales
    EstadoReserva?: string | undefined;
    NombreFinca?: string | undefined;
    PrecioFinca?: number | undefined;
    NombreMunicipio?: string | undefined;
    IdPropietario?: number | undefined;
    NombrePropietario?: string | undefined;
    ApellidoPropietario?: string | undefined;
}

/**
 * DTO para crear una Factura.
 */
export interface CrearFacturaDto {
    IdReserva: number;
    FechaFactura?: Date | string | undefined;
    Total: number;
}

/**
 * DTO para actualizar una Factura.
 */
export interface ActualizarFacturaDto {
    IdFactura?: number | undefined;
    IdReserva?: number | undefined;
    FechaFactura?: Date | string | undefined;
    Total?: number | undefined;
}

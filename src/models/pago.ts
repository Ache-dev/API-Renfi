export interface Pago {
    IdPago?: number;
    IdFactura: number;
    IdMetodoDePago: number;
    Monto: number;
    FechaPago: Date;
    EstadoPago: string;
    // Campos adicionales para listados con JOIN
    NombreMetodoDePago?: string;
    TotalFactura?: number;
}
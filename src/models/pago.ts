export interface Pago {
    IdPago: number;
    IdFactura?: number;
    Monto?: number;
    FechaPago?: Date;
    EstadoPago?: string;
    IdMetodo?: number;
}
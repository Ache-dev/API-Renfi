/**
 * Entidad de Método de Pago en la base de datos SQL Server.
 */
export interface MetodoDePago {
    IdMetodoDePago?: number;
    NombreMetodoDePago: string;
    PagoMixto: boolean;
}

export interface CrearMetodoDePagoDto {
    NombreMetodoDePago: string;
    PagoMixto?: boolean;
}

export interface ActualizarMetodoDePagoDto {
    IdMetodoDePago?: number;
    NombreMetodoDePago?: string;
    PagoMixto?: boolean;
}

export interface Reserva {
    IdReserva?: number;
    IdFinca: number;
    FechaReserva?: Date | string;
    FechaEntrada: Date | string;
    FechaSalida: Date | string;
    Estado?: string;
    MontoReserva: number;
    // Campos adicionales del JOIN (opcionales)
    NombreFinca?: string;
    Precio?: number;
    Propietario?: string;
    EstadoFinca?: string;
    NombreMunicipio?: string;
    IdPropietario?: number;
    NombrePropietario?: string;
    ApellidoPropietario?: string;
}
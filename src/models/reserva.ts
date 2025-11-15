export interface Reserva {
    IdReserva?: number;
    IdFinca: number;
    NumeroDocumentoUsuario?: number; // Usuario que hace la reserva
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
    // Datos del cliente que reserva
    NombreCliente?: string;
    ApellidoCliente?: string;
    TelefonoCliente?: string;
}
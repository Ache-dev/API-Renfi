/**
 * Entidad de Reserva en la base de datos SQL Server.
 */
export interface Reserva {
    IdReserva?: number | undefined;
    IdFinca: number;
    NumeroDocumentoUsuario?: number | undefined; // Usuario que hace la reserva
    FechaReserva?: Date | string | undefined;
    FechaEntrada: Date | string;
    FechaSalida: Date | string;
    Estado?: string | undefined;
    MontoReserva: number;

    // Campos del JOIN con Finca, Municipio, Propietario y Cliente
    NombreFinca?: string | undefined;
    PrecioFinca?: number | undefined;
    Precio?: number | undefined;
    EstadoFinca?: string | undefined;
    NombreMunicipio?: string | undefined;
    Capacidad?: number | undefined;
    IdPropietario?: number | undefined;
    NombrePropietario?: string | undefined;
    ApellidoPropietario?: string | undefined;
    TelefonoPropietario?: string | undefined;
    NumeroDocumentoCliente?: number | undefined;
    NombreCliente?: string | undefined;
    ApellidoCliente?: string | undefined;
    TelefonoCliente?: string | undefined;
    CorreoCliente?: string | undefined;
}

/**
 * Filtros para la consulta de reservas.
 */
export interface ReservaFiltros {
    correo?: string | undefined;
    Correo?: string | undefined;
    documento?: number | undefined;
    NumeroDocumento?: number | undefined;
    numeroDocumento?: number | undefined;
    idUsuario?: number | undefined;
    IdUsuario?: number | undefined;
    fincaId?: number | undefined;
    IdFinca?: number | undefined;
    idFinca?: number | undefined;
    estado?: string | undefined;
    Estado?: string | undefined;
}

/**
 * DTO para la creación de una reserva.
 */
export interface CrearReservaDto {
    IdFinca: number;
    NumeroDocumentoUsuario?: number | undefined;
    FechaReserva?: Date | string | undefined;
    FechaEntrada: Date | string;
    FechaSalida: Date | string;
    MontoReserva: number;
    Estado?: string | undefined;
    Huespedes?: number | undefined;
    huespedes?: number | undefined;
}

/**
 * DTO para la actualización de una reserva.
 */
export interface ActualizarReservaDto {
    IdReserva?: number | undefined;
    IdFinca?: number | undefined;
    NumeroDocumentoUsuario?: number | undefined;
    FechaReserva?: Date | string | undefined;
    FechaEntrada?: Date | string | undefined;
    FechaSalida?: Date | string | undefined;
    MontoReserva?: number | undefined;
    Estado?: string | undefined;
}

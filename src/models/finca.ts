/**
 * Entidad de Finca en la base de datos SQL Server.
 */
export interface Finca {
    IdFinca?: number | undefined;
    IdMunicipio?: number | undefined;
    NumeroDocumentoUsuario?: number | undefined;
    NombreFinca?: string | undefined;
    Direccion?: string | undefined;
    InformacionAdicional?: string | undefined;
    Capacidad?: number | undefined;
    Precio?: number | undefined;
    Estado?: string | undefined;
    Calificacion?: number | undefined;
    NombreMunicipio?: string | undefined;
    IdPropietario?: number | undefined;
    NombrePropietario?: string | undefined;
    ApellidoPropietario?: string | undefined;
    TelefonoPropietario?: string | undefined;
    CorreoPropietario?: string | undefined;
    Dueno?: string | undefined;
}

/**
 * DTO para la creación de una Finca.
 */
export interface CrearFincaDto {
    IdMunicipio: number;
    NumeroDocumentoUsuario: number;
    NombreFinca: string;
    Direccion: string;
    InformacionAdicional?: string | undefined;
    Capacidad: number;
    Precio: number;
    Estado?: string | undefined;
    Calificacion?: number | undefined;
}

/**
 * DTO para la actualización de una Finca.
 */
export interface ActualizarFincaDto {
    IdFinca?: number | undefined;
    IdMunicipio?: number | undefined;
    NumeroDocumentoUsuario?: number | undefined;
    NombreFinca?: string | undefined;
    Direccion?: string | undefined;
    InformacionAdicional?: string | undefined;
    Capacidad?: number | undefined;
    Precio?: number | undefined;
    Estado?: string | undefined;
    Calificacion?: number | undefined;
}

// Interfaces de reportes estadísticos
export interface FincaReservada {
    NombreFinca: string;
    CantidadReservas: number;
}

export interface FincaPromedioCalificacion {
    NombreFinca: string;
    PromedioCalificacion: number;
}

export interface FincaIngresos {
    NombreFinca: string;
    TotalIngresos: number;
}

export interface FincaIngresosTop {
    NombreFinca: string;
    IngresosTotales: number;
}

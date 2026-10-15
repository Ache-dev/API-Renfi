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
    // Ficha completa
    Habitaciones?: number | undefined;
    Banos?: number | undefined;
    Camas?: number | undefined;
    NochesMinimas?: number | undefined;
    Comodidades?: string[] | undefined;
    Reglas?: string | null | undefined;
    HoraEntrada?: string | null | undefined; // HH:MM
    HoraSalida?: string | null | undefined; // HH:MM
    PermiteMascotas?: boolean | undefined;
    PermiteEventos?: boolean | undefined;
    Latitud?: number | null | undefined;
    Longitud?: number | null | undefined;
    UrlPortada?: string | null | undefined;
    Imagenes?: { IdImagen: number; UrlImagen: string; IdFinca: number; Orden?: number; EsPortada?: boolean; TextoAlternativo?: string | null; Ancho?: number | null; Alto?: number | null }[] | undefined;
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
    // Ficha completa: Comodidades acepta lista o texto separado por comas
    Habitaciones?: number | string | undefined;
    Banos?: number | string | undefined;
    Camas?: number | string | undefined;
    NochesMinimas?: number | string | undefined;
    Comodidades?: string[] | string | undefined;
    Reglas?: string | null | undefined;
    HoraEntrada?: string | null | undefined;
    HoraSalida?: string | null | undefined;
    PermiteMascotas?: boolean | string | undefined;
    PermiteEventos?: boolean | string | undefined;
    Latitud?: number | string | null | undefined;
    Longitud?: number | string | null | undefined;
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
    // Ficha completa: Comodidades acepta lista o texto separado por comas
    Habitaciones?: number | string | undefined;
    Banos?: number | string | undefined;
    Camas?: number | string | undefined;
    NochesMinimas?: number | string | undefined;
    Comodidades?: string[] | string | undefined;
    Reglas?: string | null | undefined;
    HoraEntrada?: string | null | undefined;
    HoraSalida?: string | null | undefined;
    PermiteMascotas?: boolean | string | undefined;
    PermiteEventos?: boolean | string | undefined;
    Latitud?: number | string | null | undefined;
    Longitud?: number | string | null | undefined;
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

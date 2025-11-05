export interface Finca {
    IdFinca?: number;
    IdMunicipio?: number;
    NumeroDocumentoUsuario?: number;
    NombreFinca?: string;
    Direccion?: string;
    InformacionAdicional?: string;
    Capacidad?: number;
    Precio?: number;
    Estado?: string; // 'Disponible' | 'No Disponible' | 'Mantenimiento'
    Calificacion?: number;
    // Campos adicionales para listados que hacen JOIN
    NombreMunicipio?: string;
    Dueno?: string;
}
export interface Finca {
    IdFinca: number;
    IdMunicipio?: number;
    IdImagen?: number;
    NombreFinca?: string;
    Direccion?: string;
    InformacionAdicional?: string;
    Capacidad?: number;
    Precio?: number;
    Estado?: boolean;
    Calificacion?: number;
    UsuarioId?: number;
}
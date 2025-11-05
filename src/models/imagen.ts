export interface Imagen {
    IdImagen?: number;
    UrlImagen: string;
    IdFinca: number;
    // Campo adicional para listados con JOIN
    NombreFinca?: string;
}
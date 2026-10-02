/**
 * Entidad de Imagen en la base de datos SQL Server.
 */
export interface Imagen {
    IdImagen?: number;
    UrlImagen: string;
    IdFinca: number;
    NombreFinca?: string;
}

export interface CrearImagenDto {
    UrlImagen: string;
    IdFinca: number;
}

export interface ActualizarImagenDto {
    IdImagen?: number;
    UrlImagen?: string;
    IdFinca?: number;
}

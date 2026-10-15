/**
 * Imagen de una finca. Puede estar alojada en Supabase Storage (RutaStorage)
 * o ser una URL externa heredada (UrlImagen). UrlImagen siempre llega a los
 * clientes con la URL final lista para mostrar.
 */
export interface Imagen {
    IdImagen?: number | undefined;
    UrlImagen: string;
    IdFinca: number;
    NombreFinca?: string | undefined;
    RutaStorage?: string | null | undefined;
    Orden?: number | undefined;
    EsPortada?: boolean | undefined;
    TextoAlternativo?: string | null | undefined;
    TipoMime?: string | null | undefined;
    TamanoBytes?: number | null | undefined;
    Ancho?: number | null | undefined;
    Alto?: number | null | undefined;
    FechaCreacion?: string | undefined;
}

/**
 * Datos para guardar una imagen nueva (la subida de archivos la arma el servicio).
 */
export interface NuevaImagen {
    IdFinca: number;
    UrlImagen?: string | null;
    RutaStorage?: string | null;
    EsPortada: boolean;
    TextoAlternativo?: string | null;
    TipoMime?: string | null;
    TamanoBytes?: number | null;
    Ancho?: number | null;
    Alto?: number | null;
}

export interface CrearImagenDto {
    UrlImagen: string;
    IdFinca: number;
    TextoAlternativo?: string | undefined;
    EsPortada?: boolean | string | undefined;
}

export interface ActualizarImagenDto {
    IdImagen?: number | undefined;
    UrlImagen?: string | undefined;
    IdFinca?: number | undefined;
    TextoAlternativo?: string | null | undefined;
    Orden?: number | string | undefined;
    EsPortada?: boolean | string | undefined;
}

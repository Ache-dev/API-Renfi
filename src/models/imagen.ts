/**
 * Imagen de una finca, alojada en Supabase Storage (RutaStorage).
 * UrlImagen no es una columna: la API la calcula con la URL pública del archivo
 * para que los clientes la muestren directamente.
 */
export interface Imagen {
    IdImagen?: number | undefined;
    UrlImagen: string;
    IdFinca: number;
    NombreFinca?: string | undefined;
    RutaStorage?: string | undefined;
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
    RutaStorage: string;
    EsPortada: boolean;
    TextoAlternativo?: string | null;
    TipoMime?: string | null;
    TamanoBytes?: number | null;
    Ancho?: number | null;
    Alto?: number | null;
}

export interface ActualizarImagenDto {
    IdImagen?: number | undefined;
    IdFinca?: number | undefined;
    TextoAlternativo?: string | null | undefined;
    Orden?: number | string | undefined;
    EsPortada?: boolean | string | undefined;
}

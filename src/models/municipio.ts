/**
 * Entidad de Municipio en la base de datos SQL Server.
 */
export interface Municipio {
    IdMunicipio?: number;
    NombreMunicipio: string;
}

export interface MunicipioReporte {
    NombreMunicipio: string;
    CantidadReservas: number;
}

export interface CrearMunicipioDto {
    NombreMunicipio: string;
}

export interface ActualizarMunicipioDto {
    IdMunicipio?: number;
    NombreMunicipio?: string;
}
}
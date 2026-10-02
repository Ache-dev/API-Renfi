/**
 * Entidad de Rol en la base de datos SQL Server.
 */
export interface Rol {
    IdRol?: number;
    NombreRol: string;
}

export interface CrearRolDto {
    NombreRol: string;
}

export interface ActualizarRolDto {
    IdRol?: number;
    NombreRol?: string;
}

export default Rol;


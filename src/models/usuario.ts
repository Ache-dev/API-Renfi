/**
 * Entidad de Usuario en la base de datos SQL Server.
 */
export interface Usuario {
    NumeroDocumento?: number | undefined; // PK en DB (Identity)
    IdRol?: number | undefined;
    NombreUsuario: string;
    ApellidoUsuario: string;
    Telefono?: string | undefined;
    Contrasena?: string | undefined;
    Correo: string;
    Estado?: string | undefined;
    NombreRol?: string | undefined;
}

/**
 * DTO para la respuesta estandarizada y normalizada de usuario hacia el cliente / frontend.
 */
export interface UsuarioNormalizado {
    IdUsuario?: number | undefined;
    NumeroDocumento?: number | undefined;
    NombreUsuario?: string | undefined;
    ApellidoUsuario?: string | undefined;
    Telefono?: string | undefined;
    Correo?: string | undefined;
    Estado?: string | undefined;
    IdRol?: number | undefined;
    NombreRol?: string | undefined;
    Rol?: string | undefined;
}

/**
 * DTO para el registro de un nuevo usuario.
 */
export interface RegistroUsuarioDto {
    IdRol?: number | undefined;
    NombreUsuario: string;
    ApellidoUsuario: string;
    Telefono?: string | undefined;
    Contrasena: string;
    Correo: string;
    Estado?: string | undefined;
}

/**
 * DTO para el inicio de sesión.
 */
export interface LoginDto {
    correo?: string | undefined;
    Correo?: string | undefined;
    contrasena?: string | undefined;
    Contrasena?: string | undefined;
}

/**
 * DTO para la actualización de un usuario.
 */
export interface ActualizarUsuarioDto {
    NumeroDocumento?: number | undefined;
    IdRol?: number | undefined;
    NombreUsuario?: string | undefined;
    ApellidoUsuario?: string | undefined;
    Telefono?: string | undefined;
    Contrasena?: string | undefined;
    Correo?: string | undefined;
    Estado?: string | undefined;
}

/**
 * Respuesta del endpoint de login.
 */
export interface LoginResponseDto {
    message: string;
    token?: string | undefined;
    usuario: UsuarioNormalizado;
}

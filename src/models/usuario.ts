export interface Usuario {
    IdUsuario: number;
    NombreUsuario: string;
    ApellidoUsuario: string;
    Telefono?: string;
    Correo: string;
    Contraseña: string;
    Rol: string;
}
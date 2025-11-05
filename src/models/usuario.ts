export interface Usuario {
    NumeroDocumento?: number; // PK en DB
    IdRol?: number;
    NombreUsuario: string;
    ApellidoUsuario: string;
    Telefono?: string;
    Contrasena: string;
    Correo: string;
    Estado?: string;
    // Campo adicional cuando se hace JOIN con Rol en listados
    NombreRol?: string;
}
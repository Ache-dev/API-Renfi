import jwt from 'jsonwebtoken';
import * as usuarioDao from '../dao/usuario.dao';
import { 
    Usuario, 
    UsuarioNormalizado, 
    RegistroUsuarioDto, 
    ActualizarUsuarioDto, 
    LoginResponseDto 
} from '../models/usuario';
import envConfig from '../config/env.config';
import { AppError } from '../middlewares/error.middleware';

/**
 * Normaliza un usuario de la base de datos para garantizar compatibilidad total
 * con las interfaces de Angular (Renfi) y cualquier cliente HTTP.
 */
export const normalizarUsuario = (usuario: Usuario): UsuarioNormalizado => {
    const rolNombre = usuario.NombreRol || (usuario.IdRol === 1 ? 'Administrador' : 'Cliente');
    return {
        IdUsuario: usuario.NumeroDocumento,
        NumeroDocumento: usuario.NumeroDocumento,
        NombreUsuario: usuario.NombreUsuario,
        ApellidoUsuario: usuario.ApellidoUsuario,
        Telefono: usuario.Telefono || '',
        Correo: usuario.Correo,
        Estado: usuario.Estado || 'Activo',
        IdRol: usuario.IdRol,
        NombreRol: rolNombre,
        Rol: rolNombre
    };
};

/**
 * Genera un token JWT para la sesión del usuario.
 */
export const generarToken = (usuario: UsuarioNormalizado): string => {
    return jwt.sign(
        {
            NumeroDocumento: usuario.NumeroDocumento,
            IdUsuario: usuario.IdUsuario,
            Correo: usuario.Correo,
            IdRol: usuario.IdRol,
            NombreRol: usuario.NombreRol,
            NombreUsuario: usuario.NombreUsuario
        },
        envConfig.JWT.SECRET,
        { expiresIn: envConfig.JWT.EXPIRES_IN } as jwt.SignOptions
    );
};

/**
 * Autentica un usuario mediante correo y contraseña.
 */
export const login = async (correoRaw: string, contrasenaRaw: string): Promise<LoginResponseDto> => {
    const correo = (correoRaw || '').trim().toLowerCase();
    const contrasena = contrasenaRaw || '';

    if (!correo || !contrasena) {
        throw new AppError('Correo y contraseña son requeridos para iniciar sesión', 400);
    }

    const usuario = await usuarioDao.login(correo, contrasena);
    if (!usuario) {
        // Verificar si existe el correo pero la contraseña es incorrecta o está inactivo
        const existente = await usuarioDao.buscarPorCorreo(correo);
        if (existente && existente.Estado && existente.Estado.toLowerCase() !== 'activo') {
            throw new AppError('El usuario se encuentra inactivo o suspendido. Contacta al administrador.', 401);
        }
        throw new AppError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
    }

    const usuarioNormalizado = normalizarUsuario(usuario);
    const token = generarToken(usuarioNormalizado);

    return {
        message: 'Inicio de sesión exitoso',
        token,
        usuario: usuarioNormalizado
    };
};

/**
 * Obtiene todos los usuarios normalizados.
 */
export const getUsuarios = async (): Promise<UsuarioNormalizado[]> => {
    const usuarios = await usuarioDao.listar();
    return usuarios.map(normalizarUsuario);
};

/**
 * Busca un usuario por su identificador.
 */
export const buscarPorId = async (id: number): Promise<UsuarioNormalizado | null> => {
    const usuario = await usuarioDao.buscarPorId(id);
    if (!usuario) {
        return null;
    }
    return normalizarUsuario(usuario);
};

/**
 * Registra un nuevo usuario con validaciones de negocio.
 */
export const crearUsuario = async (dto: RegistroUsuarioDto): Promise<{ id: number; usuario: UsuarioNormalizado }> => {
    if (!dto.NombreUsuario || !dto.ApellidoUsuario || !dto.Correo || !dto.Contrasena) {
        throw new AppError('Los campos NombreUsuario, ApellidoUsuario, Correo y Contrasena son obligatorios', 400);
    }

    const correo = dto.Correo.trim().toLowerCase();
    const existente = await usuarioDao.buscarPorCorreo(correo);
    if (existente) {
        throw new AppError(`El correo '${correo}' ya se encuentra registrado.`, 400);
    }

    const usuarioParaInsertar: Usuario = {
        IdRol: dto.IdRol ?? 2,
        NombreUsuario: dto.NombreUsuario.trim(),
        ApellidoUsuario: dto.ApellidoUsuario.trim(),
        Telefono: dto.Telefono?.trim() || '',
        Contrasena: dto.Contrasena,
        Correo: correo,
        Estado: dto.Estado || 'Activo'
    };

    const id = await usuarioDao.insertar(usuarioParaInsertar);
    const creado = await usuarioDao.buscarPorId(id);
    const usuarioNormalizado = creado ? normalizarUsuario(creado) : normalizarUsuario({ ...usuarioParaInsertar, NumeroDocumento: id });

    return {
        id,
        usuario: usuarioNormalizado
    };
};

/**
 * Actualiza un usuario existente permitiendo actualizaciones parciales (PATCH/PUT).
 */
export const actualizarUsuario = async (id: number, dto: ActualizarUsuarioDto): Promise<UsuarioNormalizado> => {
    const existente = await usuarioDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Usuario con ID ${id} no encontrado`, 404);
    }

    // Combinar datos existentes con los nuevos campos para soportar actualizaciones parciales
    const usuarioActualizado: Usuario = {
        NumeroDocumento: id,
        IdRol: dto.IdRol !== undefined ? dto.IdRol : existente.IdRol,
        NombreUsuario: dto.NombreUsuario !== undefined ? dto.NombreUsuario.trim() : existente.NombreUsuario,
        ApellidoUsuario: dto.ApellidoUsuario !== undefined ? dto.ApellidoUsuario.trim() : existente.ApellidoUsuario,
        Telefono: dto.Telefono !== undefined ? dto.Telefono.trim() : existente.Telefono,
        Contrasena: dto.Contrasena !== undefined && dto.Contrasena.trim() !== '' ? dto.Contrasena : existente.Contrasena,
        Correo: dto.Correo !== undefined ? dto.Correo.trim().toLowerCase() : existente.Correo,
        Estado: dto.Estado !== undefined ? dto.Estado : existente.Estado
    };

    await usuarioDao.actualizar(usuarioActualizado);
    const actualizado = await usuarioDao.buscarPorId(id);
    return actualizado ? normalizarUsuario(actualizado) : normalizarUsuario(usuarioActualizado);
};

/**
 * Elimina un usuario por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await usuarioDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Usuario con ID ${id} no encontrado`, 404);
    }
    await usuarioDao.eliminarPorId(id);
};


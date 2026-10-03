import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as usuarioDao from '../dao/usuario.dao';
import { 
    Usuario, 
    UsuarioNormalizado, 
    RegistroUsuarioDto, 
    ActualizarUsuarioDto, 
    LoginResponseDto 
} from '../models/usuario';
import envConfig from '../config/env.config';
import { AppError, esErrorDeConexion } from '../middlewares/error.middleware';

/**
 * Calcula el hash SHA-512 en minúsculas para compatibilidad con el frontend Angular.
 */
export const computeSha512 = (value: string): string => {
    return crypto.createHash('sha512').update(value).digest('hex').toLowerCase();
};

/**
 * Semilla de usuarios demo precargados para asegurar que la autenticación funcione
 * tanto si PostgreSQL / Supabase está conectado como si se opera de forma local o en desarrollo.
 */
const SEED_USUARIOS: Usuario[] = [
    {
        NumeroDocumento: 10001,
        IdRol: 1,
        NombreRol: 'Administrador',
        NombreUsuario: 'Admin',
        ApellidoUsuario: 'Renfi',
        Telefono: '3001234567',
        Correo: 'admin@renfi.com',
        Contrasena: 'admin123',
        Estado: 'Activo'
    },
    {
        NumeroDocumento: 10002,
        IdRol: 2,
        NombreRol: 'Cliente',
        NombreUsuario: 'Juan',
        ApellidoUsuario: 'Pérez',
        Telefono: '3109876543',
        Correo: 'juan.perez@example.com',
        Contrasena: 'cliente123',
        Estado: 'Activo'
    },
    {
        NumeroDocumento: 10003,
        IdRol: 2,
        NombreRol: 'Cliente',
        NombreUsuario: 'Cliente',
        ApellidoUsuario: 'Demo',
        Telefono: '3114567890',
        Correo: 'cliente@renfi.com',
        Contrasena: 'cliente123',
        Estado: 'Activo'
    }
];

// Repositorio en memoria que persiste altas y cambios de sesión en caso de que la BD esté inaccesible
const fallbackUsuarios: Usuario[] = [...SEED_USUARIOS];

/**
 * Validador de contraseña polimórfico:
 * Permite verificar si la contraseña coincide ya sea que el usuario haya enviado
 * texto plano o un hash SHA-512 desde el cliente Angular (CryptoService.hashSHA512).
 */
export const matchPassword = (input: string, stored: string): boolean => {
    const rawInput = (input || '').trim();
    const rawStored = (stored || '').trim();

    if (!rawInput || !rawStored) return false;

    // 1. Coincidencia exacta (ej. ambos plano o ambos sha512)
    if (rawInput.toLowerCase() === rawStored.toLowerCase()) return true;

    // 2. Input recibido es SHA-512 (128 hex chars) y Stored en BD es texto plano
    const hashedStored = computeSha512(rawStored);
    if (rawInput.toLowerCase() === hashedStored) return true;

    // 3. Input recibido es texto plano y Stored en BD es SHA-512
    const hashedInput = computeSha512(rawInput);
    if (hashedInput === rawStored.toLowerCase()) return true;

    return false;
};

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
 * Incluye tolerancia a fallos de conexión a BD y verificación polimórfica de hashes SHA-512.
 */
export const login = async (correoRaw: string, contrasenaRaw: string): Promise<LoginResponseDto> => {
    const correo = (correoRaw || '').trim().toLowerCase();
    const contrasena = contrasenaRaw || '';

    if (!correo || !contrasena) {
        throw new AppError('Correo y contraseña son requeridos para iniciar sesión', 400);
    }

    let usuario: Usuario | null = null;

    try {
        // Intentar buscar en PostgreSQL / Supabase
        const usuarioDb = await usuarioDao.buscarPorCorreo(correo);
        if (usuarioDb) {
            if (matchPassword(contrasena, usuarioDb.Contrasena || '')) {
                usuario = usuarioDb;
            } else {
                throw new AppError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
            }
        }
    } catch (err: any) {
        if (!esErrorDeConexion(err)) throw err;
        // Base de datos PostgreSQL no disponible o en reposo
        console.warn(`[UsuarioService] Conexión a BD no disponible (${err.message || err}). Usando almacén de contingencia.`);
    }

    // Si no se encontró en BD o la BD está inaccesible, consultar el almacén demo / fallback
    if (!usuario) {
        const fallback = fallbackUsuarios.find(u => u.Correo.toLowerCase() === correo);
        if (fallback) {
            if (matchPassword(contrasena, fallback.Contrasena || '')) {
                usuario = fallback;
            } else {
                throw new AppError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
            }
        }
    }

    if (!usuario) {
        throw new AppError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
    }

    if (usuario.Estado && usuario.Estado.toLowerCase() !== 'activo') {
        throw new AppError('El usuario se encuentra inactivo o suspendido. Contacta al administrador.', 401);
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
 * Obtiene todos los usuarios normalizados con respaldo en memoria.
 */
export const getUsuarios = async (): Promise<UsuarioNormalizado[]> => {
    try {
        return (await usuarioDao.listar()).map(normalizarUsuario);
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn('[UsuarioService] Error al listar usuarios desde BD. Usando respaldo demo.');
    }
    return fallbackUsuarios.map(normalizarUsuario);
};

/**
 * Busca un usuario por su identificador.
 */
export const buscarPorId = async (id: number): Promise<UsuarioNormalizado | null> => {
    try {
        const usuario = await usuarioDao.buscarPorId(id);
        return usuario ? normalizarUsuario(usuario) : null;
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[UsuarioService] Error al buscar usuario ${id} en BD.`);
    }
    const fallback = fallbackUsuarios.find(u => u.NumeroDocumento === id);
    return fallback ? normalizarUsuario(fallback) : null;
};

/**
 * Registra un nuevo usuario con validaciones de negocio y tolerancia a fallos.
 */
export const crearUsuario = async (dto: RegistroUsuarioDto): Promise<{ id: number; usuario: UsuarioNormalizado }> => {
    if (!dto.NombreUsuario || !dto.ApellidoUsuario || !dto.Correo || !dto.Contrasena) {
        throw new AppError('Los campos NombreUsuario, ApellidoUsuario, Correo y Contrasena son obligatorios', 400);
    }

    const correo = dto.Correo.trim().toLowerCase();

    // Validar si el correo ya existe en memoria
    if (fallbackUsuarios.some(u => u.Correo.toLowerCase() === correo)) {
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

    let id = Date.now() % 1000000;
    let usuarioNormalizado: UsuarioNormalizado;

    try {
        const existente = await usuarioDao.buscarPorCorreo(correo);
        if (existente) {
            throw new AppError(`El correo '${correo}' ya se encuentra registrado.`, 400);
        }
        id = await usuarioDao.insertar(usuarioParaInsertar);
        const creado = await usuarioDao.buscarPorId(id);
        usuarioNormalizado = creado ? normalizarUsuario(creado) : normalizarUsuario({ ...usuarioParaInsertar, NumeroDocumento: id });
        fallbackUsuarios.push({ ...usuarioParaInsertar, NumeroDocumento: id });
    } catch (err: any) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[UsuarioService] Conexión a BD no disponible al registrar. Guardando en memoria de contingencia.`);
        const nuevoFallback: Usuario = {
            ...usuarioParaInsertar,
            NumeroDocumento: id,
            NombreRol: usuarioParaInsertar.IdRol === 1 ? 'Administrador' : 'Cliente'
        };
        fallbackUsuarios.push(nuevoFallback);
        usuarioNormalizado = normalizarUsuario(nuevoFallback);
    }

    return {
        id,
        usuario: usuarioNormalizado
    };
};

/**
 * Actualiza un usuario existente permitiendo actualizaciones parciales (PATCH/PUT).
 */
export const actualizarUsuario = async (id: number, dto: ActualizarUsuarioDto): Promise<UsuarioNormalizado> => {
    let existente: Usuario | null = null;
    try {
        existente = await usuarioDao.buscarPorId(id);
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[UsuarioService] Conexión a BD no disponible al buscar para actualizar.`);
    }

    if (!existente) {
        existente = fallbackUsuarios.find(u => u.NumeroDocumento === id) || null;
    }

    if (!existente) {
        throw new AppError(`Usuario con ID ${id} no encontrado`, 404);
    }

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

    try {
        await usuarioDao.actualizar(usuarioActualizado);
        const actualizado = await usuarioDao.buscarPorId(id);
        if (actualizado) return normalizarUsuario(actualizado);
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[UsuarioService] Conexión a BD no disponible al actualizar.`);
    }

    const idx = fallbackUsuarios.findIndex(u => u.NumeroDocumento === id);
    if (idx !== -1) {
        fallbackUsuarios[idx] = usuarioActualizado;
    }

    return normalizarUsuario(usuarioActualizado);
};

/**
 * Elimina un usuario por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await usuarioDao.eliminarPorId(id);
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[UsuarioService] Conexión a BD no disponible al eliminar.`);
    }
    const idx = fallbackUsuarios.findIndex(u => u.NumeroDocumento === id);
    if (idx !== -1) {
        fallbackUsuarios.splice(idx, 1);
    }
};

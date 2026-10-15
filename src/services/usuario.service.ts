import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
import { huellaContrasena, esNombreRolDueno, ROL_DUENO } from '../middlewares/auth.middleware';
import * as rolDao from '../dao/rol.dao';

const BCRYPT_ROUNDS = 10;
const ES_SHA512 = /^[0-9a-f]{128}$/i;

/**
 * Calcula el hash SHA-512 en minúsculas (formato que envían los clientes Angular y Expo).
 */
export const computeSha512 = (value: string): string => {
    return crypto.createHash('sha512').update(value).digest('hex').toLowerCase();
};

/**
 * Los clientes pueden enviar la contraseña en claro o ya como SHA-512; se normaliza a SHA-512.
 */
const normalizar = (valor: string): string => {
    const v = (valor || '').trim();
    return ES_SHA512.test(v) ? v.toLowerCase() : computeSha512(v);
};

// bcrypt solo lee los primeros 72 bytes: se le pasa un SHA-256 (64 caracteres) del SHA-512 normalizado.
const paraBcrypt = (valor: string): string => crypto.createHash('sha256').update(normalizar(valor)).digest('hex');

/**
 * Hash para guardar en la base de datos: bcrypt(sha256(sha512(contraseña))).
 */
export const hashContrasena = (valor: string): Promise<string> => bcrypt.hash(paraBcrypt(valor), BCRYPT_ROUNDS);

/**
 * Verifica una contraseña contra lo almacenado.
 * - Almacenado con bcrypt: comparación segura.
 * - Almacenado heredado (texto plano o SHA-512 sin sal): se acepta y se pide migrarlo a bcrypt.
 */
export const verificarContrasena = async (input: string, almacenado: string): Promise<{ ok: boolean; migrar: boolean }> => {
    const rawInput = (input || '').trim();
    const rawStored = (almacenado || '').trim();
    if (!rawInput || !rawStored) return { ok: false, migrar: false };

    if (rawStored.startsWith('$2')) {
        return { ok: await bcrypt.compare(paraBcrypt(rawInput), rawStored), migrar: false };
    }

    const legado = rawStored.toLowerCase();
    // Cubre: ambos iguales, almacenado SHA-512 con entrada en claro, y almacenado en claro con entrada SHA-512
    const ok = rawInput.toLowerCase() === legado || normalizar(rawInput) === legado || computeSha512(rawStored) === rawInput.toLowerCase();
    return { ok, migrar: ok };
};

/**
 * Normaliza un usuario de la base de datos para los clientes (nunca incluye la contraseña).
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
export const generarToken = (usuario: UsuarioNormalizado, contrasenaAlmacenada: string): string => {
    return jwt.sign(
        {
            NumeroDocumento: usuario.NumeroDocumento,
            IdUsuario: usuario.IdUsuario,
            Correo: usuario.Correo,
            IdRol: usuario.IdRol,
            NombreRol: usuario.NombreRol,
            NombreUsuario: usuario.NombreUsuario,
            pv: huellaContrasena(contrasenaAlmacenada)
        },
        envConfig.JWT.SECRET,
        { expiresIn: envConfig.JWT.EXPIRES_IN } as jwt.SignOptions
    );
};

const CREDENCIALES_INVALIDAS = 'Credenciales inválidas. Verifica tu correo y contraseña.';

/**
 * Autentica un usuario mediante correo y contraseña.
 */
export const login = async (correoRaw: string, contrasenaRaw: string): Promise<LoginResponseDto> => {
    const correo = (correoRaw || '').trim().toLowerCase();
    const contrasena = contrasenaRaw || '';

    if (!correo || !contrasena) {
        throw new AppError('Correo y contraseña son requeridos para iniciar sesión', 400);
    }

    const usuario = await usuarioDao.buscarPorCorreo(correo);
    if (!usuario) throw new AppError(CREDENCIALES_INVALIDAS, 401);

    const { ok, migrar } = await verificarContrasena(contrasena, usuario.Contrasena || '');
    if (!ok) throw new AppError(CREDENCIALES_INVALIDAS, 401);

    if (usuario.Estado && usuario.Estado.toLowerCase() !== 'activo') {
        throw new AppError('El usuario se encuentra inactivo o suspendido. Contacta al administrador.', 401);
    }

    // Migración transparente de contraseñas heredadas (texto plano / SHA-512) a bcrypt
    let almacenada = usuario.Contrasena || '';
    if (migrar) {
        almacenada = await hashContrasena(contrasena);
        await usuarioDao.actualizar({ ...usuario, Contrasena: almacenada });
    }

    const usuarioNormalizado = normalizarUsuario(usuario);
    return {
        message: 'Inicio de sesión exitoso',
        token: generarToken(usuarioNormalizado, almacenada),
        usuario: usuarioNormalizado
    };
};

/**
 * Obtiene todos los usuarios normalizados.
 */
export const getUsuarios = async (): Promise<UsuarioNormalizado[]> => {
    return (await usuarioDao.listar()).map(normalizarUsuario);
};

/**
 * Busca un usuario por su identificador.
 */
export const buscarPorId = async (id: number): Promise<UsuarioNormalizado | null> => {
    const usuario = await usuarioDao.buscarPorId(id);
    return usuario ? normalizarUsuario(usuario) : null;
};

/**
 * Registra un nuevo usuario. Solo un administrador puede elegir rol y estado;
 * el registro público siempre crea un Cliente activo.
 */
export const crearUsuario = async (
    dto: RegistroUsuarioDto,
    quienCrea?: { esAdmin: boolean }
): Promise<{ id: number; usuario: UsuarioNormalizado }> => {
    if (!dto.NombreUsuario || !dto.ApellidoUsuario || !dto.Correo || !dto.Contrasena) {
        throw new AppError('Los campos NombreUsuario, ApellidoUsuario, Correo y Contrasena son obligatorios', 400);
    }

    const correo = dto.Correo.trim().toLowerCase();
    if (await usuarioDao.buscarPorCorreo(correo)) {
        throw new AppError(`El correo '${correo}' ya se encuentra registrado.`, 409);
    }

    const admin = Boolean(quienCrea?.esAdmin);

    // El registro público elige entre cliente (por defecto) y dueño de finca; el rol administrador no se pide por aquí
    let idRol = admin ? (dto.IdRol ?? 2) : 2;
    if (!admin && String(dto.TipoCuenta ?? '').toLowerCase() === 'dueno') {
        const rolDueno = (await rolDao.listar()).find((r) => esNombreRolDueno(r.NombreRol));
        if (!rolDueno?.IdRol) throw new AppError(`El rol '${ROL_DUENO}' no existe en la base de datos. Aplica db/migraciones/003.`, 500);
        idRol = rolDueno.IdRol;
    }

    const id = await usuarioDao.insertar({
        IdRol: idRol,
        NombreUsuario: dto.NombreUsuario.trim(),
        ApellidoUsuario: dto.ApellidoUsuario.trim(),
        Telefono: dto.Telefono?.trim() || '',
        Contrasena: await hashContrasena(dto.Contrasena),
        Correo: correo,
        Estado: admin ? (dto.Estado || 'Activo') : 'Activo'
    });

    const creado = await usuarioDao.buscarPorId(id);
    if (!creado) throw new AppError('No se pudo leer el usuario recién creado.', 500);
    return { id, usuario: normalizarUsuario(creado) };
};

/**
 * Actualiza un usuario permitiendo cambios parciales. Un usuario normal solo puede
 * cambiar nombre, apellido, teléfono y contraseña; rol, estado y correo son del administrador.
 */
export const actualizarUsuario = async (
    id: number,
    dto: ActualizarUsuarioDto,
    quienActualiza?: { esAdmin: boolean }
): Promise<UsuarioNormalizado> => {
    const existente = await usuarioDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Usuario con ID ${id} no encontrado`, 404);
    }

    const admin = Boolean(quienActualiza?.esAdmin);
    const nuevoCorreo = admin && dto.Correo !== undefined ? dto.Correo.trim().toLowerCase() : existente.Correo;
    if (nuevoCorreo.toLowerCase() !== existente.Correo.toLowerCase()) {
        const otro = await usuarioDao.buscarPorCorreo(nuevoCorreo);
        if (otro && otro.NumeroDocumento !== id) throw new AppError(`El correo '${nuevoCorreo}' ya se encuentra registrado.`, 409);
    }

    await usuarioDao.actualizar({
        NumeroDocumento: id,
        IdRol: admin && dto.IdRol !== undefined ? dto.IdRol : existente.IdRol,
        NombreUsuario: dto.NombreUsuario !== undefined ? dto.NombreUsuario.trim() : existente.NombreUsuario,
        ApellidoUsuario: dto.ApellidoUsuario !== undefined ? dto.ApellidoUsuario.trim() : existente.ApellidoUsuario,
        Telefono: dto.Telefono !== undefined ? dto.Telefono.trim() : existente.Telefono,
        Contrasena: dto.Contrasena !== undefined && dto.Contrasena.trim() !== '' ? await hashContrasena(dto.Contrasena) : existente.Contrasena,
        Correo: nuevoCorreo,
        Estado: admin && dto.Estado !== undefined ? dto.Estado : existente.Estado
    });

    const actualizado = await usuarioDao.buscarPorId(id);
    return normalizarUsuario(actualizado ?? existente);
};

/**
 * Elimina un usuario por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await usuarioDao.eliminarPorId(id);
};

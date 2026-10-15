import { test, after, before, mock } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { ready, baseUrl, stop } from './helpers';
import envConfig from '../src/config/env.config';
import * as usuarioDao from '../src/dao/usuario.dao';
import * as fincaDao from '../src/dao/finca.dao';
import { huellaContrasena } from '../src/middlewares/auth.middleware';

// Usuarios simulados: la validación del token consulta al usuario actual en la base de datos.
const usuarios: Record<number, any> = {
    1: { NumeroDocumento: 1, IdRol: 1, NombreRol: 'Administrador', NombreUsuario: 'Admin', Correo: 'a@a.com', Estado: 'Activo', Contrasena: '$2a$hash-admin' },
    2: { NumeroDocumento: 2, IdRol: 2, NombreRol: 'Cliente', NombreUsuario: 'Cli', Correo: 'c@c.com', Estado: 'Activo', Contrasena: '$2a$hash-cliente' },
};
const original = JSON.stringify(usuarios);

before(async () => {
    mock.method(usuarioDao, 'buscarPorId', async (id: number) => (usuarios[id] ? { ...usuarios[id] } : null));
    // La finca 1 es del administrador (documento 1)
    mock.method(fincaDao, 'propietarioDe', async (id: number) => (id === 1 ? 1 : null));
    await ready;
});
after(async () => {
    mock.restoreAll();
    await stop();
});
const restaurar = () => Object.assign(usuarios, JSON.parse(original));

const firmar = (p: object, secreto = envConfig.JWT.SECRET) => jwt.sign(p, secreto, { expiresIn: '5m' });
const tokenDe = (id: number, extra: object = {}) =>
    firmar({ NumeroDocumento: id, IdRol: usuarios[id].IdRol, pv: huellaContrasena(usuarios[id].Contrasena), ...extra });

const llamar = async (metodo: string, ruta: string, token?: string) =>
    (await fetch(`${baseUrl()}/api${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: metodo === 'GET' || metodo === 'DELETE' ? undefined : '{}'
    })).status;

test('un token firmado con otro secreto se rechaza', async () => {
    const falso = firmar({ NumeroDocumento: 1, IdRol: 1, pv: huellaContrasena(usuarios[1].Contrasena) }, 'otro-secreto-cualquiera-1234567890123456');
    assert.strictEqual(await llamar('GET', '/usuario', falso), 401);
});

test('un cliente no accede a recursos de administrador', async () => {
    for (const [m, r] of [
        ['GET', '/usuario'], ['GET', '/rol'], ['GET', '/reserva'], ['GET', '/factura'], ['GET', '/pago'],
        ['GET', '/pago/report/pendientes'], ['GET', '/finca/report/mas-ingresos'],
        ['POST', '/finca'], ['PUT', '/finca/1'], ['DELETE', '/finca/1'], ['POST', '/municipio'],
        ['DELETE', '/usuario/1'], ['DELETE', '/usuario/delete?id=1']
    ]) {
        assert.strictEqual(await llamar(m, r, tokenDe(2)), 403, `${m} ${r}`);
    }
});

test('un cliente solo ve sus propios datos', async () => {
    const t = tokenDe(2);
    assert.strictEqual(await llamar('GET', '/usuario/1', t), 403);
    assert.strictEqual(await llamar('PUT', '/usuario/1', t), 403);
    assert.strictEqual(await llamar('GET', '/reserva/usuario/1', t), 403);
});

test('escribir sin sesión se rechaza', async () => {
    for (const [m, r] of [['POST', '/reserva'], ['POST', '/pago'], ['PUT', '/reserva/1'], ['POST', '/finca']]) {
        assert.strictEqual(await llamar(m, r), 401, `${m} ${r}`);
    }
});

test('el administrador entra a los listados protegidos', async () => {
    for (const r of ['/usuario', '/rol', '/reserva']) {
        assert.strictEqual(await llamar('GET', r, tokenDe(1)), 200, r);
    }
});

// ---- Cancelación de tokens ----

test('un token cancelado por desactivar al usuario deja de valer al instante', async () => {
    restaurar();
    const t = tokenDe(1);
    assert.strictEqual(await llamar('GET', '/rol', t), 200);
    usuarios[1].Estado = 'Inactivo';
    assert.strictEqual(await llamar('GET', '/rol', t), 401);
    restaurar();
});

test('un token de un usuario eliminado se rechaza', async () => {
    restaurar();
    const t = tokenDe(2);
    delete usuarios[2];
    assert.strictEqual(await llamar('GET', '/metododepago', t), 401);
    restaurar();
});

test('cambiar la contraseña cancela los tokens anteriores', async () => {
    restaurar();
    const viejo = tokenDe(2);
    assert.strictEqual(await llamar('GET', '/metododepago', viejo), 200);
    usuarios[2].Contrasena = '$2a$hash-nueva';
    assert.strictEqual(await llamar('GET', '/metododepago', viejo), 401);
    assert.strictEqual(await llamar('GET', '/metododepago', tokenDe(2)), 200);
    restaurar();
});

test('quitar el rol de administrador surte efecto sin esperar a que el token venza', async () => {
    restaurar();
    const t = tokenDe(1); // el token dice IdRol 1
    assert.strictEqual(await llamar('GET', '/rol', t), 200);
    usuarios[1].IdRol = 2;
    assert.strictEqual(await llamar('GET', '/rol', t), 403);
    restaurar();
});

test('un token sin huella de contraseña (formato anterior) se rechaza', async () => {
    restaurar();
    const sinHuella = firmar({ NumeroDocumento: 1, IdRol: 1 });
    assert.strictEqual(await llamar('GET', '/rol', sinHuella), 401);
});

test('el registro con un token cancelado no otorga privilegios de administrador', async () => {
    restaurar();
    usuarios[1].Estado = 'Inactivo';
    // Sin permisos de admin, un IdRol:1 en el cuerpo se ignora y el registro sigue siendo anónimo (no devuelve 401/403)
    const status = await llamar('POST', '/usuario', tokenDe(1));
    assert.notStrictEqual(status, 401);
    assert.notStrictEqual(status, 403);
    restaurar();
});

import { test, after, before, mock } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { ready, baseUrl, stop } from './helpers';
import envConfig from '../src/config/env.config';
import * as usuarioDao from '../src/dao/usuario.dao';
import * as fincaDao from '../src/dao/finca.dao';
import * as imagenDao from '../src/dao/imagen.dao';
import * as reservaDao from '../src/dao/reserva.dao';
import * as fincaService from '../src/services/finca.service';
import * as reservaService from '../src/services/reserva.service';
import * as imagenService from '../src/services/imagen.service';
import { huellaContrasena, esNombreRolDueno } from '../src/middlewares/auth.middleware';

// Admin (1), cliente (2), dueño (3, finca 10) y otro dueño (4, finca 20). Todo simulado: estas pruebas no tocan la base.
const usuarios: Record<number, any> = {
    1: { NumeroDocumento: 1, IdRol: 1, NombreRol: 'Administrador', Correo: 'a@a.com', Estado: 'Activo', Contrasena: '$2a$h1' },
    2: { NumeroDocumento: 2, IdRol: 2, NombreRol: 'Cliente', Correo: 'c@c.com', Estado: 'Activo', Contrasena: '$2a$h2' },
    3: { NumeroDocumento: 3, IdRol: 3, NombreRol: 'Dueño de finca', Correo: 'd@d.com', Estado: 'Activo', Contrasena: '$2a$h3' },
    4: { NumeroDocumento: 4, IdRol: 3, NombreRol: 'Dueño de finca', Correo: 'e@e.com', Estado: 'Activo', Contrasena: '$2a$h4' },
};
const duenos: Record<number, number> = { 10: 3, 20: 4 }; // finca -> documento del dueño
const imagenes: Record<number, number> = { 100: 3, 200: 4 }; // imagen -> documento del dueño de su finca
const reservas: Record<number, number> = { 1000: 3, 2000: 4 }; // reserva -> documento del dueño de la finca

const llamadas: { fn: string; args: any[] }[] = [];
const registrar = (fn: string, respuesta: unknown = {}) => async (...args: any[]) => {
    llamadas.push({ fn, args });
    return respuesta;
};

before(async () => {
    mock.method(usuarioDao, 'buscarPorId', async (id: number) => (usuarios[id] ? { ...usuarios[id] } : null));
    mock.method(fincaDao, 'propietarioDe', async (id: number) => duenos[id] ?? null);
    mock.method(imagenDao, 'propietarioDe', async (id: number) => imagenes[id] ?? null);
    mock.method(reservaDao, 'buscarPorId', async (id: number) => (reservas[id] ? { IdReserva: id, IdPropietario: reservas[id] } : null));
    mock.method(fincaService, 'crearFinca', registrar('crearFinca', { id: 99, finca: null }));
    mock.method(fincaService, 'actualizarFinca', registrar('actualizarFinca', null));
    mock.method(fincaService, 'eliminarPorId', registrar('eliminarFinca'));
    mock.method(fincaService, 'getFincasDePropietario', registrar('misFincas', []));
    mock.method(imagenService, 'subirImagenFinca', registrar('subirImagen', { id: 1, IdImagen: 1, imagen: null }));
    mock.method(imagenService, 'actualizarImagen', registrar('actualizarImagen', null));
    mock.method(reservaService, 'listarPorPropietario', registrar('misReservas', []));
    mock.method(reservaService, 'cambiarEstado', registrar('cambiarEstado', null));
    await ready;
});
after(async () => {
    mock.restoreAll();
    await stop();
});

const tokenDe = (id: number) =>
    jwt.sign({ NumeroDocumento: id, IdRol: usuarios[id].IdRol, pv: huellaContrasena(usuarios[id].Contrasena) }, envConfig.JWT.SECRET, { expiresIn: '5m' });

const llamar = async (metodo: string, ruta: string, id?: number, cuerpo: object = {}) => {
    llamadas.length = 0;
    const r = await fetch(`${baseUrl()}/api${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${tokenDe(id)}` } : {}) },
        body: metodo === 'GET' || metodo === 'DELETE' ? undefined : JSON.stringify(cuerpo)
    });
    return r.status;
};
const ultima = (fn: string) => llamadas.find((l) => l.fn === fn);

test('el rol se reconoce por nombre, con o sin tildes, y acepta el nombre heredado', () => {
    assert.ok(esNombreRolDueno('Dueño de finca'));
    assert.ok(esNombreRolDueno('dueno de finca'));
    assert.ok(esNombreRolDueno('Propietario'));
    assert.ok(!esNombreRolDueno('Cliente'));
    assert.ok(!esNombreRolDueno('Administrador'));
    assert.ok(!esNombreRolDueno(undefined));
});

test('solo dueños y administradores publican fincas y ven sus paneles', async () => {
    assert.strictEqual(await llamar('POST', '/finca'), 401);
    assert.strictEqual(await llamar('POST', '/finca', 2), 403);
    for (const ruta of ['/finca/mias', '/reserva/mis-fincas', '/pago/mis-fincas']) {
        assert.strictEqual(await llamar('GET', ruta, 2), 403, ruta);
        assert.strictEqual(await llamar('GET', ruta), 401, ruta);
    }
});

test('un dueño publica una finca siempre a su nombre y sin calificación', async () => {
    const status = await llamar('POST', '/finca', 3, { NombreFinca: 'X', NumeroDocumentoUsuario: 4, Calificacion: 1 });
    assert.strictEqual(status, 201);
    const dto = ultima('crearFinca')!.args[0];
    assert.strictEqual(dto.NumeroDocumentoUsuario, 3);
    assert.strictEqual(dto.Calificacion, undefined);
    assert.strictEqual(dto.NombreFinca, 'X');
});

test('el administrador sí elige el dueño de la finca', async () => {
    await llamar('POST', '/finca', 1, { NumeroDocumentoUsuario: 4, Calificacion: 4 });
    const dto = ultima('crearFinca')!.args[0];
    assert.strictEqual(dto.NumeroDocumentoUsuario, 4);
    assert.strictEqual(dto.Calificacion, 4);
});

test('un dueño edita y elimina solo sus fincas', async () => {
    assert.strictEqual(await llamar('PUT', '/finca/10', 3, { NombreFinca: 'Mía' }), 200);
    assert.strictEqual(await llamar('PUT', '/finca/20', 3, { NombreFinca: 'Ajena' }), 403);
    assert.strictEqual(await llamar('DELETE', '/finca/20', 3), 403);
    assert.strictEqual(await llamar('DELETE', '/finca/10', 3), 200);
    assert.strictEqual(await llamar('PUT', '/finca/999', 3, {}), 404);
    assert.strictEqual(await llamar('PUT', '/finca/20', 1, {}), 200); // el administrador edita cualquiera
});

test('un dueño no traspasa su finca ni cambia la calificación', async () => {
    await llamar('PUT', '/finca/10', 3, { NombreFinca: 'Mía', NumeroDocumentoUsuario: 4, Calificacion: 5 });
    const dto = ultima('actualizarFinca')!.args[1];
    assert.deepStrictEqual(dto, { NombreFinca: 'Mía' });
});

test('la galería es del dueño de la finca: subir, editar y borrar imágenes ajenas se rechaza', async () => {
    assert.strictEqual(await llamar('POST', '/finca/20/imagenes', 3), 403);
    assert.strictEqual(await llamar('PUT', '/imagen/200', 3, {}), 403);
    assert.strictEqual(await llamar('DELETE', '/imagen/200', 3), 403);
    assert.strictEqual(await llamar('PUT', '/imagen/100', 3, { TextoAlternativo: 'Piscina', IdFinca: 20 }), 200);
    assert.deepStrictEqual(ultima('actualizarImagen')!.args[1], { TextoAlternativo: 'Piscina' }); // IdFinca descartado
});

test('un dueño ve y gestiona solo las reservas de sus fincas', async () => {
    assert.strictEqual(await llamar('GET', '/reserva/mis-fincas', 3), 200);
    assert.strictEqual(ultima('misReservas')!.args[0], 3);
    assert.strictEqual(await llamar('PUT', '/reserva/1000/estado', 3, { Estado: 'Confirmada' }), 200);
    assert.strictEqual(await llamar('PUT', '/reserva/2000/estado', 3, { Estado: 'Confirmada' }), 403);
    assert.strictEqual(await llamar('PUT', '/reserva/1000/estado', 2, { Estado: 'Confirmada' }), 403);
    assert.strictEqual(await llamar('PUT', '/reserva/2000/estado', 1, { Estado: 'Cancelada' }), 200);
});

test('un dueño no entra al panel de administrador', async () => {
    for (const [m, r] of [['GET', '/usuario'], ['GET', '/rol'], ['GET', '/reserva'], ['GET', '/pago'], ['GET', '/factura'], ['POST', '/municipio'], ['GET', '/finca/report/mas-ingresos']]) {
        assert.strictEqual(await llamar(m!, r!, 3), 403, `${m} ${r}`);
    }
});

test('los estados de reserva y finca que acepta el dueño están acotados', () => {
    assert.deepStrictEqual(reservaService.ESTADOS_RESERVA_DUENO, ['Activa', 'Confirmada', 'Finalizada', 'Cancelada']);
    assert.deepStrictEqual(fincaService.ESTADOS_FINCA, ['Disponible', 'No disponible']);
});

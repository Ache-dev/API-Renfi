import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, baseUrl, stop } from './helpers';
import { esErrorDeConexion } from '../src/middlewares/error.middleware';
import * as fincaService from '../src/services/finca.service';
import * as fincaDao from '../src/dao/finca.dao';
import * as usuarioService from '../src/services/usuario.service';
import * as usuarioDao from '../src/dao/usuario.dao';

before(() => ready);
after(stop);

const post = (path: string, body: any) =>
    fetch(`${baseUrl()}/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('fincas 1-6 vienen de la BD (no del fallback)', async () => {
    const fromDb = await fincaDao.listar();
    assert.deepStrictEqual(fromDb.map((f) => f.IdFinca).sort(), [1, 2, 3, 4, 5, 6]);
    const body: any = await (await fetch(`${baseUrl()}/api/finca`)).json();
    const list = Array.isArray(body) ? body : body.data;
    assert.strictEqual(list.length, 6);
    assert.strictEqual((await fincaDao.buscarPorId(1))?.NombreFinca, 'Finca Campestre El Paraíso');
});

test('logins demo y credencial invalida', async () => {
    for (const [correo, pass] of [['admin@renfi.com', 'admin123'], ['cliente@renfi.com', 'cliente123']]) {
        const r = await post('/usuario/login', { correo, contrasena: pass, Correo: correo, Contrasena: pass });
        assert.strictEqual(r.status, 200, correo);
        assert.ok(((await r.json()) as any).token);
    }
    const bad = await post('/usuario/login', { correo: 'admin@renfi.com', contrasena: 'x', Correo: 'admin@renfi.com', Contrasena: 'x' });
    assert.strictEqual(bad.status, 401);
});

test('esErrorDeConexion: solo fallos de conexion', () => {
    assert.ok(esErrorDeConexion({ code: 'ECONNREFUSED' }));
    assert.ok(esErrorDeConexion(new Error('PGlite failed to init')));
    assert.ok(!esErrorDeConexion({ code: '23503' }));
    assert.ok(!esErrorDeConexion({ code: '42P01', message: 'relation does not exist' }));
});

test('servicios: conexion -> fallback, constraint -> rethrow', async () => {
    const orig = { l: fincaDao.listar, u: usuarioDao.buscarPorCorreo };
    try {
        (fincaDao as any).listar = async () => { throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }); };
        assert.strictEqual((await fincaService.getFincas()).length, 6);
        (fincaDao as any).listar = async () => { throw Object.assign(new Error('x'), { code: '23503' }); };
        await assert.rejects(fincaService.getFincas(), { code: '23503' });

        (usuarioDao as any).buscarPorCorreo = async () => { throw Object.assign(new Error('x'), { code: 'ETIMEDOUT' }); };
        assert.ok((await usuarioService.login('admin@renfi.com', 'admin123')).token);
        (usuarioDao as any).buscarPorCorreo = async () => { throw Object.assign(new Error('x'), { code: '23505' }); };
        await assert.rejects(usuarioService.login('admin@renfi.com', 'admin123'), { code: '23505' });
    } finally {
        (fincaDao as any).listar = orig.l;
        (usuarioDao as any).buscarPorCorreo = orig.u;
    }
});

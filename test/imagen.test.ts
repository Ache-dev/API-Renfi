import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, baseUrl, stop } from './helpers';
import { mk } from './crud';

before(() => ready);
after(stop);

const { get: api, send } = mk('imagen');

const crearFinca = async (): Promise<number> => {
    const r = await fetch(`${baseUrl()}/api/finca`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ NombreFinca: 'F img', Direccion: 'D', IdMunicipio: 1, NumeroDocumentoUsuario: 1 })
    });
    assert.strictEqual(r.status, 201);
    return ((await r.json()) as any).IdFinca;
};

test('imagen: CRUD roundtrip y por finca', async () => {
    const f1 = await crearFinca();
    const f2 = await crearFinca();
    const r = await send('POST', '', { UrlImagen: 'http://x/1.jpg', IdFinca: f1 });
    assert.strictEqual(r.status, 201);
    const c: any = await r.json();
    const id = c.IdImagen;
    assert.ok(id > 0 && c.imagen.IdFinca === f1);
    assert.strictEqual(((await (await api(`/${id}`)).json()) as any).UrlImagen, 'http://x/1.jpg');
    assert.ok(((await (await api('')).json()) as any[]).some((x) => x.IdImagen === id));
    const porFinca = (await (await api(`/finca/${f1}`)).json()) as any[];
    assert.deepStrictEqual(porFinca.map((x) => x.IdImagen), [id]);
    assert.strictEqual((await send('PUT', `/${id}`, { UrlImagen: 'http://x/2.jpg', IdFinca: f2 })).status, 200);
    const g: any = await (await api(`/${id}`)).json();
    assert.strictEqual(g.UrlImagen, 'http://x/2.jpg');
    assert.strictEqual(g.IdFinca, f2);
    assert.strictEqual(((await (await api(`/finca/${f1}`)).json()) as any[]).length, 0);
    assert.strictEqual((await send('DELETE', `/${id}`)).status, 200);
    assert.strictEqual((await api(`/${id}`)).status, 404);
    const c2: any = await (await send('POST', '', { Url: 'http://x/3.jpg', IdFinca: f1 })).json(); // alias del front
    assert.strictEqual(c2.imagen.UrlImagen, 'http://x/3.jpg');
    assert.strictEqual((await send('DELETE', `/delete?id=${c2.IdImagen}`)).status, 200);
});

test('imagen: validaciones y 404', async () => {
    assert.strictEqual((await send('POST', '', {})).status, 400);
    assert.strictEqual((await send('POST', '', { UrlImagen: 'u' })).status, 400);
    assert.strictEqual((await send('POST', '', { UrlImagen: 'u', IdFinca: 'abc' })).status, 400);
    assert.strictEqual((await send('POST', '', { UrlImagen: 'u', IdFinca: 99999 })).status, 404);
    assert.strictEqual((await api('/abc')).status, 400);
    assert.strictEqual((await api('/finca/abc')).status, 400);
    assert.strictEqual((await send('DELETE', '/delete')).status, 400);
    assert.strictEqual((await api('/99999')).status, 404);
    assert.strictEqual((await send('PUT', '/99999', { UrlImagen: 'x' })).status, 404);
    assert.strictEqual((await send('DELETE', '/99999')).status, 404);
    const r = await api('/finca/99999');
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(await r.json(), []);
});

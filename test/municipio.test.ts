import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, baseUrl, stop } from './helpers';
import { mk } from './crud';

before(() => ready);
after(stop);

const { get: api, send } = mk('municipio');

test('municipio: CRUD roundtrip', async () => {
    const r = await send('POST', '', { NombreMunicipio: 'Pueblo Test' });
    assert.strictEqual(r.status, 201);
    const c: any = await r.json();
    const id = c.IdMunicipio;
    assert.ok(id > 0 && c.municipio.NombreMunicipio === 'Pueblo Test');
    assert.strictEqual(((await (await api(`/${id}`)).json()) as any).NombreMunicipio, 'Pueblo Test');
    assert.ok(((await (await api('')).json()) as any[]).some((x) => x.IdMunicipio === id));
    assert.strictEqual((await send('PUT', `/${id}`, { NombreMunicipio: 'Pueblo 2' })).status, 200);
    assert.strictEqual(((await (await api(`/${id}`)).json()) as any).NombreMunicipio, 'Pueblo 2');
    assert.strictEqual((await send('DELETE', `/${id}`)).status, 200);
    assert.strictEqual((await api(`/${id}`)).status, 404);
    const c2: any = await (await send('POST', '', { NombreMunicipio: 'Legacy' })).json();
    assert.strictEqual((await send('DELETE', `/delete?id=${c2.IdMunicipio}`)).status, 200);
});

test('municipio: validaciones y 404', async () => {
    assert.strictEqual((await send('POST', '', {})).status, 400);
    assert.strictEqual((await send('POST', '', { NombreMunicipio: 7 })).status, 400);
    assert.strictEqual((await api('/abc')).status, 400);
    assert.strictEqual((await send('DELETE', '/delete')).status, 400);
    assert.strictEqual((await api('/99999')).status, 404);
    assert.strictEqual((await send('PUT', '/99999', { NombreMunicipio: 'x' })).status, 404);
    assert.strictEqual((await send('DELETE', '/99999')).status, 404);
});

test('municipio: reporte mas-reservas', async () => {
    const r = await api('/report/mas-reservas');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(await r.json()));
});

test('municipio: eliminar municipio usado por finca no devuelve 2xx', async () => {
    const m: any = await (await send('POST', '', { NombreMunicipio: 'ConFinca' })).json();
    const f = await fetch(`${baseUrl()}/api/finca`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ NombreFinca: 'F', Direccion: 'D', IdMunicipio: m.IdMunicipio, NumeroDocumentoUsuario: 1 })
    });
    assert.strictEqual(f.status, 201);
    const r = await send('DELETE', `/${m.IdMunicipio}`);
    assert.ok(r.status >= 400, `status ${r.status}`);
});

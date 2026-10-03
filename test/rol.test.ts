import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, stop } from './helpers';
import { mk } from './crud';

before(() => ready);
after(stop);

const { get: api, send } = mk('rol');

test('rol: CRUD roundtrip', async () => {
    let r = await send('POST', '', { NombreRol: 'Tester' });
    assert.strictEqual(r.status, 201);
    const c: any = await r.json();
    const id = c.IdRol;
    assert.ok(id > 0 && c.id === id && c.rol.NombreRol === 'Tester');
    assert.strictEqual(((await (await api(`/${id}`)).json()) as any).NombreRol, 'Tester');
    assert.ok(((await (await api('')).json()) as any[]).some((x) => x.IdRol === id));
    r = await send('PUT', `/${id}`, { NombreRol: 'Tester2' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(((await (await api(`/${id}`)).json()) as any).NombreRol, 'Tester2');
    assert.strictEqual((await send('DELETE', `/${id}`)).status, 200);
    assert.strictEqual((await api(`/${id}`)).status, 404);
    const c2: any = await (await send('POST', '', { NombreRol: 'Legacy' })).json();
    assert.strictEqual((await send('DELETE', `/delete?id=${c2.IdRol}`)).status, 200);
    assert.strictEqual((await api(`/${c2.IdRol}`)).status, 404);
});

test('rol: validaciones y 404', async () => {
    assert.strictEqual((await send('POST', '', {})).status, 400);
    assert.strictEqual((await send('POST', '', { NombreRol: 5 })).status, 400);
    assert.strictEqual((await send('POST', '', { NombreRol: '  ' })).status, 400);
    assert.strictEqual((await api('/abc')).status, 400);
    assert.strictEqual((await api('/0')).status, 400);
    assert.strictEqual((await send('DELETE', '/delete')).status, 400);
    assert.strictEqual((await api('/99999')).status, 404);
    assert.strictEqual((await send('PUT', '/99999', { NombreRol: 'x' })).status, 404);
    assert.strictEqual((await send('DELETE', '/99999')).status, 404);
});

test('rol: eliminar rol referenciado por usuario no devuelve 2xx', async () => {
    const r = await send('DELETE', '/1'); // rol del admin sembrado
    assert.ok(r.status >= 400, `status ${r.status}`);
});

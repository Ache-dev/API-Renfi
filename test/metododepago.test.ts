import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, stop } from './helpers';
import { mk } from './crud';

before(() => ready);
after(stop);

const { get: api, send } = mk('metododepago');

test('metododepago: CRUD roundtrip', async () => {
    const r = await send('POST', '', { NombreMetodoDePago: 'Nequi', PagoMixto: true });
    assert.strictEqual(r.status, 201);
    const c: any = await r.json();
    const id = c.IdMetodoDePago;
    assert.ok(id > 0 && c.metodo.PagoMixto === true);
    assert.strictEqual(((await (await api(`/${id}`)).json()) as any).NombreMetodoDePago, 'Nequi');
    assert.ok(((await (await api('')).json()) as any[]).some((x) => x.IdMetodoDePago === id));
    assert.strictEqual((await send('PUT', `/${id}`, { NombreMetodoDePago: 'Nequi2', PagoMixto: false })).status, 200);
    const g: any = await (await api(`/${id}`)).json();
    assert.strictEqual(g.NombreMetodoDePago, 'Nequi2');
    assert.strictEqual(g.PagoMixto, false);
    assert.strictEqual((await send('DELETE', `/${id}`)).status, 200);
    assert.strictEqual((await api(`/${id}`)).status, 404);
    const c2: any = await (await send('POST', '', { NombreMetodoDePago: 'Legacy' })).json();
    assert.strictEqual((await send('DELETE', `/delete?id=${c2.IdMetodoDePago}`)).status, 200);
});

test('metododepago: alias del front y PagoMixto como texto', async () => {
    const c: any = await (await send('POST', '', { Nombre: 'Alias', PagoMixto: 'false' })).json();
    assert.strictEqual(c.metodo.NombreMetodoDePago, 'Alias');
    assert.strictEqual(c.metodo.PagoMixto, false);
    const u: any = await (await send('PUT', `/${c.IdMetodoDePago}`, { PagoMixto: 'true' })).json();
    assert.strictEqual(u.metodo.PagoMixto, true);
});

test('metododepago: validaciones y 404', async () => {
    assert.strictEqual((await send('POST', '', {})).status, 400);
    assert.strictEqual((await send('POST', '', { NombreMetodoDePago: 3 })).status, 400);
    assert.strictEqual((await api('/abc')).status, 400);
    assert.strictEqual((await send('DELETE', '/delete')).status, 400);
    assert.strictEqual((await api('/99999')).status, 404);
    assert.strictEqual((await send('PUT', '/99999', { NombreMetodoDePago: 'x' })).status, 404);
    assert.strictEqual((await send('DELETE', '/99999')).status, 404);
});

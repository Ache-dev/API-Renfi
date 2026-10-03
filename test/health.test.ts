import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, baseUrl, stop } from './helpers';

before(() => ready);
after(stop);

test('/health', async () => {
    assert.strictEqual((await fetch(`${baseUrl()}/health`)).status, 200);
});

for (const r of ['usuario', 'finca', 'imagen', 'metododepago', 'municipio', 'pago', 'reserva', 'factura', 'rol']) {
    test(`GET /api/${r}`, async () => {
        const res = await fetch(`${baseUrl()}/api/${r}`);
        assert.strictEqual(res.status, 200);
        const body: any = await res.json();
        assert.ok(Array.isArray(body) || Array.isArray(body.data), JSON.stringify(body).slice(0, 200));
    });
}

import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, baseUrl, stop } from './helpers';

before(() => ready);
after(stop);

const call = async (method: string, path: string, body?: any) => {
    const res = await fetch(`${baseUrl()}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
};
const base = { IdFinca: 1, NumeroDocumentoUsuario: 10003, MontoReserva: 1700000, Estado: 'Activa' };

test('flujo completo: reserva -> factura -> pago -> listar -> eliminar', async () => {
    const r = await call('POST', '/reserva', { ...base, FechaEntrada: '2030-01-10', FechaSalida: '2030-01-12', Huespedes: 4 });
    assert.strictEqual(r.status, 201);
    assert.ok(r.body.IdReserva && r.body.IdFactura, JSON.stringify(r.body));
    assert.strictEqual(r.body.reserva.IdFinca, 1);

    const p = await call('POST', '/pago', { IdFactura: r.body.IdFactura, IdMetodoDePago: 1, Monto: 1700000 });
    assert.strictEqual(p.status, 201, JSON.stringify(p.body));
    assert.ok(p.body.IdPago);

    assert.strictEqual((await call('GET', '/pago/report/pendientes')).status, 200);

    const l = await call('GET', '/reserva/usuario/10003');
    const mia = l.body.find((x: any) => x.IdReserva === r.body.IdReserva);
    assert.ok(mia);
    assert.strictEqual(mia.NombreFinca, 'Finca Campestre El Paraíso');
    assert.ok(mia.FechaEntrada && mia.FechaSalida);

    assert.strictEqual((await call('DELETE', `/reserva/${r.body.IdReserva}`)).status, 200);
    assert.strictEqual((await call('GET', `/reserva/${r.body.IdReserva}`)).status, 404);
    // ON DELETE CASCADE: la factura y el pago asociados desaparecen con la reserva
    assert.strictEqual((await call('GET', `/factura/${r.body.IdFactura}`)).status, 404);
    assert.strictEqual((await call('GET', `/pago/${p.body.IdPago}`)).status, 404);
});

test('solape de fechas -> 409; fechas contiguas ok', async () => {
    const a = await call('POST', '/reserva', { ...base, IdFinca: 2, FechaEntrada: '2031-03-01', FechaSalida: '2031-03-05' });
    assert.strictEqual(a.status, 201);
    const b = await call('POST', '/reserva', { ...base, IdFinca: 2, FechaEntrada: '2031-03-04', FechaSalida: '2031-03-07' });
    assert.strictEqual(b.status, 409);
    const c = await call('POST', '/reserva', { ...base, IdFinca: 2, FechaEntrada: '2031-03-05', FechaSalida: '2031-03-07' });
    assert.strictEqual(c.status, 201);
    // una reserva cancelada (cualquier género) libera sus fechas
    assert.strictEqual((await call('PUT', `/reserva/${a.body.IdReserva}`, { Estado: 'Cancelado' })).status, 200);
    assert.strictEqual((await call('POST', '/reserva', { ...base, IdFinca: 2, FechaEntrada: '2031-03-02', FechaSalida: '2031-03-04' })).status, 201);
});

test('validaciones -> 400', async () => {
    const f = { ...base, FechaEntrada: '2032-01-10', FechaSalida: '2032-01-12' };
    assert.strictEqual((await call('POST', '/reserva', { ...f, FechaSalida: '2032-01-10' })).status, 400);
    assert.strictEqual((await call('POST', '/reserva', { ...f, FechaEntrada: 'abc' })).status, 400);
    assert.strictEqual((await call('POST', '/reserva', { ...f, NumeroDocumentoUsuario: undefined })).status, 400);
    assert.strictEqual((await call('POST', '/reserva', { ...f, Huespedes: 0 })).status, 400);
    assert.strictEqual((await call('POST', '/reserva', { ...f, Huespedes: 99 })).status, 400);
});

test('FK inexistente -> 409 en espanol, sin SQL', async () => {
    const r = await call('POST', '/reserva', { ...base, IdFinca: 9999, FechaEntrada: '2033-01-10', FechaSalida: '2033-01-12' });
    assert.strictEqual(r.status, 409);
    assert.match(r.body.message, /no existe/);
    assert.ok(!/violates|INSERT|SELECT/i.test(r.body.message));
    const p = await call('POST', '/pago', { IdFactura: 99999, IdMetodoDePago: 1, Monto: 10 });
    assert.strictEqual(p.status, 409);
});

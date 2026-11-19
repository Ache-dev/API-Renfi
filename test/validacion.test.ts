import { test, after, before } from 'node:test';
import assert from 'node:assert';
import { ready, baseUrl, stop } from './helpers';
import { texto, entero, correo, telefono, unoDe } from '../src/services/validacion';

before(async () => { await ready; });
after(async () => { await stop(); });

const login = (body: string) => fetch(`${baseUrl()}/api/usuario/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

test('un cuerpo con objetos anidados (inyección tipo {"$ne": ...}) se rechaza con 400, no 500', async () => {
    for (const body of ['{"Correo":{"$ne":null},"Contrasena":"x"}', '[1,2]', '{"Comodidades":[{"a":1}]}']) {
        const r = await login(body);
        assert.strictEqual(r.status, 400, body);
    }
});

test('valores con tipo equivocado no tumban el servidor', async () => {
    const r = await login('{"Correo":123,"Contrasena":true}');
    assert.notStrictEqual(r.status, 500);
});

test('texto y enteros respetan límites', () => {
    assert.strictEqual(texto('N', '  Ana  ', 10), 'Ana');
    assert.throws(() => texto('N', 'x'.repeat(11), 10), /no puede superar 10/);
    assert.throws(() => texto('N', '   ', 10), /obligatorio/);
    assert.strictEqual(texto('N', '', 10, false), '');
    assert.strictEqual(entero('P', '5', 1, 9), 5);
    for (const malo of [0, 10, 1.5, '', null, true, 'abc', '1e9']) assert.throws(() => entero('P', malo, 1, 9), /entero entre/);
});

test('correo, teléfono y listas cerradas', () => {
    assert.strictEqual(correo(' Ana@Renfi.COM '), 'ana@renfi.com');
    for (const malo of ['ana', 'ana@renfi', 'a b@c.co', 'x'.repeat(250) + '@a.co']) assert.throws(() => correo(malo));
    assert.strictEqual(telefono('+57 300 123 4567'), '+57 300 123 4567');
    assert.strictEqual(telefono(''), '');
    assert.throws(() => telefono('<script>'), /Telefono/);
    assert.strictEqual(unoDe('Estado', 'cancelada', ['Activa', 'Cancelada']), 'Cancelada');
    assert.throws(() => unoDe('Estado', 'Rara', ['Activa']), /uno de/);
});

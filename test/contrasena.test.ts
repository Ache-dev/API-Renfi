import { test } from 'node:test';
import assert from 'node:assert';
import { hashContrasena, verificarContrasena, computeSha512 } from '../src/services/usuario.service';

test('el hash guardado es bcrypt y no contiene la contraseña', async () => {
    const hash = await hashContrasena('Secreta123');
    assert.ok(hash.startsWith('$2'));
    assert.ok(!hash.includes('Secreta123'));
});

test('acepta la contraseña en claro o como SHA-512 del cliente', async () => {
    const hash = await hashContrasena('Secreta123');
    assert.deepStrictEqual(await verificarContrasena('Secreta123', hash), { ok: true, migrar: false });
    assert.deepStrictEqual(await verificarContrasena(computeSha512('Secreta123'), hash), { ok: true, migrar: false });
    assert.strictEqual((await verificarContrasena('otra', hash)).ok, false);
});

test('contraseñas heredadas (plano o SHA-512) se aceptan y piden migración', async () => {
    assert.deepStrictEqual(await verificarContrasena('admin123', 'admin123'), { ok: true, migrar: true });
    assert.deepStrictEqual(await verificarContrasena('admin123', computeSha512('admin123')), { ok: true, migrar: true });
    assert.deepStrictEqual(await verificarContrasena(computeSha512('admin123'), 'admin123'), { ok: true, migrar: true });
    assert.strictEqual((await verificarContrasena('mala', 'admin123')).ok, false);
});

test('no autentica con vacío', async () => {
    assert.strictEqual((await verificarContrasena('', 'admin123')).ok, false);
    assert.strictEqual((await verificarContrasena('x', '')).ok, false);
});

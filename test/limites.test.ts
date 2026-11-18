import { test, after, before } from 'node:test';
import assert from 'node:assert';
import sharp from 'sharp';
import { ready, baseUrl, stop } from './helpers';
import { limitarIntentos } from '../src/middlewares/rate-limit.middleware';
import { procesarImagen } from '../src/services/imagen.service';
import { MAX_CAMPOS, MAX_TEXTO } from '../src/middlewares/error.middleware';

before(() => ready);
after(() => stop());

const post = (cuerpo: unknown) =>
    fetch(`${baseUrl()}/api/usuario/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

test('rechaza cuerpos con demasiados campos', async () => {
    const campos = Object.fromEntries(Array.from({ length: MAX_CAMPOS + 1 }, (_, i) => [`c${i}`, 'x']));
    assert.strictEqual((await post(campos)).status, 400);
});

test('rechaza textos más largos que el tope', async () => {
    assert.strictEqual((await post({ correo: 'a@a.com', contrasena: 'x'.repeat(MAX_TEXTO + 1) })).status, 400);
    assert.strictEqual((await post({ correo: 'a@a.com', Comodidades: ['x'.repeat(MAX_TEXTO + 1)] })).status, 400);
});

test('rechaza parámetros de consulta largos o demasiados, y URLs enormes', async () => {
    assert.strictEqual((await fetch(`${baseUrl()}/health?q=${'a'.repeat(201)}`)).status, 400);
    const muchos = Array.from({ length: 21 }, (_, i) => `p${i}=1`).join('&');
    assert.strictEqual((await fetch(`${baseUrl()}/health?${muchos}`)).status, 400);
    assert.strictEqual((await fetch(`${baseUrl()}/health?q=${'a'.repeat(2100)}`)).status, 414);
    assert.strictEqual((await fetch(`${baseUrl()}/health?q=valor-corto`)).status, 200);
});

test('el limitador responde 429 con Retry-After al pasar el máximo y las lecturas no cuentan si es solo de escrituras', () => {
    const entorno = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development'; // el limitador se apaga solo en 'test'
    try {
        const llamar = (limite: ReturnType<typeof limitarIntentos>, method: string) => {
            const cabeceras: Record<string, string> = {};
            let error: any;
            limite({ ip: '1.2.3.4', method } as any, { setHeader: (k: string, v: string) => { cabeceras[k] = v; } } as any, (e?: any) => { error = e; });
            return { error, cabeceras };
        };
        const general = limitarIntentos(3, 60_000);
        for (let i = 0; i < 3; i++) assert.strictEqual(llamar(general, 'GET').error, undefined);
        const bloqueada = llamar(general, 'GET');
        assert.strictEqual(bloqueada.error.statusCode, 429);
        assert.ok(Number(bloqueada.cabeceras['Retry-After']) >= 1);

        const escrituras = limitarIntentos(1, 60_000, true);
        for (let i = 0; i < 5; i++) assert.strictEqual(llamar(escrituras, 'GET').error, undefined);
        assert.strictEqual(llamar(escrituras, 'POST').error, undefined);
        assert.strictEqual(llamar(escrituras, 'POST').error.statusCode, 429);
    } finally {
        process.env.NODE_ENV = entorno;
    }
});

test('el procesamiento de imágenes admite 2 en curso y 8 en espera; el resto recibe 503', async () => {
    const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#2d6a4f' } }).png().toBuffer();
    const resultados = await Promise.allSettled(Array.from({ length: 12 }, () => procesarImagen(png)));
    const ok = resultados.filter((r) => r.status === 'fulfilled').length;
    const rechazadas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    assert.strictEqual(ok, 10);
    assert.strictEqual(rechazadas.length, 2);
    assert.ok(rechazadas.every((r) => r.reason.statusCode === 503));
    // Tras vaciarse la cola, vuelve a aceptar trabajo
    assert.ok((await procesarImagen(png)).buffer.length > 0);
});

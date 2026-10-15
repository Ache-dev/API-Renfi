import { test, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert';
import sharp from 'sharp';
import * as imagenDao from '../src/dao/imagen.dao';
import * as storage from '../src/conexion/storage';
import { migrarImagenesExternas, validarUrlDescarga, Dependencias } from '../src/services/migracion-imagenes.service';

// Sin red, sin base de datos y sin Storage reales.
let pendientes: any[] = [];
let migradas: { id: number; datos: any }[] = [];
let subidos: { ruta: string; buffer: Buffer }[] = [];
let borrados: string[] = [];
let fallarMarcado = false;

mock.method(imagenDao, 'pendientesDeMigrar', async () => pendientes);
mock.method(imagenDao, 'marcarMigrada', async (id: number, datos: any) => {
    if (fallarMarcado) throw new Error('fallo de base de datos');
    migradas.push({ id, datos });
});
mock.method(storage, 'subirImagen', async (ruta: string, buffer: Buffer) => { subidos.push({ ruta, buffer }); });
mock.method(storage, 'borrarImagenes', async (rutas: string[]) => { borrados.push(...rutas); });
after(() => mock.restoreAll());

beforeEach(() => {
    pendientes = [];
    migradas = [];
    subidos = [];
    borrados = [];
    fallarMarcado = false;
});

const jpeg = (ancho = 2400, alto = 1600) =>
    sharp({ create: { width: ancho, height: alto, channels: 3, background: '#40916c' } }).jpeg().toBuffer();

const publica = async () => ['151.101.1.1']; // IP pública cualquiera

const respuesta = (cuerpo: Buffer, extra: ResponseInit = {}) =>
    new Response(new Uint8Array(cuerpo), { status: 200, headers: { 'content-type': 'image/jpeg' }, ...extra });

const deps = (descargar: Dependencias['descargar'], resolver: Dependencias['resolver'] = publica): Dependencias => ({ resolver, descargar });

const imagen = (id: number, url: string, idFinca = 1) => ({ IdImagen: id, IdFinca: idFinca, UrlImagen: url, RutaStorage: null });

test('migra una imagen externa: la descarga, la optimiza a WebP, la sube y la marca', async () => {
    pendientes = [imagen(1, 'https://images.unsplash.com/foto.jpg', 7)];
    const original = await jpeg();

    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async () => respuesta(original)));

    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0]!.estado, 'migrada');
    assert.match(r[0]!.destino!, /^finca-7\/[0-9a-f-]{36}\.webp$/);

    assert.strictEqual(subidos.length, 1);
    assert.strictEqual(subidos[0]!.buffer.subarray(8, 12).toString(), 'WEBP');
    const meta = await sharp(subidos[0]!.buffer).metadata();
    assert.strictEqual(meta.width, 1600); // reducida al lado máximo

    assert.strictEqual(migradas.length, 1);
    assert.strictEqual(migradas[0]!.id, 1);
    assert.deepStrictEqual(
        { ...migradas[0]!.datos, TamanoBytes: undefined },
        { RutaStorage: r[0]!.destino, TipoMime: 'image/webp', TamanoBytes: undefined, Ancho: 1600, Alto: 1067 }
    );
});

test('simulación: no descarga, no sube y no escribe nada', async () => {
    pendientes = [imagen(1, 'https://a.com/1.jpg'), imagen(2, 'https://a.com/2.jpg')];
    let llamadas = 0;
    const r = await migrarImagenesExternas({ ejecutar: false }, deps(async () => { llamadas++; return respuesta(await jpeg()); }));
    assert.deepStrictEqual(r.map((x) => x.estado), ['simulada', 'simulada']);
    assert.strictEqual(llamadas, 0);
    assert.strictEqual(subidos.length + migradas.length, 0);
});

test('sin pendientes no hace nada (idempotente)', async () => {
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async () => respuesta(await jpeg())));
    assert.deepStrictEqual(r, []);
});

test('un fallo no detiene las demás: migra las buenas e informa las malas', async () => {
    pendientes = [imagen(1, 'https://a.com/ok.jpg'), imagen(2, 'https://a.com/rota.jpg'), imagen(3, 'https://a.com/ok2.jpg')];
    const original = await jpeg(300, 200);
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async (url) =>
        url.includes('rota') ? respuesta(Buffer.from('<html>no es imagen</html>')) : respuesta(original)));

    assert.deepStrictEqual(r.map((x) => x.estado), ['migrada', 'fallida', 'migrada']);
    assert.match(r[1]!.detalle!, /imagen válida/);
    assert.strictEqual(subidos.length, 2);
});

test('si el servidor responde error, la imagen falla con el motivo', async () => {
    pendientes = [imagen(1, 'https://a.com/404.jpg')];
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async () => new Response('no', { status: 404 })));
    assert.strictEqual(r[0]!.estado, 'fallida');
    assert.match(r[0]!.detalle!, /404/);
    assert.strictEqual(subidos.length, 0);
});

test('si falla marcar la fila, se borra el archivo ya subido', async () => {
    pendientes = [imagen(1, 'https://a.com/1.jpg')];
    fallarMarcado = true;
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async () => respuesta(await jpeg(300, 200))));
    assert.strictEqual(r[0]!.estado, 'fallida');
    assert.strictEqual(subidos.length, 1);
    assert.deepStrictEqual(borrados, [subidos[0]!.ruta]);
});

test('sigue redirecciones validando cada salto y corta los ciclos', async () => {
    pendientes = [imagen(1, 'https://a.com/r1'), imagen(2, 'https://a.com/ciclo')];
    const original = await jpeg(300, 200);
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async (url) => {
        if (url.endsWith('/r1')) return new Response(null, { status: 302, headers: { location: 'https://cdn.a.com/final.jpg' } });
        if (url.endsWith('/ciclo')) return new Response(null, { status: 302, headers: { location: 'https://a.com/ciclo' } });
        return respuesta(original);
    }));
    assert.strictEqual(r[0]!.estado, 'migrada');
    assert.strictEqual(r[1]!.estado, 'fallida');
    assert.match(r[1]!.detalle!, /redirecciones/);
});

test('una redirección hacia una dirección interna se bloquea', async () => {
    pendientes = [imagen(1, 'https://a.com/r')];
    const resolver = async (host: string) => (host === 'interno.local' ? ['10.0.0.5'] : ['151.101.1.1']);
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(
        async () => new Response(null, { status: 302, headers: { location: 'https://interno.local/secreto' } }),
        resolver
    ));
    assert.strictEqual(r[0]!.estado, 'fallida');
    assert.match(r[0]!.detalle!, /dirección interna/);
});

test('rechaza imágenes de más de 15 MB (declaradas o reales)', async () => {
    pendientes = [imagen(1, 'https://a.com/grande.jpg'), imagen(2, 'https://a.com/sin-cabecera.jpg')];
    const r = await migrarImagenesExternas({ ejecutar: true }, deps(async (url) =>
        url.includes('grande')
            ? respuesta(Buffer.alloc(10), { headers: { 'content-length': String(16 * 1024 * 1024) } })
            : respuesta(Buffer.alloc(15 * 1024 * 1024 + 10, 1))));
    assert.deepStrictEqual(r.map((x) => x.estado), ['fallida', 'fallida']);
    assert.ok(r.every((x) => /15 MB/.test(x.detalle!)));
    assert.strictEqual(subidos.length, 0);
});

// ---- validación de URLs ----

test('validarUrlDescarga: solo https hacia hosts públicos y sin credenciales', async () => {
    await assert.doesNotReject(validarUrlDescarga('https://images.unsplash.com/a.jpg', publica));
    await assert.rejects(validarUrlDescarga('http://a.com/a.jpg', publica), /https/);
    await assert.rejects(validarUrlDescarga('file:///etc/passwd', publica), /https/);
    await assert.rejects(validarUrlDescarga('javascript:alert(1)', publica));
    await assert.rejects(validarUrlDescarga('no es una url', publica), /inválida/);
    await assert.rejects(validarUrlDescarga('https://user:clave@a.com/x.jpg', publica), /credenciales/);
});

test('validarUrlDescarga: bloquea IPs internas, literales o resueltas por DNS', async () => {
    const internas = ['127.0.0.1', '10.1.2.3', '172.16.0.9', '192.168.1.10', '169.254.169.254', '100.64.0.1', '0.0.0.0'];
    for (const ip of internas) {
        await assert.rejects(validarUrlDescarga(`https://${ip}/x.jpg`, publica), /interna/, ip);
        await assert.rejects(validarUrlDescarga('https://engana.com/x.jpg', async () => [ip]), /interna/, `DNS ${ip}`);
    }
    await assert.rejects(validarUrlDescarga('https://[::1]/x.jpg', publica), /interna/);
    await assert.rejects(validarUrlDescarga('https://[fd00::1]/x.jpg', publica), /interna/);
    await assert.rejects(validarUrlDescarga('https://x.com/a.jpg', async () => ['151.101.1.1', '10.0.0.1']), /interna/); // una sola IP interna basta
    await assert.rejects(validarUrlDescarga('https://no-existe.invalid/a.jpg', async () => { throw new Error('ENOTFOUND'); }), /resolver/);
    await assert.doesNotReject(validarUrlDescarga('https://172.32.0.1/x.jpg', publica)); // fuera del rango privado 172.16-31
});

import { test, after, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { ready, baseUrl, stop } from './helpers';
import envConfig from '../src/config/env.config';
import * as usuarioDao from '../src/dao/usuario.dao';
import * as imagenDao from '../src/dao/imagen.dao';
import * as storage from '../src/conexion/storage';
import { huellaContrasena } from '../src/middlewares/auth.middleware';

// Base de datos y Storage simulados: estas pruebas no escriben nada en Supabase.
const usuarios: Record<number, any> = {
    1: { NumeroDocumento: 1, IdRol: 1, NombreRol: 'Administrador', NombreUsuario: 'Admin', Correo: 'a@a.com', Estado: 'Activo', Contrasena: '$2a$h1' },
    2: { NumeroDocumento: 2, IdRol: 2, NombreRol: 'Cliente', NombreUsuario: 'Cli', Correo: 'c@c.com', Estado: 'Activo', Contrasena: '$2a$h2' },
};
let imagenes: any[] = [];
let siguienteId = 1;
let subidos: { ruta: string; buffer: Buffer }[] = [];
let borrados: string[] = [];
let fallarInsercion = false;
let imagenDaoUltimoUpdate: Record<string, unknown> | null = null;

const token = (id: number) =>
    jwt.sign({ NumeroDocumento: id, IdRol: usuarios[id].IdRol, pv: huellaContrasena(usuarios[id].Contrasena) }, envConfig.JWT.SECRET, { expiresIn: '5m' });

before(async () => {
    mock.method(usuarioDao, 'buscarPorId', async (id: number) => (usuarios[id] ? { ...usuarios[id] } : null));
    mock.method(imagenDao, 'existeFinca', async (id: number) => id === 1);
    mock.method(imagenDao, 'contarPorFinca', async (idFinca: number) => imagenes.filter((i) => i.IdFinca === idFinca).length);
    mock.method(imagenDao, 'insertar', async (n: any) => {
        if (fallarInsercion) throw new Error('fallo de base de datos');
        if (n.EsPortada) imagenes.forEach((i) => i.IdFinca === n.IdFinca && (i.EsPortada = false));
        const id = siguienteId++;
        imagenes.push({ IdImagen: id, Orden: id, ...n, UrlImagen: `https://cdn.test/${n.RutaStorage}` });
        return id;
    });
    mock.method(imagenDao, 'buscarPorId', async (id: number) => imagenes.find((i) => i.IdImagen === id) ?? null);
    mock.method(imagenDao, 'eliminarPorId', async (id: number) => { imagenes = imagenes.filter((i) => i.IdImagen !== id); });
    mock.method(imagenDao, 'primeraDeFinca', async (idFinca: number, excluir: number) =>
        imagenes.filter((i) => i.IdFinca === idFinca && i.IdImagen !== excluir).sort((a, b) => a.Orden - b.Orden)[0] ?? null);
    mock.method(imagenDao, 'actualizar', async (id: number, idFinca: number, campos: any) => {
        if (campos.EsPortada === true) imagenes.forEach((i) => i.IdFinca === idFinca && (i.EsPortada = false));
        imagenDaoUltimoUpdate = campos;
        Object.assign(imagenes.find((i) => i.IdImagen === id), campos);
    });
    mock.method(storage, 'subirImagen', async (ruta: string, buffer: Buffer) => { subidos.push({ ruta, buffer }); });
    mock.method(storage, 'borrarImagenes', async (rutas: string[]) => { borrados.push(...rutas); });
    await ready;
});
after(async () => {
    mock.restoreAll();
    await stop();
});
beforeEach(() => {
    imagenes = [];
    siguienteId = 1;
    subidos = [];
    borrados = [];
    fallarInsercion = false;
});

const png = (ancho = 100, alto = 80) =>
    sharp({ create: { width: ancho, height: alto, channels: 3, background: '#2d6a4f' } }).png().toBuffer();

const subir = async (idFinca: number, archivo: Buffer | null, opciones: { tk?: string; nombre?: string; tipo?: string; campos?: Record<string, string> } = {}) => {
    const form = new FormData();
    if (archivo) form.append('imagen', new Blob([new Uint8Array(archivo)], { type: opciones.tipo ?? 'image/png' }), opciones.nombre ?? 'foto.png');
    for (const [k, v] of Object.entries(opciones.campos ?? {})) form.append(k, v);
    const res = await fetch(`${baseUrl()}/api/finca/${idFinca}/imagenes`, {
        method: 'POST',
        headers: opciones.tk ? { Authorization: `Bearer ${opciones.tk}` } : {},
        body: form
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
};

const admin = () => token(1);

test('sin sesión o siendo cliente no se puede subir', async () => {
    assert.strictEqual((await subir(1, await png())).status, 401);
    assert.strictEqual((await subir(1, await png(), { tk: token(2) })).status, 403);
    assert.strictEqual(subidos.length, 0);
});

test('sube una imagen válida: la convierte a WebP, la guarda en Storage y la deja como portada', async () => {
    const r = await subir(1, await png(3000, 2000), { tk: admin(), campos: { TextoAlternativo: 'Piscina al atardecer' } });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));

    assert.strictEqual(subidos.length, 1);
    assert.match(subidos[0]!.ruta, /^finca-1\/[0-9a-f-]{36}\.webp$/);
    const cab = subidos[0]!.buffer;
    assert.strictEqual(cab.subarray(0, 4).toString(), 'RIFF');
    assert.strictEqual(cab.subarray(8, 12).toString(), 'WEBP');

    const meta = await sharp(cab).metadata();
    assert.strictEqual(meta.width, 1600); // se reduce al lado máximo
    assert.strictEqual(meta.height, 1067);

    assert.strictEqual(r.body.imagen.EsPortada, true);
    assert.strictEqual(r.body.imagen.TextoAlternativo, 'Piscina al atardecer');
    assert.strictEqual(r.body.imagen.TipoMime, 'image/webp');
    assert.ok(r.body.imagen.UrlImagen.startsWith('https://cdn.test/finca-1/'));
});

test('una imagen pequeña no se agranda y la segunda no es portada salvo que se pida', async () => {
    await subir(1, await png(), { tk: admin() });
    const r2 = await subir(1, await png(200, 100), { tk: admin() });
    assert.strictEqual(r2.body.imagen.EsPortada, false);
    assert.strictEqual(r2.body.imagen.Ancho, 200);

    const r3 = await subir(1, await png(), { tk: admin(), campos: { EsPortada: 'true' } });
    assert.strictEqual(r3.body.imagen.EsPortada, true);
    assert.strictEqual(imagenes.filter((i) => i.EsPortada).length, 1);
});

test('un archivo que no es imagen se rechaza aunque se llame .jpg', async () => {
    const falso = Buffer.from('esto es texto, no una imagen');
    const r = await subir(1, falso, { tk: admin(), nombre: 'foto.jpg', tipo: 'image/jpeg' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(subidos.length, 0);
});

test('un formato no permitido (GIF) se rechaza', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).gif().toBuffer();
    const r = await subir(1, gif, { tk: admin(), nombre: 'a.gif', tipo: 'image/gif' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(subidos.length, 0);
});

test('más de 5 MB se rechaza con 413', async () => {
    const r = await subir(1, Buffer.alloc(5 * 1024 * 1024 + 1024, 1), { tk: admin() });
    assert.strictEqual(r.status, 413);
    assert.strictEqual(subidos.length, 0);
});

test('sin archivo o con finca inexistente falla', async () => {
    assert.strictEqual((await subir(1, null, { tk: admin() })).status, 400);
    assert.strictEqual((await subir(99, await png(), { tk: admin() })).status, 404);
});

test('máximo 10 imágenes por finca', async () => {
    const buf = await png();
    for (let i = 0; i < 10; i++) assert.strictEqual((await subir(1, buf, { tk: admin() })).status, 201);
    assert.strictEqual((await subir(1, buf, { tk: admin() })).status, 409);
    assert.strictEqual(subidos.length, 10);
});

test('si falla guardar la fila, se borra el archivo ya subido', async () => {
    fallarInsercion = true;
    const r = await subir(1, await png(), { tk: admin() });
    assert.strictEqual(r.status, 500);
    assert.strictEqual(subidos.length, 1);
    assert.deepStrictEqual(borrados, [subidos[0]!.ruta]);
});

test('texto alternativo demasiado largo se rechaza antes de subir', async () => {
    const r = await subir(1, await png(), { tk: admin(), campos: { TextoAlternativo: 'x'.repeat(201) } });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(subidos.length, 0);
});

// ---- Eliminar y editar ----

const api = async (metodo: string, ruta: string, cuerpo?: object, tk = admin()) => {
    const res = await fetch(`${baseUrl()}/api${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
};

test('eliminar una imagen borra su archivo y la siguiente pasa a ser portada', async () => {
    const buf = await png();
    const a = await subir(1, buf, { tk: admin() });
    const b = await subir(1, buf, { tk: admin() });
    assert.strictEqual(a.body.imagen.EsPortada, true);

    assert.strictEqual((await api('DELETE', `/imagen/${a.body.IdImagen}`)).status, 200);
    assert.deepStrictEqual(borrados, [subidos[0]!.ruta]);
    assert.strictEqual(imagenes.find((i) => i.IdImagen === b.body.IdImagen).EsPortada, true);
});

test('un cliente no puede editar ni borrar imágenes', async () => {
    const a = await subir(1, await png(), { tk: admin() });
    assert.strictEqual((await api('DELETE', `/imagen/${a.body.IdImagen}`, undefined, token(2))).status, 403);
    assert.strictEqual((await api('PUT', `/imagen/${a.body.IdImagen}`, { Orden: 3 }, token(2))).status, 403);
});

test('se puede cambiar portada, orden y texto; no se puede dejar sin portada', async () => {
    const buf = await png();
    const a = await subir(1, buf, { tk: admin() });
    const b = await subir(1, buf, { tk: admin() });

    const r = await api('PUT', `/imagen/${b.body.IdImagen}`, { EsPortada: true, Orden: 1, TextoAlternativo: 'Sala' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    assert.strictEqual(imagenes.find((i) => i.IdImagen === b.body.IdImagen).EsPortada, true);
    assert.strictEqual(imagenes.find((i) => i.IdImagen === a.body.IdImagen).EsPortada, false);

    assert.strictEqual((await api('PUT', `/imagen/${b.body.IdImagen}`, { EsPortada: false })).status, 400);
    assert.strictEqual((await api('PUT', `/imagen/${b.body.IdImagen}`, { Orden: -5 })).status, 400);
});

test('la URL ya no es un dato editable: se ignora y la imagen no cambia', async () => {
    const a = await subir(1, await png(), { tk: admin() });
    const antes = imagenes.find((i) => i.IdImagen === a.body.IdImagen).RutaStorage;
    const r = await api('PUT', `/imagen/${a.body.IdImagen}`, { UrlImagen: 'https://otra.com/x.jpg', TextoAlternativo: 'Fachada' });
    assert.strictEqual(r.status, 200);
    const despues = imagenes.find((i) => i.IdImagen === a.body.IdImagen);
    assert.strictEqual(despues.RutaStorage, antes);
    assert.strictEqual(despues.TextoAlternativo, 'Fachada');
    assert.ok(!('UrlImagen' in (imagenDaoUltimoUpdate ?? {})));
});

test('ya no se pueden registrar imágenes por URL: solo subiendo el archivo', async () => {
    const r = await api('POST', '/imagen', { IdFinca: 1, UrlImagen: 'https://images.unsplash.com/foto.jpg' });
    assert.strictEqual(r.status, 404);
    assert.strictEqual(imagenes.length, 0);
});

import { randomUUID } from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import * as imagenDao from '../dao/imagen.dao';
import * as storage from '../conexion/storage';
import { procesarImagen } from './imagen.service';
import { Imagen } from '../models/imagen';

const MAX_BYTES_DESCARGA = 15 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const MAX_REDIRECCIONES = 3;

export type EstadoMigracion = 'migrada' | 'simulada' | 'fallida';

export interface ResultadoMigracion {
    IdImagen: number;
    IdFinca: number;
    origen: string;
    estado: EstadoMigracion;
    destino?: string;
    detalle?: string;
}

export interface Dependencias {
    /** Resuelve un host a sus IPs (inyectable para pruebas). */
    resolver: (host: string) => Promise<string[]>;
    /** Descarga una URL (inyectable para pruebas). */
    descargar: (url: string, init: RequestInit) => Promise<Response>;
}

const dependenciasReales: Dependencias = {
    resolver: async (host) => (await dns.lookup(host, { all: true })).map((a) => a.address),
    descargar: (url, init) => fetch(url, init)
};

// IPs que nunca deben descargarse: la URL viene de la base de datos y no debe servir para alcanzar la red interna.
const esIpPrivada = (ip: string): boolean => {
    if (net.isIPv4(ip)) {
        const [a = 0, b = 0] = ip.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    const v6 = ip.toLowerCase();
    if (v6.startsWith('::ffff:')) return esIpPrivada(v6.slice(7));
    return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
};

/**
 * Acepta solo https hacia hosts públicos (sin credenciales en la URL ni IPs internas).
 */
export const validarUrlDescarga = async (valor: string, resolver: Dependencias['resolver']): Promise<URL> => {
    let url: URL;
    try {
        url = new URL(valor);
    } catch {
        throw new Error('URL inválida');
    }
    if (url.protocol !== 'https:') throw new Error('solo se descargan URLs https');
    if (url.username || url.password) throw new Error('la URL no debe incluir credenciales');

    const host = url.hostname.replace(/^\[|\]$/g, '');
    const ips = net.isIP(host) ? [host] : await resolver(host).catch(() => []);
    if (!ips.length) throw new Error(`no se pudo resolver el host ${host}`);
    if (ips.some(esIpPrivada)) throw new Error(`el host ${host} apunta a una dirección interna`);
    return url;
};

/**
 * Descarga la imagen validando cada redirección y limitando el tamaño.
 */
const descargarImagen = async (origen: string, deps: Dependencias): Promise<Buffer> => {
    let url = await validarUrlDescarga(origen, deps.resolver);

    for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
        const res = await deps.descargar(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });

        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            if (salto === MAX_REDIRECCIONES) throw new Error('demasiadas redirecciones');
            url = await validarUrlDescarga(new URL(res.headers.get('location')!, url).toString(), deps.resolver);
            continue;
        }
        if (!res.ok) throw new Error(`el servidor respondió ${res.status}`);

        const declarado = Number(res.headers.get('content-length') ?? 0);
        if (declarado > MAX_BYTES_DESCARGA) throw new Error('la imagen supera 15 MB');

        const trozos: Buffer[] = [];
        let total = 0;
        const lector = res.body?.getReader();
        if (!lector) throw new Error('respuesta sin contenido');
        for (;;) {
            const { done, value } = await lector.read();
            if (done) break;
            total += value.length;
            if (total > MAX_BYTES_DESCARGA) {
                await lector.cancel();
                throw new Error('la imagen supera 15 MB');
            }
            trozos.push(Buffer.from(value));
        }
        return Buffer.concat(trozos);
    }
    throw new Error('demasiadas redirecciones');
};

/**
 * Mueve las imágenes que solo tienen UrlImagen (externas) a Supabase Storage.
 * - Idempotente: solo toma las que no tienen RutaStorage; cada ejecución retoma lo pendiente.
 * - Un fallo en una imagen no detiene las demás.
 * - Se conserva UrlImagen como registro del origen (la URL final la decide RutaStorage).
 * - Con `ejecutar: false` solo informa qué haría, sin descargar ni escribir.
 */
export const migrarImagenesExternas = async (
    opciones: { ejecutar: boolean },
    deps: Dependencias = dependenciasReales
): Promise<ResultadoMigracion[]> => {
    const pendientes: Imagen[] = await imagenDao.pendientesDeMigrar();
    const resultados: ResultadoMigracion[] = [];

    for (const img of pendientes) {
        const base = { IdImagen: img.IdImagen as number, IdFinca: img.IdFinca, origen: img.UrlImagen };

        if (!opciones.ejecutar) {
            resultados.push({ ...base, estado: 'simulada' });
            continue;
        }

        let ruta: string | null = null;
        try {
            const original = await descargarImagen(img.UrlImagen, deps);
            const procesada = await procesarImagen(original);

            ruta = `finca-${img.IdFinca}/${randomUUID()}.webp`;
            await storage.subirImagen(ruta, procesada.buffer);
            await imagenDao.marcarMigrada(base.IdImagen, {
                RutaStorage: ruta,
                TipoMime: 'image/webp',
                TamanoBytes: procesada.buffer.length,
                Ancho: procesada.ancho,
                Alto: procesada.alto
            });
            resultados.push({ ...base, estado: 'migrada', destino: ruta });
        } catch (err: any) {
            // Si el archivo llegó a subirse pero la fila no se actualizó, no dejar un archivo huérfano
            if (ruta) await storage.borrarImagenes([ruta]).catch(() => undefined);
            resultados.push({ ...base, estado: 'fallida', detalle: err?.message ?? String(err) });
        }
    }
    return resultados;
};

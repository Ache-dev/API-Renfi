import { randomUUID } from 'crypto';
import sharp from 'sharp';
import * as imagenDao from '../dao/imagen.dao';
import * as storage from '../conexion/storage';
import { Imagen, ActualizarImagenDto } from '../models/imagen';
import { AppError } from '../middlewares/error.middleware';

export const MAX_IMAGENES_POR_FINCA = 10;
export const MAX_BYTES = 5 * 1024 * 1024;
const LADO_MAXIMO = 1600;
const FORMATOS_ACEPTADOS = ['jpeg', 'png', 'webp'];

const verificarFinca = async (idFinca: number): Promise<void> => {
    if (!(await imagenDao.existeFinca(idFinca))) {
        throw new AppError(`Finca con ID ${idFinca} no encontrada`, 404);
    }
};

const aBooleano = (v: unknown): boolean | undefined =>
    v === undefined || v === null || v === '' ? undefined : v === true || v === 'true' || v === '1';

const textoAlternativo = (v: unknown): string | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null || String(v).trim() === '') return null;
    const t = String(v).trim();
    if (t.length > 200) throw new AppError('El texto alternativo no puede superar 200 caracteres', 400);
    return t;
};

/**
 * Obtiene todas las imágenes.
 */
export const getImagenes = async (): Promise<Imagen[]> => {
    return await imagenDao.listar();
};

/**
 * Obtiene la galería de una finca (portada primero).
 */
export const getImagenesPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    return await imagenDao.buscarPorIdFinca(idFinca);
};

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    return await imagenDao.buscarPorId(id);
};

/**
 * Valida que sea una imagen real (por su contenido, no por el nombre o el tipo declarado),
 * la reduce a 1600 px, corrige la orientación, elimina los metadatos (EXIF/GPS) y la convierte a WebP.
 */
export const procesarImagen = async (original: Buffer): Promise<{ buffer: Buffer; ancho: number; alto: number }> => {
    try {
        const entrada = sharp(original, { limitInputPixels: 40_000_000, failOn: 'error' });
        const { format } = await entrada.metadata();
        if (!format || !FORMATOS_ACEPTADOS.includes(format)) {
            throw new AppError('Formato no permitido. Usa una imagen JPG, PNG o WebP.', 400);
        }
        const { data, info } = await entrada
            .rotate()
            .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true });
        return { buffer: data, ancho: info.width, alto: info.height };
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('El archivo no es una imagen válida.', 400);
    }
};

/**
 * Sube una imagen a Supabase Storage y la agrega a la galería de la finca.
 * La primera imagen de una finca queda como portada automáticamente.
 */
export const subirImagenFinca = async (
    idFinca: number,
    archivo: { buffer: Buffer } | undefined,
    opciones: { TextoAlternativo?: unknown; EsPortada?: unknown } = {}
): Promise<{ id: number; IdImagen: number; imagen: Imagen | null }> => {
    if (!archivo?.buffer?.length) {
        throw new AppError('Debes enviar el archivo en el campo "imagen" (multipart/form-data).', 400);
    }
    await verificarFinca(idFinca);

    const existentes = await imagenDao.contarPorFinca(idFinca);
    if (existentes >= MAX_IMAGENES_POR_FINCA) {
        throw new AppError(`Cada finca admite máximo ${MAX_IMAGENES_POR_FINCA} imágenes. Elimina alguna antes de subir otra.`, 409);
    }
    const alt = textoAlternativo(opciones.TextoAlternativo);
    const procesada = await procesarImagen(archivo.buffer);

    const ruta = `finca-${idFinca}/${randomUUID()}.webp`;
    await storage.subirImagen(ruta, procesada.buffer);

    try {
        const id = await imagenDao.insertar({
            IdFinca: idFinca,
            RutaStorage: ruta,
            EsPortada: existentes === 0 || aBooleano(opciones.EsPortada) === true,
            TextoAlternativo: alt ?? null,
            TipoMime: 'image/webp',
            TamanoBytes: procesada.buffer.length,
            Ancho: procesada.ancho,
            Alto: procesada.alto
        });
        return { id, IdImagen: id, imagen: await imagenDao.buscarPorId(id) };
    } catch (err) {
        // No dejar un archivo huérfano si la fila no se pudo guardar
        await storage.borrarImagenes([ruta]).catch((e) => console.error('[Imagen] No se pudo limpiar el archivo huérfano:', e));
        throw err;
    }
};

/**
 * Actualiza una imagen: texto alternativo, orden, portada o finca.
 */
export const actualizarImagen = async (id: number, dto: ActualizarImagenDto): Promise<Imagen | null> => {
    const existente = await imagenDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Imagen con ID ${id} no encontrada`, 404);
    }

    const campos: Record<string, unknown> = {};
    let idFinca = existente.IdFinca;

    if (dto.IdFinca !== undefined && Number(dto.IdFinca) !== existente.IdFinca) {
        if (!Number.isInteger(Number(dto.IdFinca)) || Number(dto.IdFinca) <= 0) throw new AppError('IdFinca inválido', 400);
        await verificarFinca(Number(dto.IdFinca));
        idFinca = Number(dto.IdFinca);
        campos.IdFinca = idFinca;
        campos.EsPortada = false; // al cambiar de finca deja de ser portada de la anterior
    }
    const alt = textoAlternativo(dto.TextoAlternativo);
    if (alt !== undefined) campos.TextoAlternativo = alt;
    if (dto.Orden !== undefined) {
        const orden = Number(dto.Orden);
        if (!Number.isInteger(orden) || orden < 0 || orden > 1000) throw new AppError('Orden inválido', 400);
        campos.Orden = orden;
    }
    const portada = aBooleano(dto.EsPortada);
    if (portada === true && !('EsPortada' in campos)) campos.EsPortada = true;
    if (portada === false) {
        throw new AppError('Para cambiar la portada, marca otra imagen como portada.', 400);
    }

    await imagenDao.actualizar(id, idFinca, campos);
    return await imagenDao.buscarPorId(id);
};

/**
 * Elimina una imagen (fila y archivo). Si era la portada, la siguiente de la galería la reemplaza.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await imagenDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Imagen con ID ${id} no encontrada`, 404);
    }
    await imagenDao.eliminarPorId(id);

    if (existente.RutaStorage) {
        await storage.borrarImagenes([existente.RutaStorage]).catch((e) => console.error('[Imagen] No se pudo borrar el archivo de Storage:', e));
    }
    if (existente.EsPortada) {
        const siguiente = await imagenDao.primeraDeFinca(existente.IdFinca, id);
        if (siguiente?.IdImagen) await imagenDao.actualizar(siguiente.IdImagen, existente.IdFinca, { EsPortada: true });
    }
};

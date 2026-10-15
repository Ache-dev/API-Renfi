import getSupabase from './supabase';
import envConfig from '../config/env.config';
import { AppError } from '../middlewares/error.middleware';

/**
 * Subida y borrado de imágenes de fincas en Supabase Storage.
 * El bucket es público para lectura (URL directa por CDN); solo esta API, con la
 * clave secret, puede escribir o borrar.
 */
const bucket = () => getSupabase().storage.from(envConfig.SUPABASE.BUCKET_FINCAS);

/**
 * Sube una imagen WebP a la ruta indicada. No sobrescribe archivos existentes.
 */
export const subirImagen = async (ruta: string, contenido: Buffer): Promise<void> => {
    const { error } = await bucket().upload(ruta, contenido, {
        contentType: 'image/webp',
        cacheControl: '31536000', // el nombre lleva un UUID: el archivo nunca cambia
        upsert: false
    });
    if (error) {
        console.error('[Storage] No se pudo subir la imagen:', error.message);
        throw new AppError('No se pudo guardar la imagen. Inténtalo de nuevo.', 502);
    }
};

/**
 * Borra archivos del bucket (las rutas inexistentes se ignoran).
 */
export const borrarImagenes = async (rutas: string[]): Promise<void> => {
    if (!rutas.length) return;
    const { error } = await bucket().remove(rutas);
    if (error) throw new Error(`No se pudieron borrar archivos de Storage: ${error.message}`);
};

/**
 * URL pública de un archivo del bucket.
 */
export const urlPublica = (ruta: string): string => bucket().getPublicUrl(ruta).data.publicUrl;

/**
 * URL final de una imagen: la del bucket si está en Storage, o la externa heredada.
 */
export const urlDeImagen = (fila: { RutaStorage?: string | null; UrlImagen?: string | null }): string | null =>
    fila.RutaStorage ? urlPublica(fila.RutaStorage) : (fila.UrlImagen ?? null);

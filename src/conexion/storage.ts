import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import envConfig from '../config/env.config';
import { AppError } from '../middlewares/error.middleware';

/**
 * Subida y borrado de imágenes de fincas en Azure Blob Storage.
 * El contenedor es público para lectura anónima (URL directa); solo esta API puede escribir o borrar.
 * Autenticación: cadena de conexión en desarrollo; en Azure, identidad administrada
 * (rol "Storage Blob Data Contributor" sobre la cuenta).
 */
let contenedor: ContainerClient | null = null;

const getContenedor = (): ContainerClient => {
    if (!contenedor) {
        const { ACCOUNT_URL, CONTAINER, CONNECTION_STRING } = envConfig.AZURE_STORAGE;
        const servicio = CONNECTION_STRING
            ? BlobServiceClient.fromConnectionString(CONNECTION_STRING)
            : new BlobServiceClient(ACCOUNT_URL, new DefaultAzureCredential());
        contenedor = servicio.getContainerClient(CONTAINER);
    }
    return contenedor;
};

/**
 * Sube una imagen WebP a la ruta indicada. No sobrescribe blobs existentes.
 */
export const subirImagen = async (ruta: string, contenido: Buffer): Promise<void> => {
    try {
        await getContenedor().getBlockBlobClient(ruta).uploadData(contenido, {
            blobHTTPHeaders: {
                blobContentType: 'image/webp',
                blobCacheControl: 'public, max-age=31536000, immutable' // el nombre lleva un UUID: el archivo nunca cambia
            },
            conditions: { ifNoneMatch: '*' } // upsert: false
        });
    } catch (e: any) {
        console.error('[Storage] No se pudo subir la imagen:', e?.message);
        throw new AppError('No se pudo guardar la imagen. Inténtalo de nuevo.', 502);
    }
};

/**
 * Borra blobs del contenedor (las rutas inexistentes se ignoran).
 */
export const borrarImagenes = async (rutas: string[]): Promise<void> => {
    for (const ruta of rutas) {
        try {
            await getContenedor().getBlobClient(ruta).deleteIfExists({ deleteSnapshots: 'include' });
        } catch (e: any) {
            throw new Error(`No se pudieron borrar blobs de Azure Storage: ${e?.message}`);
        }
    }
};

/**
 * URL pública de un blob: AZURE_STORAGE_ACCOUNT_URL + contenedor + ruta relativa guardada en RutaStorage.
 */
export const urlPublica = (ruta: string): string =>
    `${envConfig.AZURE_STORAGE.ACCOUNT_URL}/${envConfig.AZURE_STORAGE.CONTAINER}/${ruta.split('/').map(encodeURIComponent).join('/')}`;

/**
 * URL final de una imagen a partir de su ruta en el contenedor.
 */
export const urlDeImagen = (fila: { RutaStorage: string }): string => urlPublica(fila.RutaStorage);

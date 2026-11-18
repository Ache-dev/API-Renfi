import { filas, fila, insertar as insertarSp, ejecutar } from "../conexion/postgres";
import { urlDeImagen } from "../conexion/storage";
import { Imagen, NuevaImagen } from "../models/imagen";

// Entrega siempre la URL final lista para mostrar (se calcula desde la ruta del blob).
const conUrl = (fila: any): Imagen => ({ ...fila, UrlImagen: urlDeImagen(fila) });

/**
 * Lista todas las imágenes registradas con datos de su finca.
 */
export const listar = async (): Promise<Imagen[]> => (await filas('sp_imagen_listar')).map(conUrl);

/**
 * Galería de una finca: portada primero y luego por orden.
 */
export const buscarPorIdFinca = async (idFinca: number): Promise<Imagen[]> =>
    (await filas('sp_imagen_por_finca', [idFinca])).map(conUrl);

/**
 * Cuántas imágenes tiene la finca.
 */
export const contarPorFinca = async (idFinca: number): Promise<number> =>
    Number((await fila<number>('sp_imagen_contar_finca', [idFinca])) ?? 0);

/**
 * Deja a la finca sin portada (paso previo a asignar otra por el índice único).
 */
export const limpiarPortada = (idFinca: number): Promise<void> => ejecutar('sp_imagen_limpiar_portada', [idFinca]);

/**
 * Inserta una imagen al final de la galería y retorna el IdImagen generado.
 * Si es portada, deja sin portada a las demás de la finca (todo dentro del procedimiento, en una transacción).
 */
export const insertar = (imagen: NuevaImagen): Promise<number> =>
    insertarSp('sp_imagen_insertar', [
        imagen.IdFinca,
        imagen.RutaStorage,
        imagen.EsPortada,
        imagen.TextoAlternativo ?? null,
        imagen.TipoMime ?? null,
        imagen.TamanoBytes ?? null,
        imagen.Ancho ?? null,
        imagen.Alto ?? null
    ]);

/**
 * Actualiza solo los campos recibidos. Asignar portada deja sin portada a las demás.
 */
export const actualizar = async (id: number, idFinca: number, campos: Record<string, unknown>): Promise<void> => {
    if (Object.keys(campos).length === 0) return;
    await ejecutar('sp_imagen_actualizar', [id, idFinca, JSON.stringify(campos)]);
};

/**
 * Elimina una imagen por su ID.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_imagen_eliminar', [id]);

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    const imagen = await fila('sp_imagen_buscar', [id]);
    return imagen ? conUrl(imagen) : null;
};

/**
 * Documento del propietario de la finca a la que pertenece la imagen (null si la imagen no existe).
 */
export const propietarioDe = async (id: number): Promise<number | null> => {
    const dueno = await fila<number>('sp_imagen_propietario', [id]);
    return dueno === null ? null : Number(dueno);
};

/**
 * Primera imagen de la galería de la finca (para ascender a portada), sin contar `excluirId`.
 */
export const primeraDeFinca = async (idFinca: number, excluirId: number): Promise<Imagen | null> => {
    const imagen = await fila('sp_imagen_primera_de_finca', [idFinca, excluirId]);
    return imagen ? conUrl(imagen) : null;
};

/**
 * Indica si existe la finca.
 */
export const existeFinca = async (idFinca: number): Promise<boolean> =>
    Boolean(await fila<boolean>('sp_finca_existe', [idFinca]));

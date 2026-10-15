import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { urlDeImagen } from "../conexion/storage";
import { Imagen, NuevaImagen } from "../models/imagen";

const COLUMNAS = 'IdImagen, UrlImagen, RutaStorage, IdFinca, Orden, EsPortada, TextoAlternativo, TipoMime, TamanoBytes, Ancho, Alto, FechaCreacion';

// Entrega siempre la URL final lista para mostrar, sea del bucket o externa.
const conUrl = (fila: any): Imagen => ({ ...fila, UrlImagen: urlDeImagen(fila) });

const porGaleria = (a: Imagen, b: Imagen) =>
    Number(b.EsPortada) - Number(a.EsPortada) || (a.Orden ?? 0) - (b.Orden ?? 0) || (a.IdImagen ?? 0) - (b.IdImagen ?? 0);

/**
 * Lista todas las imágenes registradas con datos de su finca.
 */
export const listar = async (): Promise<Imagen[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Imagen')
            .select(`${COLUMNAS}, Finca!inner(NombreFinca, Direccion, Municipio!inner(NombreMunicipio), Usuario!inner(NombreUsuario, ApellidoUsuario))`)
            .order('IdImagen')
    );
    return filas.map(({ Finca: f, ...i }) => ({
        ...conUrl(i),
        NombreFinca: f.NombreFinca,
        Direccion: f.Direccion,
        NombreMunicipio: f.Municipio.NombreMunicipio,
        NombrePropietario: f.Usuario.NombreUsuario,
        ApellidoPropietario: f.Usuario.ApellidoUsuario
    }));
};

/**
 * Galería de una finca: portada primero y luego por orden.
 */
export const buscarPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    const filas: any[] = await unwrap(getSupabase().from('Imagen').select(COLUMNAS).eq('IdFinca', idFinca));
    return filas.map(conUrl).sort(porGaleria);
};

/**
 * Cuántas imágenes tiene la finca.
 */
export const contarPorFinca = async (idFinca: number): Promise<number> => {
    const { count, error } = await getSupabase().from('Imagen').select('IdImagen', { count: 'exact', head: true }).eq('IdFinca', idFinca);
    if (error) throw Object.assign(new Error(error.message), { code: error.code ?? '', detail: error.details ?? '' });
    return count ?? 0;
};

/**
 * Deja a la finca sin portada (paso previo a asignar otra por el índice único).
 */
export const limpiarPortada = async (idFinca: number): Promise<void> => {
    await unwrap(getSupabase().from('Imagen').update({ EsPortada: false }).eq('IdFinca', idFinca).eq('EsPortada', true));
};

/**
 * Inserta una imagen al final de la galería y retorna el IdImagen generado.
 * Si es portada, deja sin portada a las demás de la finca.
 */
export const insertar = async (imagen: NuevaImagen): Promise<number> => {
    const ultimas: any[] = await unwrap(
        getSupabase().from('Imagen').select('Orden').eq('IdFinca', imagen.IdFinca).order('Orden', { ascending: false }).limit(1)
    );
    const orden = (ultimas[0]?.Orden ?? 0) + 1;
    if (imagen.EsPortada) await limpiarPortada(imagen.IdFinca);

    const fila = await unwrapOne(
        getSupabase().from('Imagen').insert({
            IdFinca: imagen.IdFinca,
            UrlImagen: imagen.UrlImagen ?? null,
            RutaStorage: imagen.RutaStorage ?? null,
            Orden: orden,
            EsPortada: imagen.EsPortada,
            TextoAlternativo: imagen.TextoAlternativo ?? null,
            TipoMime: imagen.TipoMime ?? null,
            TamanoBytes: imagen.TamanoBytes ?? null,
            Ancho: imagen.Ancho ?? null,
            Alto: imagen.Alto ?? null
        }).select('IdImagen').single()
    );
    return Number(fila.IdImagen);
};

/**
 * Actualiza solo los campos recibidos. Asignar portada deja sin portada a las demás.
 */
export const actualizar = async (id: number, idFinca: number, campos: Record<string, unknown>): Promise<void> => {
    if (campos.EsPortada === true) await limpiarPortada(idFinca);
    if (Object.keys(campos).length === 0) return;
    await unwrap(getSupabase().from('Imagen').update(campos).eq('IdImagen', id));
};

/**
 * Elimina una imagen por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Imagen').delete().eq('IdImagen', id));
};

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (id: number): Promise<Imagen | null> => {
    const fila: any = await unwrap(
        getSupabase().from('Imagen').select(`${COLUMNAS}, Finca(NombreFinca)`).eq('IdImagen', id).maybeSingle()
    );
    if (!fila) return null;
    const { Finca: f, ...resto } = fila;
    return { ...conUrl(resto), NombreFinca: f?.NombreFinca ?? null };
};

/**
 * Primera imagen de la galería de la finca (para ascender a portada), sin contar `excluirId`.
 */
export const primeraDeFinca = async (idFinca: number, excluirId: number): Promise<Imagen | null> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Imagen').select(COLUMNAS).eq('IdFinca', idFinca).neq('IdImagen', excluirId).order('Orden').order('IdImagen').limit(1)
    );
    return filas[0] ? conUrl(filas[0]) : null;
};

/**
 * Imágenes que solo tienen URL externa (aún no están en Storage), en orden de Id.
 */
export const pendientesDeMigrar = async (): Promise<Imagen[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Imagen').select(COLUMNAS).is('RutaStorage', null).not('UrlImagen', 'is', null).order('IdImagen')
    );
    return filas;
};

/**
 * Registra que una imagen ya está en Storage. Solo actúa si todavía no tenía RutaStorage,
 * así dos ejecuciones simultáneas del script no se pisan.
 */
export const marcarMigrada = async (
    id: number,
    datos: { RutaStorage: string; TipoMime: string; TamanoBytes: number; Ancho: number; Alto: number }
): Promise<void> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Imagen').update(datos).eq('IdImagen', id).is('RutaStorage', null).select('IdImagen')
    );
    if (!filas.length) throw new Error(`La imagen ${id} ya fue migrada o no existe`);
};

/**
 * Indica si existe la finca.
 */
export const existeFinca = async (idFinca: number): Promise<boolean> => {
    const fila = await unwrap(getSupabase().from('Finca').select('IdFinca').eq('IdFinca', idFinca).maybeSingle());
    return fila !== null;
};

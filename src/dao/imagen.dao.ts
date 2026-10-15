import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { Imagen } from "../models/imagen";

/**
 * Lista todas las imágenes registradas con datos de su finca.
 */
export const listar = async (): Promise<Imagen[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Imagen')
            .select('IdImagen, UrlImagen, IdFinca, Finca!inner(NombreFinca, Direccion, Municipio!inner(NombreMunicipio), Usuario!inner(NombreUsuario, ApellidoUsuario))')
            .order('IdImagen')
    );
    return filas.map(({ Finca: f, ...i }) => ({
        ...i,
        NombreFinca: f.NombreFinca,
        Direccion: f.Direccion,
        NombreMunicipio: f.Municipio.NombreMunicipio,
        NombrePropietario: f.Usuario.NombreUsuario,
        ApellidoPropietario: f.Usuario.ApellidoUsuario
    }));
};

/**
 * Obtiene todas las imágenes asociadas a una finca específica.
 */
export const buscarPorIdFinca = async (idFinca: number): Promise<Imagen[]> => {
    return unwrap(getSupabase().from('Imagen').select('IdImagen, UrlImagen, IdFinca').eq('IdFinca', idFinca)) as Promise<Imagen[]>;
};

/**
 * Inserta una nueva imagen y retorna el IdImagen generado.
 */
export const insertar = async (imagen: Imagen): Promise<number> => {
    const fila = await unwrapOne(
        getSupabase().from('Imagen').insert({ UrlImagen: imagen.UrlImagen, IdFinca: imagen.IdFinca }).select('IdImagen').single()
    );
    return Number(fila.IdImagen);
};

/**
 * Actualiza una imagen existente.
 */
export const actualizar = async (imagen: Imagen): Promise<void> => {
    await unwrap(
        getSupabase().from('Imagen').update({ UrlImagen: imagen.UrlImagen, IdFinca: imagen.IdFinca }).eq('IdImagen', imagen.IdImagen)
    );
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
        getSupabase().from('Imagen').select('IdImagen, UrlImagen, IdFinca, Finca(NombreFinca)').eq('IdImagen', id).maybeSingle()
    );
    if (!fila) return null;
    const { Finca: f, ...resto } = fila;
    return { ...resto, NombreFinca: f?.NombreFinca ?? null };
};

/**
 * Indica si existe la finca.
 */
export const existeFinca = async (idFinca: number): Promise<boolean> => {
    const fila = await unwrap(getSupabase().from('Finca').select('IdFinca').eq('IdFinca', idFinca).maybeSingle());
    return fila !== null;
};

import getSupabase, { unwrap, unwrapOne, contar } from "../conexion/supabase";
import { Municipio, MunicipioReporte } from "../models/municipio";

export type { MunicipioReporte };

/**
 * Reporte: reservas por finca y municipio, de mayor a menor.
 */
export const municipiosConMasReservas = async (): Promise<MunicipioReporte[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Reserva').select('IdFinca, Finca!inner(NombreFinca, Municipio!inner(NombreMunicipio))')
    );
    const grupos = new Map<number, MunicipioReporte>();
    for (const r of filas) {
        const g = grupos.get(r.IdFinca) ?? {
            NombreMunicipio: r.Finca.Municipio.NombreMunicipio,
            IdFinca: r.IdFinca,
            NombreFinca: r.Finca.NombreFinca,
            TotalReservas: 0
        };
        g.TotalReservas++;
        grupos.set(r.IdFinca, g);
    }
    return [...grupos.values()].sort((a, b) => b.TotalReservas - a.TotalReservas);
};

/**
 * Lista todos los municipios.
 */
export const listar = async (): Promise<Municipio[]> => {
    return unwrap(getSupabase().from('Municipio').select('IdMunicipio, NombreMunicipio').order('IdMunicipio')) as Promise<Municipio[]>;
};

/**
 * Inserta un nuevo municipio y retorna el IdMunicipio generado.
 */
export const insertar = async (municipio: Municipio): Promise<number> => {
    const fila = await unwrapOne(getSupabase().from('Municipio').insert({ NombreMunicipio: municipio.NombreMunicipio }).select('IdMunicipio').single());
    return Number(fila.IdMunicipio);
};

/**
 * Actualiza un municipio existente.
 */
export const actualizar = async (municipio: Municipio): Promise<void> => {
    await unwrap(getSupabase().from('Municipio').update({ NombreMunicipio: municipio.NombreMunicipio }).eq('IdMunicipio', municipio.IdMunicipio));
};

/**
 * Elimina un municipio por su ID.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Municipio').delete().eq('IdMunicipio', id));
};

/**
 * Busca un municipio por su ID.
 */
export const buscarPorId = async (id: number): Promise<Municipio | null> => {
    return unwrap(getSupabase().from('Municipio').select('IdMunicipio, NombreMunicipio').eq('IdMunicipio', id).maybeSingle()) as Promise<Municipio | null>;
};

/**
 * Cuenta registros de Finca que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = (id: number): Promise<number> => contar('Finca', 'IdMunicipio', id);

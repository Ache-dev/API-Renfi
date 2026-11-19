import getSupabase, { unwrap, unwrapOne } from "../conexion/supabase";
import { urlDeImagen } from "../conexion/storage";
import {
    Finca,
    FincaReservada,
    FincaPromedioCalificacion,
    FincaIngresos,
    FincaIngresosTop
} from "../models/finca";

export type {
    FincaReservada,
    FincaPromedioCalificacion,
    FincaIngresos,
    FincaIngresosTop
};

const SELECT_FINCA = 'IdFinca, IdMunicipio, NumeroDocumentoUsuario, NombreFinca, Direccion, InformacionAdicional, Capacidad, Precio, Estado, Calificacion, Habitaciones, Banos, Camas, NochesMinimas, Comodidades, Reglas, HoraEntrada, HoraSalida, PermiteMascotas, PermiteEventos, Latitud, Longitud, Municipio(NombreMunicipio), Usuario(NumeroDocumento, NombreUsuario, ApellidoUsuario, Telefono, Correo), Imagen(IdImagen, RutaStorage, IdFinca, Orden, EsPortada, TextoAlternativo, Ancho, Alto)';

// Columnas de la ficha completa (la base les da un valor por defecto si no se envían)
const CAMPOS_FICHA = ['Habitaciones', 'Banos', 'Camas', 'NochesMinimas', 'Comodidades', 'Reglas', 'HoraEntrada', 'HoraSalida', 'PermiteMascotas', 'PermiteEventos', 'Latitud', 'Longitud'] as const;

const fichaDe = (finca: Finca): Record<string, unknown> =>
    Object.fromEntries(CAMPOS_FICHA.filter((c) => (finca as any)[c] !== undefined).map((c) => [c, (finca as any)[c]]));

const hhmm = (hora?: string | null) => (hora ? String(hora).slice(0, 5) : null);

const aplanar = ({ Municipio: m, Usuario: u, Imagen: imagenes, ...f }: any): Finca => {
    // Galería ordenada: portada primero y luego por orden, con la URL final de cada imagen
    const galeria = (imagenes ?? [])
        .map(({ RutaStorage, ...i }: any) => ({ ...i, UrlImagen: urlDeImagen({ RutaStorage }) }))
        .sort((a: any, b: any) => Number(b.EsPortada) - Number(a.EsPortada) || a.Orden - b.Orden || a.IdImagen - b.IdImagen);
    return {
        ...f,
        HoraEntrada: hhmm(f.HoraEntrada),
        HoraSalida: hhmm(f.HoraSalida),
        Imagenes: galeria,
        UrlPortada: galeria[0]?.UrlImagen ?? null,
        NombreMunicipio: m?.NombreMunicipio ?? null,
        IdPropietario: u?.NumeroDocumento ?? null,
        NombrePropietario: u?.NombreUsuario ?? null,
        ApellidoPropietario: u?.ApellidoUsuario ?? null,
        TelefonoPropietario: u?.Telefono ?? null,
        CorreoPropietario: u?.Correo ?? null,
        Dueno: u?.NombreUsuario ?? null
    };
};

/**
 * Lista todas las fincas con información de municipio y propietario.
 */
export const listar = async (): Promise<Finca[]> => {
    const filas: any[] = await unwrap(getSupabase().from('Finca').select(SELECT_FINCA).order('IdFinca'));
    return filas.map(aplanar);
};

/**
 * Inserta una nueva finca y retorna el IdFinca generado.
 */
export const insertar = async (finca: Finca): Promise<number> => {
    const fila = await unwrapOne(
        getSupabase().from('Finca').insert({
            IdMunicipio: finca.IdMunicipio,
            NumeroDocumentoUsuario: finca.NumeroDocumentoUsuario,
            NombreFinca: finca.NombreFinca,
            Direccion: finca.Direccion,
            InformacionAdicional: finca.InformacionAdicional ?? null,
            Capacidad: finca.Capacidad ?? 0,
            Precio: finca.Precio ?? 0,
            Estado: finca.Estado ?? 'Disponible',
            Calificacion: finca.Calificacion ?? 5,
            ...fichaDe(finca)
        }).select('IdFinca').single()
    );
    return Number(fila.IdFinca);
};

/**
 * Actualiza los datos de una finca existente.
 */
export const actualizar = async (finca: Finca): Promise<void> => {
    await unwrap(
        getSupabase().from('Finca').update({
            IdMunicipio: finca.IdMunicipio,
            NumeroDocumentoUsuario: finca.NumeroDocumentoUsuario,
            NombreFinca: finca.NombreFinca,
            Direccion: finca.Direccion,
            InformacionAdicional: finca.InformacionAdicional ?? null,
            Capacidad: finca.Capacidad ?? 0,
            Precio: finca.Precio ?? 0,
            Estado: finca.Estado ?? 'Disponible',
            Calificacion: finca.Calificacion ?? 5,
            ...fichaDe(finca)
        }).eq('IdFinca', finca.IdFinca)
    );
};

/**
 * Fincas de un propietario (con el mismo detalle que el catálogo).
 */
export const listarPorPropietario = async (numeroDocumento: number): Promise<Finca[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Finca').select(SELECT_FINCA).eq('NumeroDocumentoUsuario', numeroDocumento).order('IdFinca')
    );
    return filas.map(aplanar);
};

/**
 * Documento del propietario de la finca (null si la finca no existe).
 */
export const propietarioDe = async (idFinca: number): Promise<number | null> => {
    const fila: any = await unwrap(getSupabase().from('Finca').select('NumeroDocumentoUsuario').eq('IdFinca', idFinca).maybeSingle());
    return fila ? Number(fila.NumeroDocumentoUsuario) : null;
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await unwrap(getSupabase().from('Finca').delete().eq('IdFinca', id));
};

/**
 * Busca una finca por su identificador incluyendo datos del propietario y municipio.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => {
    const fila = await unwrap(getSupabase().from('Finca').select(SELECT_FINCA).eq('IdFinca', id).maybeSingle());
    return fila ? aplanar(fila) : null;
};

// Reportes (se agregan en memoria; el volumen de una API de fincas lo permite)

export const fincasMasReservadas = async (): Promise<FincaReservada[]> => {
    const filas: any[] = await unwrap(getSupabase().from('Reserva').select('IdFinca, Finca!inner(NombreFinca)'));
    const grupos = new Map<number, any>();
    for (const r of filas) {
        const g = grupos.get(r.IdFinca) ?? { IdFinca: r.IdFinca, NombreFinca: r.Finca.NombreFinca, CantidadReservas: 0 };
        g.CantidadReservas++;
        grupos.set(r.IdFinca, g);
    }
    return [...grupos.values()].sort((a, b) => b.CantidadReservas - a.CantidadReservas).slice(0, 5);
};

export const promedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Finca').select('IdFinca, NombreFinca, Calificacion').not('Calificacion', 'is', null)
    );
    return filas
        .map(f => ({ IdFinca: f.IdFinca, NombreFinca: f.NombreFinca, PromedioCalificacion: Math.round(Number(f.Calificacion) * 100) / 100 }))
        .sort((a, b) => b.PromedioCalificacion - a.PromedioCalificacion);
};

/**
 * Suma de pagos en estado 'Pagado' por finca, de mayor a menor.
 */
const ingresosPorFinca = async (): Promise<{ IdFinca: number; NombreFinca: string; total: number }[]> => {
    const filas: any[] = await unwrap(
        getSupabase().from('Pago')
            .select('Monto, Factura!inner(Reserva!inner(Finca!inner(IdFinca, NombreFinca)))')
            .eq('EstadoPago', 'Pagado')
    );
    const grupos = new Map<number, { IdFinca: number; NombreFinca: string; total: number }>();
    for (const p of filas) {
        const f = p.Factura.Reserva.Finca;
        const g = grupos.get(f.IdFinca) ?? { IdFinca: f.IdFinca, NombreFinca: f.NombreFinca, total: 0 };
        g.total += Number(p.Monto ?? 0);
        grupos.set(f.IdFinca, g);
    }
    return [...grupos.values()].sort((a, b) => b.total - a.total);
};

export const totalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    return (await ingresosPorFinca()).map(({ total, ...f }) => ({ ...f, TotalIngresos: total }));
};

export const fincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    return (await ingresosPorFinca()).slice(0, 5).map(({ total, ...f }) => ({ ...f, IngresosTotales: total }));
};
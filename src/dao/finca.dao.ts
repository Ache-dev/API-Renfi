import { filas, fila, insertar as insertarSp, ejecutar } from "../conexion/postgres";
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

// Campos de la ficha completa: solo se envían a la base los que vienen definidos
// (en el alta, la base da el valor por defecto a los ausentes; en la edición, los ausentes no cambian).
const CAMPOS_FICHA = ['Habitaciones', 'Banos', 'Camas', 'NochesMinimas', 'Comodidades', 'Reglas', 'HoraEntrada', 'HoraSalida', 'PermiteMascotas', 'PermiteEventos', 'Latitud', 'Longitud'] as const;

const fichaDe = (finca: Finca): string =>
    JSON.stringify(Object.fromEntries(CAMPOS_FICHA.filter((c) => (finca as any)[c] !== undefined).map((c) => [c, (finca as any)[c]])));

// La base ya devuelve la finca aplanada y su galería ordenada (portada primero); aquí solo se arma la URL pública.
const conGaleria = ({ Imagenes, ...f }: any): Finca => {
    const galeria = (Imagenes ?? []).map(({ RutaStorage, ...i }: any) => ({ ...i, UrlImagen: urlDeImagen({ RutaStorage }) }));
    return { ...f, Imagenes: galeria, UrlPortada: galeria[0]?.UrlImagen ?? null };
};

const datosBasicos = (finca: Finca) => [
    finca.IdMunicipio,
    finca.NumeroDocumentoUsuario,
    finca.NombreFinca,
    finca.Direccion,
    finca.InformacionAdicional ?? null,
    finca.Capacidad ?? 0,
    finca.Precio ?? 0,
    finca.Estado ?? 'Disponible',
    finca.Calificacion ?? 5,
    fichaDe(finca)
];

/**
 * Lista todas las fincas con información de municipio y propietario.
 */
export const listar = async (): Promise<Finca[]> => (await filas('sp_finca_listar')).map(conGaleria);

/**
 * Inserta una nueva finca y retorna el IdFinca generado.
 */
export const insertar = (finca: Finca): Promise<number> => insertarSp('sp_finca_insertar', datosBasicos(finca));

/**
 * Actualiza los datos de una finca existente.
 */
export const actualizar = (finca: Finca): Promise<void> => ejecutar('sp_finca_actualizar', [finca.IdFinca, ...datosBasicos(finca)]);

/**
 * Fincas de un propietario (con el mismo detalle que el catálogo).
 */
export const listarPorPropietario = async (numeroDocumento: number): Promise<Finca[]> =>
    (await filas('sp_finca_listar_propietario', [numeroDocumento])).map(conGaleria);

/**
 * Documento del propietario de la finca (null si la finca no existe).
 */
export const propietarioDe = async (idFinca: number): Promise<number | null> => {
    const dueno = await fila<number>('sp_finca_propietario', [idFinca]);
    return dueno === null ? null : Number(dueno);
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_finca_eliminar', [id]);

/**
 * Busca una finca por su identificador incluyendo datos del propietario y municipio.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => {
    const f = await fila('sp_finca_buscar', [id]);
    return f ? conGaleria(f) : null;
};

// Reportes (agregados en la base con GROUP BY)

export const fincasMasReservadas = (): Promise<FincaReservada[]> => filas('sp_finca_mas_reservadas', [5]);

export const promedioCalificacionFincas = (): Promise<FincaPromedioCalificacion[]> => filas('sp_finca_promedio_calificacion');

export const totalIngresosPorFinca = async (): Promise<FincaIngresos[]> =>
    (await filas('sp_finca_ingresos')).map(({ Total, ...f }) => ({ ...f, TotalIngresos: Total }));

export const fincasConMasIngresos = async (): Promise<FincaIngresosTop[]> =>
    (await filas('sp_finca_ingresos', [5])).map(({ Total, ...f }) => ({ ...f, IngresosTotales: Total }));

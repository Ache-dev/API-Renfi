import * as fincaDao from '../dao/finca.dao';
import * as imagenDao from '../dao/imagen.dao';
import * as storage from '../conexion/storage';
import { 
    Finca, 
    CrearFincaDto, 
    ActualizarFincaDto, 
    FincaReservada, 
    FincaPromedioCalificacion, 
    FincaIngresos, 
    FincaIngresosTop 
} from '../models/finca';
import { AppError } from '../middlewares/error.middleware';
import { texto, entero, unoDe, PRECIO_MAXIMO } from './validacion';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const booleano = (campo: string, v: unknown): boolean => {
    if (v === true || v === 'true' || v === '1' || v === 1) return true;
    if (v === false || v === 'false' || v === '0' || v === 0) return false;
    throw new AppError(`${campo} debe ser verdadero o falso`, 400);
};
const hora = (campo: string, v: unknown): string => {
    if (typeof v !== 'string' || !HORA.test(v.trim())) throw new AppError(`${campo} debe tener formato HH:MM (24 horas)`, 400);
    return v.trim();
};
const coordenada = (campo: string, v: unknown, limite: number): number | null => {
    if (v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || Math.abs(n) > limite) throw new AppError(`${campo} debe estar entre -${limite} y ${limite}`, 400);
    return Math.round(n * 1e6) / 1e6;
};

/**
 * Valida y normaliza los datos de la ficha de una finca. Solo devuelve los campos recibidos,
 * así una actualización parcial no pisa lo que no se envió.
 */
export const normalizarFicha = (dto: CrearFincaDto | ActualizarFincaDto): Partial<Finca> => {
    const f: Partial<Finca> = {};
    // Estos campos tienen valor por defecto y no admiten NULL: un valor vacío (formularios) significa "sin cambio"
    const d: any = { ...dto };
    for (const c of ['Habitaciones', 'Banos', 'Camas', 'NochesMinimas', 'PermiteMascotas', 'PermiteEventos', 'HoraEntrada', 'HoraSalida']) {
        if (d[c] === null || d[c] === '') delete d[c];
    }
    dto = d;
    if (dto.Habitaciones !== undefined) f.Habitaciones = entero('Habitaciones', dto.Habitaciones, 0, 100);
    if (dto.Banos !== undefined) f.Banos = entero('Banos', dto.Banos, 0, 100);
    if (dto.Camas !== undefined) f.Camas = entero('Camas', dto.Camas, 0, 200);
    if (dto.NochesMinimas !== undefined) f.NochesMinimas = entero('NochesMinimas', dto.NochesMinimas, 1, 30);
    if (dto.PermiteMascotas !== undefined) f.PermiteMascotas = booleano('PermiteMascotas', dto.PermiteMascotas);
    if (dto.PermiteEventos !== undefined) f.PermiteEventos = booleano('PermiteEventos', dto.PermiteEventos);
    if (dto.HoraEntrada !== undefined) f.HoraEntrada = hora('HoraEntrada', dto.HoraEntrada);
    if (dto.HoraSalida !== undefined) f.HoraSalida = hora('HoraSalida', dto.HoraSalida);

    if (dto.Reglas !== undefined) {
        const reglas = dto.Reglas === null ? '' : String(dto.Reglas).trim();
        if (reglas.length > 1000) throw new AppError('Reglas no puede superar 1000 caracteres', 400);
        f.Reglas = reglas || null;
    }
    if (dto.Comodidades !== undefined) {
        const lista = Array.isArray(dto.Comodidades) ? dto.Comodidades : String(dto.Comodidades ?? '').split(',');
        const limpias = [...new Set(lista.map((c) => String(c).trim()).filter(Boolean))];
        if (limpias.length > 30 || limpias.some((c) => c.length > 50)) {
            throw new AppError('Comodidades admite hasta 30 elementos de máximo 50 caracteres', 400);
        }
        f.Comodidades = limpias;
    }
    if (dto.Latitud !== undefined || dto.Longitud !== undefined) {
        const lat = coordenada('Latitud', dto.Latitud ?? null, 90);
        const lon = coordenada('Longitud', dto.Longitud ?? null, 180);
        if ((lat === null) !== (lon === null)) throw new AppError('Latitud y Longitud deben enviarse juntas', 400);
        f.Latitud = lat;
        f.Longitud = lon;
    }
    return f;
};


/**
 * Obtiene todas las fincas registradas.
 */
export const getFincas = async (): Promise<Finca[]> => fincaDao.listar();

/**
 * Busca una finca por su identificador.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => fincaDao.buscarPorId(id);

/**
 * Fincas que pertenecen a un propietario (panel del dueño de finca).
 */
export const getFincasDePropietario = async (numeroDocumento: number): Promise<Finca[]> => {
    return await fincaDao.listarPorPropietario(numeroDocumento);
};

export const ESTADOS_FINCA = ['Disponible', 'No disponible'];

const INT_MAX = 2_147_483_647;
const vacio = (v: unknown) => v === undefined || v === null || v === '';

/**
 * Valida los datos básicos recibidos. Solo devuelve los campos enviados, así una
 * actualización parcial no pisa lo demás; un número vacío (formularios) significa "sin cambio".
 */
const normalizarBasicos = (dto: CrearFincaDto | ActualizarFincaDto): Partial<Finca> => {
    const f: Partial<Finca> = {};
    if (dto.NombreFinca !== undefined) f.NombreFinca = texto('NombreFinca', dto.NombreFinca, 300);
    if (dto.Direccion !== undefined) f.Direccion = texto('Direccion', dto.Direccion, 500);
    if (dto.InformacionAdicional !== undefined) f.InformacionAdicional = texto('InformacionAdicional', dto.InformacionAdicional, 500, false);
    if (dto.Estado !== undefined) f.Estado = unoDe('Estado', dto.Estado, ESTADOS_FINCA);
    if (!vacio(dto.IdMunicipio)) f.IdMunicipio = entero('IdMunicipio', dto.IdMunicipio, 1, INT_MAX);
    if (!vacio(dto.NumeroDocumentoUsuario)) f.NumeroDocumentoUsuario = entero('NumeroDocumentoUsuario', dto.NumeroDocumentoUsuario, 1, INT_MAX);
    if (!vacio(dto.Precio)) f.Precio = entero('Precio', dto.Precio, 1, PRECIO_MAXIMO);
    if (!vacio(dto.Capacidad)) f.Capacidad = entero('Capacidad', dto.Capacidad, 1, 500);
    if (!vacio(dto.Calificacion)) f.Calificacion = entero('Calificacion', dto.Calificacion, 1, 5);
    return { ...f, ...normalizarFicha(dto) };
};

/**
 * Crea una nueva finca validando datos requeridos.
 */
export const crearFinca = async (dto: CrearFincaDto): Promise<{ id: number; finca: Finca | null }> => {
    const datos = normalizarBasicos(dto);
    const faltan = ['NombreFinca', 'Direccion', 'IdMunicipio', 'NumeroDocumentoUsuario', 'Precio', 'Capacidad'].filter((c) => (datos as any)[c] === undefined);
    if (faltan.length) throw new AppError(`Los campos ${faltan.join(', ')} son obligatorios`, 400);

    const id = await fincaDao.insertar({ Estado: 'Disponible', Calificacion: 5, InformacionAdicional: '', ...datos } as Finca);
    return { id, finca: await fincaDao.buscarPorId(id) };
};

/**
 * Actualiza una finca existente.
 */
export const actualizarFinca = async (id: number, dto: ActualizarFincaDto): Promise<Finca | null> => {
    const existente = await fincaDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Finca con ID ${id} no encontrada`, 404);
    }
    // Un estado heredado que no se toca se respeta; uno nuevo debe ser válido
    const cambios = dto.Estado === existente.Estado ? { ...dto, Estado: undefined } : dto;
    await fincaDao.actualizar({ ...existente, ...normalizarBasicos(cambios), IdFinca: id });
    return await fincaDao.buscarPorId(id);
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    if (!(await fincaDao.buscarPorId(id))) {
        throw new AppError(`Finca con ID ${id} no encontrada`, 404);
    }
    // Rutas de los archivos antes de borrar: las filas de Imagen caen en cascada con la finca
    const rutas = (await imagenDao.buscarPorIdFinca(id)).map((i) => i.RutaStorage).filter((r): r is string => Boolean(r));
    await fincaDao.eliminarPorId(id);
    await storage.borrarImagenes(rutas).catch((e) => console.error('[FincaService] No se pudieron borrar las imágenes de Storage:', e));
};

// Reportes
export const getFincasMasReservadas = (): Promise<FincaReservada[]> => fincaDao.fincasMasReservadas();
export const getPromedioCalificacionFincas = (): Promise<FincaPromedioCalificacion[]> => fincaDao.promedioCalificacionFincas();
export const getTotalIngresosPorFinca = (): Promise<FincaIngresos[]> => fincaDao.totalIngresosPorFinca();
export const getFincasConMasIngresos = (): Promise<FincaIngresosTop[]> => fincaDao.fincasConMasIngresos();

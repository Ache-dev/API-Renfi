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
import { AppError, esErrorDeConexion } from '../middlewares/error.middleware';

// Fincas seed demo representativas de la arquitectura campestre colombiana
const SEED_FINCAS: Finca[] = [
    {
        IdFinca: 1,
        NombreFinca: 'Finca Campestre El Paraíso',
        Direccion: 'Km 5 Vía El Peñol - Guatapé',
        InformacionAdicional: 'Hermosa finca colonial frente a la represa, muelle privado, jacuzzi climatizado, zona BBQ y amplios corredores con chambranas tradicionales.',
        Capacidad: 16,
        Precio: 850000,
        Estado: 'Disponible',
        Calificacion: 5,
        IdMunicipio: 2,
        NombreMunicipio: 'Guatapé',
        NumeroDocumentoUsuario: 10001,
        Dueno: 'Admin Renfi'
    },
    {
        IdFinca: 2,
        NombreFinca: 'Villa Los Samanes de Santa Fe',
        Direccion: 'Vereda El Espinal, Santa Fe de Antioquia',
        InformacionAdicional: 'Clima cálido garantizado, piscina olímpica privada, palmeras, kiosco campestre y amplias áreas verdes para descanso familiar.',
        Capacidad: 20,
        Precio: 1200000,
        Estado: 'Disponible',
        Calificacion: 5,
        IdMunicipio: 3,
        NombreMunicipio: 'Santa Fe de Antioquia',
        NumeroDocumentoUsuario: 10001,
        Dueno: 'Admin Renfi'
    },
    {
        IdFinca: 3,
        NombreFinca: 'Hacienda La Cordillera',
        Direccion: 'Vereda Las Cuchillas, Rionegro',
        InformacionAdicional: 'Exclusiva hacienda cafetera tradicional con vista panorámica a la cordillera, chimenea de leña, senderos y arquitectura en madera noble.',
        Capacidad: 12,
        Precio: 950000,
        Estado: 'Disponible',
        Calificacion: 5,
        IdMunicipio: 6,
        NombreMunicipio: 'Rionegro',
        NumeroDocumentoUsuario: 10001,
        Dueno: 'Admin Renfi'
    },
    {
        IdFinca: 4,
        NombreFinca: 'Cabaña El Cafetal de Jardín',
        Direccion: 'Camino a La Herradura, Jardín',
        InformacionAdicional: 'Auténtica arquitectura andina rodeada de cafetales y orquídeas. Balcón perimetral con vistas a los majestuosos Farallones.',
        Capacidad: 8,
        Precio: 450000,
        Estado: 'Disponible',
        Calificacion: 5,
        IdMunicipio: 4,
        NombreMunicipio: 'Jardín',
        NumeroDocumentoUsuario: 10001,
        Dueno: 'Admin Renfi'
    },
    {
        IdFinca: 5,
        NombreFinca: 'Refugio de Jericó',
        Direccion: 'Vereda Castocá, Jericó',
        InformacionAdicional: 'Tranquilidad absoluta, amaneceres entre la niebla montañera, senderos ecológicos y ambiente acogedor de tapia pisada.',
        Capacidad: 10,
        Precio: 580000,
        Estado: 'Disponible',
        Calificacion: 5,
        IdMunicipio: 5,
        NombreMunicipio: 'Jericó',
        NumeroDocumentoUsuario: 10001,
        Dueno: 'Admin Renfi'
    },
    {
        IdFinca: 6,
        NombreFinca: 'Hacienda San Jerónimo del Sol',
        Direccion: 'Sector La Loma, San Jerónimo',
        InformacionAdicional: 'Piscina con cascada, cancha deportiva, salón de juegos y zona de hamacas bajo frondosos árboles frutales.',
        Capacidad: 25,
        Precio: 1500000,
        Estado: 'Disponible',
        Calificacion: 5,
        IdMunicipio: 11,
        NombreMunicipio: 'San Jerónimo',
        NumeroDocumentoUsuario: 10001,
        Dueno: 'Admin Renfi'
    }
];

const fallbackFincas: Finca[] = [...SEED_FINCAS];

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const entero = (campo: string, v: unknown, min: number, max: number): number => {
    const n = Number(v);
    if (v === '' || v === null || !Number.isInteger(n) || n < min || n > max) {
        throw new AppError(`${campo} debe ser un entero entre ${min} y ${max}`, 400);
    }
    return n;
};
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
 * Obtiene todas las fincas registradas con tolerancia a fallos.
 */
export const getFincas = async (): Promise<Finca[]> => {
    try {
        return await fincaDao.listar();
    } catch (err: any) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[FincaService] Conexión a BD no disponible al listar (${err.message || err}). Usando catálogo demo.`);
    }
    return fallbackFincas;
};

/**
 * Busca una finca por su identificador.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => {
    try {
        return await fincaDao.buscarPorId(id);
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[FincaService] Conexión a BD no disponible al buscar finca ${id}.`);
    }
    return fallbackFincas.find(f => f.IdFinca === id) || null;
};

/**
 * Fincas que pertenecen a un propietario (panel del dueño de finca).
 */
export const getFincasDePropietario = async (numeroDocumento: number): Promise<Finca[]> => {
    return await fincaDao.listarPorPropietario(numeroDocumento);
};

export const ESTADOS_FINCA = ['Disponible', 'No disponible'];

const validarEstado = (estado: unknown): string => {
    const valido = ESTADOS_FINCA.find((e) => e.toLowerCase() === String(estado ?? '').trim().toLowerCase());
    if (!valido) throw new AppError(`Estado debe ser uno de: ${ESTADOS_FINCA.join(', ')}`, 400);
    return valido;
};

/**
 * Crea una nueva finca validando datos requeridos.
 */
export const crearFinca = async (dto: CrearFincaDto): Promise<{ id: number; finca: Finca | null }> => {
    if (!dto.NombreFinca || !dto.Direccion || dto.IdMunicipio === undefined || dto.NumeroDocumentoUsuario === undefined) {
        throw new AppError('Los campos NombreFinca, Direccion, IdMunicipio y NumeroDocumentoUsuario son obligatorios', 400);
    }
    if (!(Number(dto.Precio) > 0)) throw new AppError('El precio por noche debe ser mayor a 0', 400);
    if (!(Number(dto.Capacidad) >= 1)) throw new AppError('La capacidad debe ser de al menos 1 huésped', 400);

    const finca: Finca = {
        IdMunicipio: Number(dto.IdMunicipio),
        NumeroDocumentoUsuario: Number(dto.NumeroDocumentoUsuario),
        NombreFinca: dto.NombreFinca.trim(),
        Direccion: dto.Direccion.trim(),
        InformacionAdicional: dto.InformacionAdicional?.trim() || '',
        Capacidad: Number(dto.Capacidad) || 0,
        Precio: Number(dto.Precio) || 0,
        Estado: dto.Estado ? validarEstado(dto.Estado) : 'Disponible',
        Calificacion: Number(dto.Calificacion) || 5,
        ...normalizarFicha(dto)
    };

    let id = Date.now() % 1000000;
    let fincaCreada: Finca | null = null;

    try {
        id = await fincaDao.insertar(finca);
        fincaCreada = await fincaDao.buscarPorId(id);
        if (fincaCreada) fallbackFincas.push(fincaCreada);
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[FincaService] Conexión a BD no disponible al insertar finca. Guardando en memoria.`);
        fincaCreada = { ...finca, IdFinca: id };
        fallbackFincas.push(fincaCreada);
    }

    return {
        id,
        finca: fincaCreada || { ...finca, IdFinca: id }
    };
};

/**
 * Actualiza una finca existente.
 */
export const actualizarFinca = async (id: number, dto: ActualizarFincaDto): Promise<Finca | null> => {
    let existente = await buscarPorId(id);
    if (!existente) {
        throw new AppError(`Finca con ID ${id} no encontrada`, 404);
    }

    const fincaParaActualizar: Finca = {
        IdFinca: id,
        IdMunicipio: dto.IdMunicipio !== undefined ? Number(dto.IdMunicipio) : existente.IdMunicipio,
        NumeroDocumentoUsuario: dto.NumeroDocumentoUsuario !== undefined ? Number(dto.NumeroDocumentoUsuario) : existente.NumeroDocumentoUsuario,
        NombreFinca: dto.NombreFinca !== undefined ? dto.NombreFinca.trim() : existente.NombreFinca,
        Direccion: dto.Direccion !== undefined ? dto.Direccion.trim() : existente.Direccion,
        InformacionAdicional: dto.InformacionAdicional !== undefined ? dto.InformacionAdicional.trim() : existente.InformacionAdicional,
        Capacidad: dto.Capacidad !== undefined ? Number(dto.Capacidad) : existente.Capacidad,
        Precio: dto.Precio !== undefined ? Number(dto.Precio) : existente.Precio,
        // Un estado heredado que no se toca se respeta; uno nuevo debe ser válido
        Estado: dto.Estado !== undefined && dto.Estado !== existente.Estado ? validarEstado(dto.Estado) : existente.Estado,
        Calificacion: dto.Calificacion !== undefined ? Number(dto.Calificacion) : existente.Calificacion,
        ...normalizarFicha(dto)
    };

    try {
        await fincaDao.actualizar(fincaParaActualizar);
        const actualizado = await fincaDao.buscarPorId(id);
        if (actualizado) return actualizado;
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[FincaService] Conexión a BD no disponible al actualizar finca ${id}.`);
    }

    const idx = fallbackFincas.findIndex(f => f.IdFinca === id);
    if (idx !== -1) {
        fallbackFincas[idx] = { ...existente, ...fincaParaActualizar };
        return fallbackFincas[idx];
    }

    return fincaParaActualizar;
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await buscarPorId(id);
    if (!existente) {
        throw new AppError(`Finca con ID ${id} no encontrada`, 404);
    }
    try {
        // Rutas de los archivos antes de borrar: las filas de Imagen caen en cascada con la finca
        const rutas = (await imagenDao.buscarPorIdFinca(id)).map((i) => i.RutaStorage).filter((r): r is string => Boolean(r));
        await fincaDao.eliminarPorId(id);
        await storage.borrarImagenes(rutas).catch((e) => console.error('[FincaService] No se pudieron borrar las imágenes de Storage:', e));
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        console.warn(`[FincaService] Conexión a BD no disponible al eliminar finca.`);
    }
    const idx = fallbackFincas.findIndex(f => f.IdFinca === id);
    if (idx !== -1) {
        fallbackFincas.splice(idx, 1);
    }
};

// Reportes con respaldo seguro
export const getFincasMasReservadas = async (): Promise<FincaReservada[]> => {
    try {
        return await fincaDao.fincasMasReservadas();
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        return fallbackFincas.map(f => ({ NombreFinca: f.NombreFinca || '', CantidadReservas: Math.floor(Math.random() * 20) + 5 }));
    }
};

export const getPromedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    try {
        return await fincaDao.promedioCalificacionFincas();
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        return fallbackFincas.map(f => ({ NombreFinca: f.NombreFinca || '', PromedioCalificacion: f.Calificacion || 5 }));
    }
};

export const getTotalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    try {
        return await fincaDao.totalIngresosPorFinca();
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        return fallbackFincas.map(f => ({ NombreFinca: f.NombreFinca || '', TotalIngresos: (f.Precio || 500000) * 8 }));
    }
};

export const getFincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    try {
        return await fincaDao.fincasConMasIngresos();
    } catch (err) {
        if (!esErrorDeConexion(err)) throw err;
        return fallbackFincas.slice(0, 3).map(f => ({ NombreFinca: f.NombreFinca || '', IngresosTotales: (f.Precio || 500000) * 12 }));
    }
};

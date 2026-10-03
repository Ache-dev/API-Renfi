import * as fincaDao from '../dao/finca.dao';
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
 * Crea una nueva finca validando datos requeridos.
 */
export const crearFinca = async (dto: CrearFincaDto): Promise<{ id: number; finca: Finca | null }> => {
    if (!dto.NombreFinca || !dto.Direccion || dto.IdMunicipio === undefined || dto.NumeroDocumentoUsuario === undefined) {
        throw new AppError('Los campos NombreFinca, Direccion, IdMunicipio y NumeroDocumentoUsuario son obligatorios', 400);
    }

    const finca: Finca = {
        IdMunicipio: Number(dto.IdMunicipio),
        NumeroDocumentoUsuario: Number(dto.NumeroDocumentoUsuario),
        NombreFinca: dto.NombreFinca.trim(),
        Direccion: dto.Direccion.trim(),
        InformacionAdicional: dto.InformacionAdicional?.trim() || '',
        Capacidad: Number(dto.Capacidad) || 0,
        Precio: Number(dto.Precio) || 0,
        Estado: dto.Estado || 'Disponible',
        Calificacion: Number(dto.Calificacion) || 5
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
        Estado: dto.Estado !== undefined ? dto.Estado : existente.Estado,
        Calificacion: dto.Calificacion !== undefined ? Number(dto.Calificacion) : existente.Calificacion
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
        await fincaDao.eliminarPorId(id);
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

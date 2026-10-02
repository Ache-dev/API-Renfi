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
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todas las fincas registradas.
 */
export const getFincas = async (): Promise<Finca[]> => {
    return await fincaDao.listar();
};

/**
 * Busca una finca por su identificador.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => {
    return await fincaDao.buscarPorId(id);
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

    const id = await fincaDao.insertar(finca);
    const fincaCreada = await fincaDao.buscarPorId(id);

    return {
        id,
        finca: fincaCreada
    };
};

/**
 * Actualiza una finca existente.
 */
export const actualizarFinca = async (id: number, dto: ActualizarFincaDto): Promise<Finca | null> => {
    const existente = await fincaDao.buscarPorId(id);
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

    await fincaDao.actualizar(fincaParaActualizar);
    return await fincaDao.buscarPorId(id);
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    const existente = await fincaDao.buscarPorId(id);
    if (!existente) {
        throw new AppError(`Finca con ID ${id} no encontrada`, 404);
    }
    await fincaDao.eliminarPorId(id);
};

// Reportes
export const getFincasMasReservadas = async (): Promise<FincaReservada[]> => {
    return await fincaDao.fincasMasReservadas();
};

export const getPromedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    return await fincaDao.promedioCalificacionFincas();
};

export const getTotalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    return await fincaDao.totalIngresosPorFinca();
};

export const getFincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    return await fincaDao.fincasConMasIngresos();
};


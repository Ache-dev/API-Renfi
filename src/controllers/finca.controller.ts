import * as fincaDao from '../dao/finca.dao';
import { Finca } from '../models/finca';
import {
    fincasMasReservadas,
    promedioCalificacionFincas,
    totalIngresosPorFinca,
    fincasConMasIngresos,
    FincaReservada,
    FincaPromedioCalificacion,
    FincaIngresos,
    FincaIngresosTop
} from '../dao/finca.dao';

export const getFincas = async (): Promise<Finca[]> => {
    try {
        return await fincaDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearFinca = async (finca: Finca): Promise<void> => {
    try {
        if (!finca.IdMunicipio || !finca.NumeroDocumentoUsuario || !finca.NombreFinca) {
            throw new Error('Faltan campos requeridos para crear finca');
        }
        await fincaDao.insertar(finca);
    } catch (error) {
        throw error;
    }
};

export const actualizarFinca = async (finca: Finca): Promise<void> => {
    try {
        if (!finca.IdFinca) {
            throw new Error('IdFinca es requerido para actualizar');
        }
        await fincaDao.actualizar(finca);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await fincaDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Finca | null> => {
    try {
        return await fincaDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};

// Reportes y estadísticas
export const getFincasMasReservadas = async (): Promise<FincaReservada[]> => {
    try {
        return await fincasMasReservadas();
    } catch (error) {
        throw error;
    }
};

export const getPromedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    try {
        return await promedioCalificacionFincas();
    } catch (error) {
        throw error;
    }
};

export const getTotalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    try {
        return await totalIngresosPorFinca();
    } catch (error) {
        throw error;
    }
};

export const getFincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    try {
        return await fincasConMasIngresos();
    } catch (error) {
        throw error;
    }
};
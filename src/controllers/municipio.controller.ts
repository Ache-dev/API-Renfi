import { Request, Response, NextFunction } from 'express';
import * as municipioService from '../services/municipio.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todos los municipios.
 */
export const getMunicipios = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const municipios = await municipioService.getMunicipios();
        res.status(200).json(municipios);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca un municipio por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const municipio = await municipioService.buscarPorId(id);

        if (!municipio) {
            throw new AppError(`Municipio con ID ${id} no encontrado`, 404);
        }

        res.status(200).json(municipio);
    } catch (error) {
        next(error);
    }
};

/**
 * Crea un nuevo municipio.
 */
export const crearMunicipio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await municipioService.crearMunicipio(req.body);
        res.status(201).json({
            message: 'Municipio creado correctamente',
            id: resultado.id,
            IdMunicipio: resultado.IdMunicipio,
            municipio: resultado.municipio
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza un municipio existente.
 */
export const actualizarMunicipio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizado = await municipioService.actualizarMunicipio(id, req.body);
        res.status(200).json({
            message: 'Municipio actualizado correctamente',
            municipio: actualizado
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina un municipio por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await municipioService.eliminarPorId(id);
        res.status(200).json({
            message: 'Municipio eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reporte: Municipios con más reservas.
 */
export const getMunicipiosConMasReservas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await municipioService.getMunicipiosConMasReservas();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};
};
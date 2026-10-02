import { Request, Response, NextFunction } from 'express';
import * as imagenService from '../services/imagen.service';
import { AppError } from '../middlewares/error.middleware';

/**
 * Obtiene todas las imágenes.
 */
export const getImagenes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const imagenes = await imagenService.getImagenes();
        res.status(200).json(imagenes);
    } catch (error) {
        next(error);
    }
};

/**
 * Obtiene todas las imágenes de una finca específica.
 */
export const getImagenesPorIdFinca = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const idFinca = Number(req.params.id);
        if (!Number.isInteger(idFinca) || idFinca <= 0) {
            throw new AppError('IdFinca inválido', 400);
        }

        const imagenes = await imagenService.getImagenesPorIdFinca(idFinca);
        res.status(200).json(imagenes);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca una imagen por su ID.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const imagen = await imagenService.buscarPorId(id);

        if (!imagen) {
            throw new AppError(`Imagen con ID ${id} no encontrada`, 404);
        }

        res.status(200).json(imagen);
    } catch (error) {
        next(error);
    }
};

/**
 * Crea una nueva imagen.
 */
export const crearImagen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resultado = await imagenService.crearImagen(req.body);
        res.status(201).json({
            message: 'Imagen creada correctamente',
            id: resultado.id,
            IdImagen: resultado.IdImagen,
            imagen: resultado.imagen
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza una imagen existente.
 */
export const actualizarImagen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const actualizada = await imagenService.actualizarImagen(id, req.body);
        res.status(200).json({
            message: 'Imagen actualizada correctamente',
            imagen: actualizada
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina una imagen por su ID.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await imagenService.eliminarPorId(id);
        res.status(200).json({
            message: 'Imagen eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};
};
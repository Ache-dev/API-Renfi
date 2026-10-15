import { Request, Response, NextFunction } from 'express';
import * as fincaService from '../services/finca.service';
import { AppError } from '../middlewares/error.middleware';
import { esAdmin } from '../middlewares/auth.middleware';

/**
 * Fincas del dueño autenticado.
 */
export const getMisFincas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        res.status(200).json(await fincaService.getFincasDePropietario(Number(req.user?.NumeroDocumento)));
    } catch (error) {
        next(error);
    }
};

/**
 * Obtiene el listado de todas las fincas.
 */
export const getFincas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const fincas = await fincaService.getFincas();
        res.status(200).json(fincas);
    } catch (error) {
        next(error);
    }
};

/**
 * Busca una finca por su identificador.
 */
export const buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const finca = await fincaService.buscarPorId(id);

        if (!finca) {
            throw new AppError(`Finca con ID ${id} no encontrada`, 404);
        }

        res.status(200).json(finca);
    } catch (error) {
        next(error);
    }
};

/**
 * Crea una nueva finca.
 */
export const crearFinca = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Un dueño solo publica fincas a su nombre y no se asigna calificación
        const dto = esAdmin(req.user)
            ? req.body
            : { ...req.body, NumeroDocumentoUsuario: req.user?.NumeroDocumento, Calificacion: undefined };
        const resultado = await fincaService.crearFinca(dto);
        res.status(201).json({
            message: 'Finca creada correctamente',
            id: resultado.id,
            IdFinca: resultado.id,
            finca: resultado.finca
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza los datos de una finca existente.
 */
export const actualizarFinca = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        // Un dueño no traspasa la finca a otra persona ni cambia la calificación
        const { NumeroDocumentoUsuario: _dueno, Calificacion: _calificacion, ...permitido } = req.body ?? {};
        const actualizada = await fincaService.actualizarFinca(id, esAdmin(req.user) ? req.body : permitido);
        res.status(200).json({
            message: 'Finca actualizada correctamente',
            finca: actualizada
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await fincaService.eliminarPorId(id);
        res.status(200).json({
            message: 'Finca eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};

// Reportes
export const getFincasMasReservadas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await fincaService.getFincasMasReservadas();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getPromedioCalificacionFincas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await fincaService.getPromedioCalificacionFincas();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getTotalIngresosPorFinca = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await fincaService.getTotalIngresosPorFinca();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getFincasConMasIngresos = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await fincaService.getFincasConMasIngresos();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

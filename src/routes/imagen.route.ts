import { Router } from 'express';
import * as imagenController from '../controllers/imagen.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

// Consulta de imágenes por finca (usado intensamente por el catálogo y detalles)
router.get('/finca/:id', validarId, imagenController.getImagenesPorIdFinca);

// CRUD
router.get('/', imagenController.getImagenes);
router.post('/', imagenController.crearImagen);

// Compatibilidad con DELETE por query param: /api/imagen/delete?id=3
router.delete('/delete', validarId, imagenController.eliminarPorId);

router.get('/:id', validarId, imagenController.buscarPorId);
router.put('/:id', validarId, imagenController.actualizarImagen);
router.delete('/:id', validarId, imagenController.eliminarPorId);

export default router;

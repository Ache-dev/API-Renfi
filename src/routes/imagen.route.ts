import { Router } from 'express';
import * as imagenController from '../controllers/imagen.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Lectura pública; editar y borrar solo administrador. Las imágenes se suben por POST /api/finca/:id/imagenes
router.get('/finca/:id', validarId, imagenController.getImagenesPorIdFinca);

router.get('/', imagenController.getImagenes);

router.delete('/delete', ...soloAdmin, validarId, imagenController.eliminarPorId);

router.get('/:id', validarId, imagenController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, imagenController.actualizarImagen);
router.delete('/:id', ...soloAdmin, validarId, imagenController.eliminarPorId);

export default router;

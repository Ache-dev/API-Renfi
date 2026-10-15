import { Router } from 'express';
import * as imagenController from '../controllers/imagen.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Lectura pública; escritura solo administrador
router.get('/finca/:id', validarId, imagenController.getImagenesPorIdFinca);

router.get('/', imagenController.getImagenes);
router.post('/', ...soloAdmin, imagenController.crearImagen);

router.delete('/delete', ...soloAdmin, validarId, imagenController.eliminarPorId);

router.get('/:id', validarId, imagenController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, imagenController.actualizarImagen);
router.delete('/:id', ...soloAdmin, validarId, imagenController.eliminarPorId);

export default router;

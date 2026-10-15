import { Router } from 'express';
import * as rolController from '../controllers/rol.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Los roles solo los gestiona el administrador
router.get('/', ...soloAdmin, rolController.getRoles);
router.post('/', ...soloAdmin, rolController.crearRol);

router.delete('/delete', ...soloAdmin, validarId, rolController.eliminarPorId);

router.get('/:id', ...soloAdmin, validarId, rolController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, rolController.actualizarRol);
router.delete('/:id', ...soloAdmin, validarId, rolController.eliminarPorId);

export default router;

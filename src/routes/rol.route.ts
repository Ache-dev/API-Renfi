import { Router } from 'express';
import * as rolController from '../controllers/rol.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

router.get('/', rolController.getRoles);
router.post('/', rolController.crearRol);

// Compatibilidad con DELETE por query param: /api/rol/delete?id=3
router.delete('/delete', validarId, rolController.eliminarPorId);

router.get('/:id', validarId, rolController.buscarPorId);
router.put('/:id', validarId, rolController.actualizarRol);
router.delete('/:id', validarId, rolController.eliminarPorId);

export default router;


import { Router } from 'express';
import * as metodoController from '../controllers/metododepago.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

router.get('/', metodoController.getMetodos);
router.post('/', metodoController.crearMetodo);

// Compatibilidad con DELETE por query param: /api/metododepago/delete?id=3
router.delete('/delete', validarId, metodoController.eliminarPorId);

router.get('/:id', validarId, metodoController.buscarPorId);
router.put('/:id', validarId, metodoController.actualizarMetodo);
router.delete('/:id', validarId, metodoController.eliminarPorId);

export default router;
export default router;
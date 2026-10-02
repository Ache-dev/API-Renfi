import { Router } from 'express';
import * as facturaController from '../controllers/factura.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

router.get('/', facturaController.getFacturas);
router.post('/', facturaController.crearFactura);

// Compatibilidad con DELETE por query param: /api/factura/delete?id=3
router.delete('/delete', validarId, facturaController.eliminarPorId);

router.get('/:id', validarId, facturaController.buscarPorId);
router.put('/:id', validarId, facturaController.actualizarFactura);
router.delete('/:id', validarId, facturaController.eliminarPorId);

export default router;


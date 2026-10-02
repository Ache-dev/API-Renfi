import { Router } from 'express';
import * as pagoController from '../controllers/pago.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

// Endpoint de reporte (debe ir antes de /:id)
router.get('/report/pendientes', pagoController.getPagosPendientes);

// CRUD
router.get('/', pagoController.getPagos);
router.post('/', pagoController.crearPago);

// Compatibilidad con DELETE por query param: /api/pago/delete?id=3
router.delete('/delete', validarId, pagoController.eliminarPorId);

router.get('/:id', validarId, pagoController.buscarPorId);
router.put('/:id', validarId, pagoController.actualizarPago);
router.delete('/:id', validarId, pagoController.eliminarPorId);

export default router;
export default router;
import { Router } from 'express';
import * as pagoController from '../controllers/pago.controller';
import * as pagoDao from '../dao/pago.dao';
import { validarId } from '../middlewares/validate-id.middleware';
import { autenticarJwt, soloAdmin, adminODueno, duenoOAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/report/pendientes', ...soloAdmin, pagoController.getPagosPendientes);

router.get('/', ...soloAdmin, pagoController.getPagos);
// Pagos recibidos por las fincas del dueño autenticado
router.get('/mis-fincas', ...adminODueno, pagoController.getMisPagos);
// Un cliente solo puede pagar sus propias facturas (lo verifica el servicio)
router.post('/', autenticarJwt, pagoController.crearPago);

router.delete('/delete', ...soloAdmin, validarId, pagoController.eliminarPorId);

router.get('/:id', validarId, ...duenoOAdmin(async (id) => (await pagoDao.buscarPorId(id))?.NumeroDocumentoCliente ?? null), pagoController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, pagoController.actualizarPago);
router.delete('/:id', ...soloAdmin, validarId, pagoController.eliminarPorId);

export default router;

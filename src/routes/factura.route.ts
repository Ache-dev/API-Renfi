import { Router } from 'express';
import * as facturaController from '../controllers/factura.controller';
import * as facturaDao from '../dao/factura.dao';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin, duenoOAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Las facturas las crea la API junto con la reserva; el listado completo y la edición son del administrador
router.get('/', ...soloAdmin, facturaController.getFacturas);
router.post('/', ...soloAdmin, facturaController.crearFactura);

router.delete('/delete', ...soloAdmin, validarId, facturaController.eliminarPorId);

router.get('/:id', validarId, ...duenoOAdmin(async (id) => (await facturaDao.buscarPorId(id))?.NumeroDocumentoCliente ?? null), facturaController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, facturaController.actualizarFactura);
router.delete('/:id', ...soloAdmin, validarId, facturaController.eliminarPorId);

export default router;

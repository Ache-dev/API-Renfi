import { Router } from 'express';
import * as metodoController from '../controllers/metododepago.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { autenticarJwt, soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Lectura con sesión iniciada; escritura solo administrador
router.get('/', autenticarJwt, metodoController.getMetodos);
router.post('/', ...soloAdmin, metodoController.crearMetodo);

router.delete('/delete', ...soloAdmin, validarId, metodoController.eliminarPorId);

router.get('/:id', autenticarJwt, validarId, metodoController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, metodoController.actualizarMetodo);
router.delete('/:id', ...soloAdmin, validarId, metodoController.eliminarPorId);

export default router;

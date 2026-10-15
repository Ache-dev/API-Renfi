import { Router } from 'express';
import * as fincaController from '../controllers/finca.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Reportes (administrador)
router.get('/report/mas-reservadas', ...soloAdmin, fincaController.getFincasMasReservadas);
router.get('/report/promedio-calificacion', ...soloAdmin, fincaController.getPromedioCalificacionFincas);
router.get('/report/total-ingresos', ...soloAdmin, fincaController.getTotalIngresosPorFinca);
router.get('/report/mas-ingresos', ...soloAdmin, fincaController.getFincasConMasIngresos);

// Catálogo público; escritura solo administrador
router.get('/', fincaController.getFincas);
router.post('/', ...soloAdmin, fincaController.crearFinca);

router.delete('/delete', ...soloAdmin, validarId, fincaController.eliminarPorId);

router.get('/:id', validarId, fincaController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, fincaController.actualizarFinca);
router.delete('/:id', ...soloAdmin, validarId, fincaController.eliminarPorId);

export default router;

import { Router } from 'express';
import * as fincaController from '../controllers/finca.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

// Endpoints de reportes y estadísticas (deben declararse antes de /:id)
router.get('/report/mas-reservadas', fincaController.getFincasMasReservadas);
router.get('/report/promedio-calificacion', fincaController.getPromedioCalificacionFincas);
router.get('/report/total-ingresos', fincaController.getTotalIngresosPorFinca);
router.get('/report/mas-ingresos', fincaController.getFincasConMasIngresos);

// CRUD de Fincas
router.get('/', fincaController.getFincas);
router.post('/', fincaController.crearFinca);

// Compatibilidad con DELETE por query param: /api/finca/delete?id=3
router.delete('/delete', validarId, fincaController.eliminarPorId);

router.get('/:id', validarId, fincaController.buscarPorId);
router.put('/:id', validarId, fincaController.actualizarFinca);
router.delete('/:id', validarId, fincaController.eliminarPorId);

export default router;

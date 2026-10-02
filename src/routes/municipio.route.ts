import { Router } from 'express';
import * as municipioController from '../controllers/municipio.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

// Endpoint de reporte (debe ir antes de /:id)
router.get('/report/mas-reservas', municipioController.getMunicipiosConMasReservas);

// CRUD
router.get('/', municipioController.getMunicipios);
router.post('/', municipioController.crearMunicipio);

// Compatibilidad con DELETE por query param: /api/municipio/delete?id=3
router.delete('/delete', validarId, municipioController.eliminarPorId);

router.get('/:id', validarId, municipioController.buscarPorId);
router.put('/:id', validarId, municipioController.actualizarMunicipio);
router.delete('/:id', validarId, municipioController.eliminarPorId);

export default router;
export default router;
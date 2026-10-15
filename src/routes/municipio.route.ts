import { Router } from 'express';
import * as municipioController from '../controllers/municipio.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/report/mas-reservas', ...soloAdmin, municipioController.getMunicipiosConMasReservas);

// Lectura pública; escritura solo administrador
router.get('/', municipioController.getMunicipios);
router.post('/', ...soloAdmin, municipioController.crearMunicipio);

router.delete('/delete', ...soloAdmin, validarId, municipioController.eliminarPorId);

router.get('/:id', validarId, municipioController.buscarPorId);
router.put('/:id', ...soloAdmin, validarId, municipioController.actualizarMunicipio);
router.delete('/:id', ...soloAdmin, validarId, municipioController.eliminarPorId);

export default router;

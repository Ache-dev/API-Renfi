import { Router } from 'express';
import * as fincaController from '../controllers/finca.controller';
import * as fincaDao from '../dao/finca.dao';
import { validarId } from '../middlewares/validate-id.middleware';
import * as imagenController from '../controllers/imagen.controller';
import { soloAdmin, adminODueno, duenoOAdmin } from '../middlewares/auth.middleware';
import { recibirImagen } from '../middlewares/upload.middleware';

const router = Router();

// Administrador o dueño de la finca; si no existe responde 404
const duenoDeFinca = duenoOAdmin((id) => fincaDao.propietarioDe(id));

// Reportes (administrador)
router.get('/report/mas-reservadas', ...soloAdmin, fincaController.getFincasMasReservadas);
router.get('/report/promedio-calificacion', ...soloAdmin, fincaController.getPromedioCalificacionFincas);
router.get('/report/total-ingresos', ...soloAdmin, fincaController.getTotalIngresosPorFinca);
router.get('/report/mas-ingresos', ...soloAdmin, fincaController.getFincasConMasIngresos);

// Fincas del dueño autenticado (panel "Mis fincas")
router.get('/mias', ...adminODueno, fincaController.getMisFincas);

// Catálogo público; publicar es del dueño de finca o del administrador
router.get('/', fincaController.getFincas);
router.post('/', ...adminODueno, fincaController.crearFinca);

router.delete('/delete', ...soloAdmin, validarId, fincaController.eliminarPorId);

router.get('/:id', validarId, fincaController.buscarPorId);
// Galería: se suben archivos (multipart, campo "imagen") y se alojan en Supabase Storage
router.post('/:id/imagenes', validarId, ...duenoDeFinca, recibirImagen, imagenController.subirImagenFinca);

// Editar y eliminar: el administrador o el dueño de esa finca
router.put('/:id', validarId, ...duenoDeFinca, fincaController.actualizarFinca);
router.delete('/:id', validarId, ...duenoDeFinca, fincaController.eliminarPorId);

export default router;

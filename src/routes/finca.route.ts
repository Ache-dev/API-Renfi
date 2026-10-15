import { Router } from 'express';
import * as fincaController from '../controllers/finca.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import * as imagenController from '../controllers/imagen.controller';
import { soloAdmin } from '../middlewares/auth.middleware';
import { recibirImagen } from '../middlewares/upload.middleware';

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
// Galería: el administrador sube archivos (multipart, campo "imagen"); se alojan en Supabase Storage
router.post('/:id/imagenes', ...soloAdmin, validarId, recibirImagen, imagenController.subirImagenFinca);

router.put('/:id', ...soloAdmin, validarId, fincaController.actualizarFinca);
router.delete('/:id', ...soloAdmin, validarId, fincaController.eliminarPorId);

export default router;

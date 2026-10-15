import { Router } from 'express';
import * as imagenController from '../controllers/imagen.controller';
import * as imagenDao from '../dao/imagen.dao';
import { validarId } from '../middlewares/validate-id.middleware';
import { soloAdmin, duenoOAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Administrador o dueño de la finca a la que pertenece la imagen
const duenoDeImagen = duenoOAdmin((id) => imagenDao.propietarioDe(id));

// Lectura pública; editar y borrar: administrador o dueño de la finca. Las imágenes se suben por POST /api/finca/:id/imagenes
router.get('/finca/:id', validarId, imagenController.getImagenesPorIdFinca);

router.get('/', imagenController.getImagenes);

router.delete('/delete', ...soloAdmin, validarId, imagenController.eliminarPorId);

router.get('/:id', validarId, imagenController.buscarPorId);
router.put('/:id', validarId, ...duenoDeImagen, imagenController.actualizarImagen);
router.delete('/:id', validarId, ...duenoDeImagen, imagenController.eliminarPorId);

export default router;

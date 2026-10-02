import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

// Autenticación
router.post('/login', usuarioController.login);
router.post('/iniciar-sesion', usuarioController.login);

// CRUD de Usuarios
router.get('/', usuarioController.getUsuarios);
router.post('/', usuarioController.crearUsuario);

// Ruta para compatibilidad con query param: DELETE /api/usuario/delete?id=123
router.delete('/delete', validarId, usuarioController.eliminarPorId);

router.get('/:id', validarId, usuarioController.buscarPorId);
router.put('/:id', validarId, usuarioController.actualizarUsuario);
router.delete('/:id', validarId, usuarioController.eliminarPorId);

export default router;


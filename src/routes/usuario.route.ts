import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';
import { validarId } from '../middlewares/validate-id.middleware';
import { autenticarOpcional, soloAdmin, propioOAdmin } from '../middlewares/auth.middleware';
import { limitarIntentos } from '../middlewares/rate-limit.middleware';

const router = Router();

// Autenticación (pública, con límite de intentos contra fuerza bruta)
const limite = limitarIntentos(10, 15 * 60 * 1000);
router.post('/login', limite, usuarioController.login);
router.post('/iniciar-sesion', limite, usuarioController.login);

// Registro público (siempre crea un Cliente); un administrador autenticado puede elegir rol y estado
router.post('/', limite, autenticarOpcional, usuarioController.crearUsuario);

router.get('/', ...soloAdmin, usuarioController.getUsuarios);

// Ruta para compatibilidad con query param: DELETE /api/usuario/delete?id=123
router.delete('/delete', ...soloAdmin, validarId, usuarioController.eliminarPorId);

router.get('/:id', validarId, ...propioOAdmin('id'), usuarioController.buscarPorId);
router.put('/:id', validarId, ...propioOAdmin('id'), usuarioController.actualizarUsuario);
router.delete('/:id', ...soloAdmin, validarId, usuarioController.eliminarPorId);

export default router;

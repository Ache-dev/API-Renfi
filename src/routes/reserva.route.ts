import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';
import { validarId } from '../middlewares/validate-id.middleware';

const router = Router();

// Consultas
router.get('/', reservaController.listar);
router.get('/usuario/:numeroDocumento', reservaController.listarPorUsuario);

// Inserción
router.post('/', reservaController.crear);

// Compatibilidad con DELETE por query param: /api/reserva/delete?id=3
router.delete('/delete', validarId, reservaController.eliminar);

// Operaciones por ID
router.get('/:id', validarId, reservaController.buscarPorId);
router.put('/:id', validarId, reservaController.actualizar);
router.delete('/:id', validarId, reservaController.eliminar);

export default router;

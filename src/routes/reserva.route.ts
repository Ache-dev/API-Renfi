import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';

const router = Router();

// Listar reservas
router.get('/', reservaController.listar);

// Compatibilidad con DELETE /delete?id=3 (debe ir antes de '/:id')
router.delete('/delete', (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'Id inválido' });
    }
    (req as any).params = { id: String(id) };
    return reservaController.eliminar(req as any, res);
});

// Obtener por id
router.get('/:id', reservaController.buscarPorId);

// Crear reserva
router.post('/', reservaController.crear);

// Actualizar reserva
router.put('/:id', reservaController.actualizar);

// Eliminar/cancelar reserva
router.delete('/:id', reservaController.eliminar);

export default router;
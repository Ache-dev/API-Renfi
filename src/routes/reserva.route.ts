import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';

const router = Router();

router.get('/', reservaController.listar);

router.get('/usuario/:numeroDocumento', reservaController.listarPorUsuario);

router.delete('/delete', (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: 'Id inválido' });
    }
    (req as any).params = { id: String(id) };
    return reservaController.eliminar(req as any, res);
});

router.get('/:id', reservaController.buscarPorId);

router.post('/', reservaController.crear);

router.put('/:id', reservaController.actualizar);

router.delete('/:id', reservaController.eliminar);

export default router;
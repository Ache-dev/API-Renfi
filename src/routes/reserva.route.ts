import * as reservaController from '../controllers/reserva.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const reservas = await reservaController.getReservas();
        res.json(reservas);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener reservas');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const reserva = await reservaController.buscarPorId(id);
        if (reserva) {
            res.json(reserva);
        } else {
            res.status(404).send('Reserva no encontrada');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar reserva');
    }
});

router.post('/', async (req, res) => {
    try {
        await reservaController.crearReserva(req.body);
        res.status(201).json({ message: 'Reserva creada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear reserva');
    }
});

// Ahora acepta DELETE /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await reservaController.eliminarPorId(id);
        res.json({ message: 'Reserva eliminada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar reserva');
    }
});

export default router;
import * as metodoController from '../controllers/metododepago.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const metodos = await metodoController.getMetodos();
        res.json(metodos);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener métodos de pago');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const metodo = await metodoController.buscarPorId(id);
        if (metodo) {
            res.json(metodo);
        } else {
            res.status(404).send('Método de pago no encontrado');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar método de pago');
    }
});

router.post('/', async (req, res) => {
    try {
        await metodoController.crearMetodo(req.body);
        res.status(201).json({ message: 'Método de pago creado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear método de pago');
    }
});

// Ahora acepta DELETE /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await metodoController.eliminarPorId(id);
        res.json({ message: 'Método de pago eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar método de pago');
    }
});

export default router;
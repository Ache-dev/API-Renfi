import * as fincaController from '../controllers/finca.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const fincas = await fincaController.getFincas();
        res.json(fincas);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener fincas');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const finca = await fincaController.buscarPorId(id);
        if (finca) {
            res.json(finca);
        } else {
            res.status(404).send('Finca no encontrada');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar finca');
    }
});

router.post('/', async (req, res) => {
    try {
        await fincaController.crearFinca(req.body);
        res.status(201).json({ message: 'Finca creada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear finca');
    }
});

// Ahora acepta DELETE /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await fincaController.eliminarPorId(id);
        res.json({ message: 'Finca eliminada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar finca');
    }
});

export default router;
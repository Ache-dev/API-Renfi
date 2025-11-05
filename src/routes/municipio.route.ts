import * as municipioController from '../controllers/municipio.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const municipios = await municipioController.getMunicipios();
        res.json(municipios);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener municipios');
    }
});

// Endpoint de reporte: municipios con más reservas
router.get('/report/mas-reservas', async (_, res) => {
    try {
        const data = await municipioController.getMunicipiosConMasReservas();
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener municipios con más reservas');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const municipio = await municipioController.buscarPorId(id);
        if (municipio) {
            res.json(municipio);
        } else {
            res.status(404).send('Municipio no encontrado');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar municipio');
    }
});

router.post('/', async (req, res) => {
    try {
        await municipioController.crearMunicipio(req.body);
        res.status(201).json({ message: 'Municipio creado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear municipio');
    }
});

// Ahora acepta DELETE /delete?id=3
// DELETE por id en path
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await municipioController.eliminarPorId(id);
        res.json({ message: 'Municipio eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar municipio');
    }
});

// Compatibilidad con antiguo /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await municipioController.eliminarPorId(id);
        res.json({ message: 'Municipio eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar municipio');
    }
});

// Actualizar municipio
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        const municipio = { ...req.body, IdMunicipio: id };
        await municipioController.actualizarMunicipio(municipio as any);
        res.json({ message: 'Municipio actualizado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al actualizar municipio');
    }
});

export default router;
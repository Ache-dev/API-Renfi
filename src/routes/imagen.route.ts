import * as imagenController from '../controllers/imagen.controller';
import express from 'express';

const router = express.Router();

// GET /imagen/finca/:id - Todas las imágenes de una finca
router.get('/finca/:id', async (req, res) => {
    const idFinca = Number(req.params.id);
    if (!Number.isInteger(idFinca)) {
        return res.status(400).send('IdFinca inválido');
    }
    try {
        const imagenes = await require('../controllers/imagen.controller').getImagenesPorIdFinca(idFinca);
        res.json(imagenes);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener imágenes de la finca');
    }
});

router.get('/', async (_, res) => {
    try {
        const imagenes = await imagenController.getImagenes();
        res.json(imagenes);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener imágenes');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const imagen = await imagenController.buscarPorId(id);
        if (imagen) {
            res.json(imagen);
        } else {
            res.status(404).send('Imagen no encontrada');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar imagen');
    }
});

router.post('/', async (req, res) => {
    try {
        await imagenController.crearImagen(req.body);
        res.status(201).json({ message: 'Imagen creada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear imagen');
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
        await imagenController.eliminarPorId(id);
        res.json({ message: 'Imagen eliminada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar imagen');
    }
});

// Compatibilidad con antiguo /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await imagenController.eliminarPorId(id);
        res.json({ message: 'Imagen eliminada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar imagen');
    }
});

// Actualizar imagen
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        const imagen = { ...req.body, IdImagen: id };
        await imagenController.actualizarImagen(imagen as any);
        res.json({ message: 'Imagen actualizada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al actualizar imagen');
    }
});

export default router;
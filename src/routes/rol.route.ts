import * as rolController from '../controllers/rol.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const roles = await rolController.getRoles();
        res.json(roles);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener roles');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const rol = await rolController.buscarPorId(id);
        if (rol) {
            res.json(rol);
        } else {
            res.status(404).send('Rol no encontrado');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar rol');
    }
});

router.post('/', async (req, res) => {
    try {
        await rolController.crearRol(req.body);
        res.status(201).json({ message: 'Rol creado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear rol');
    }
});

// DELETE por id en path
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await rolController.eliminarPorId(id);
        res.json({ message: 'Rol eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar rol');
    }
});

// Compatibilidad con antiguo /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await rolController.eliminarPorId(id);
        res.json({ message: 'Rol eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar rol');
    }
});

// Actualizar rol
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        const rol = { ...req.body, IdRol: id };
        await rolController.actualizarRol(rol as any);
        res.json({ message: 'Rol actualizado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al actualizar rol');
    }
});

export default router;

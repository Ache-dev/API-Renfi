import * as usuarioController from '../controllers/usuario.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const usuarios = await usuarioController.getUsuarios();
        res.json(usuarios);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener usuarios');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const usuario = await usuarioController.buscarPorId(id);
        if (usuario) {
            res.json(usuario);
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar usuario');
    }
});

router.post('/', async (req, res) => {
    try {
        await usuarioController.crearUsuario(req.body);
        res.status(201).json({ message: 'Usuario creado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear usuario');
    }
});

// Ahora acepta DELETE /delete?id=3
// DELETE por id en path o por query para compatibilidad
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await usuarioController.eliminarPorId(id);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar usuario');
    }
});

// Mantener compatibilidad con el antiguo endpoint /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await usuarioController.eliminarPorId(id);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar usuario');
    }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        const usuario = { ...req.body, NumeroDocumento: id };
        await usuarioController.actualizarUsuario(usuario);
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al actualizar usuario');
    }
});

export default router;
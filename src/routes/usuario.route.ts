import express from 'express';
import * as usuarioController from '../controllers/usuario.controller';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { correo, contrasena } = req.body;
        
        if (!correo || !contrasena) {
            return res.status(400).json({ 
                message: 'Correo y contraseña son requeridos' 
            });
        }
        
        const usuario = await usuarioController.login(correo, contrasena);
        
        res.json({
            message: 'Login exitoso',
            usuario: usuario
        });
    } catch (e: any) {
        console.error('Error en login:', e);
        res.status(401).json({ 
            message: e.message || 'Credenciales inválidas' 
        });
    }
});

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

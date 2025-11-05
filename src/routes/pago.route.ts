import * as pagoController from '../controllers/pago.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const pagos = await pagoController.getPagos();
        res.json(pagos);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener pagos');
    }
});

// Endpoint de reporte: pagos pendientes
router.get('/report/pendientes', async (_, res) => {
    try {
        const data = await pagoController.getPagosPendientes();
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener pagos pendientes');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const pago = await pagoController.buscarPorId(id);
        if (pago) {
            res.json(pago);
        } else {
            res.status(404).send('Pago no encontrado');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar pago');
    }
});

router.post('/', async (req, res) => {
    try {
        await pagoController.crearPago(req.body);
        res.status(201).json({ message: 'Pago creado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear pago');
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
        await pagoController.eliminarPorId(id);
        res.json({ message: 'Pago eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar pago');
    }
});

// Compatibilidad con antiguo /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await pagoController.eliminarPorId(id);
        res.json({ message: 'Pago eliminado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar pago');
    }
});

// Actualizar pago
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        const pago = { ...req.body, IdPago: id };
        await pagoController.actualizarPago(pago as any);
        res.json({ message: 'Pago actualizado correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al actualizar pago');
    }
});

export default router;
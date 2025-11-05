import * as facturaController from '../controllers/factura.controller';
import express from 'express';

const router = express.Router();

router.get('/', async (_, res) => {
    try {
        const facturas = await facturaController.getFacturas();
        res.json(facturas);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener facturas');
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }
    try {
        const factura = await facturaController.buscarPorId(id);
        if (factura) {
            res.json(factura);
        } else {
            res.status(404).send('Factura no encontrada');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al buscar factura');
    }
});

router.post('/', async (req, res) => {
    try {
        const idFactura = await facturaController.crearFactura(req.body);
        res.status(201).json({ 
            message: 'Factura creada correctamente',
            IdFactura: idFactura,
            id: idFactura
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ 
            message: 'Error al crear factura',
            error: e instanceof Error ? e.message : 'Error desconocido'
        });
    }
});

// DELETE por id en path
router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await facturaController.eliminarPorId(id);
        res.json({ message: 'Factura eliminada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar factura');
    }
});

// Compatibilidad con antiguo /delete?id=3
router.delete('/delete', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        await facturaController.eliminarPorId(id);
        res.json({ message: 'Factura eliminada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar factura');
    }
});

// Actualizar factura
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).send('Id inválido');
    }

    try {
        const factura = { ...req.body, IdFactura: id };
        await facturaController.actualizarFactura(factura as any);
        res.json({ message: 'Factura actualizada correctamente' });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al actualizar factura');
    }
});

export default router;

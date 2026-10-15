import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';
import * as reservaDao from '../dao/reserva.dao';
import { validarId } from '../middlewares/validate-id.middleware';
import { autenticarJwt, soloAdmin, adminODueno, propioOAdmin, duenoOAdmin } from '../middlewares/auth.middleware';

const router = Router();

const duenoDeReserva = async (id: number) => (await reservaDao.buscarPorId(id))?.NumeroDocumentoUsuario ?? null;

// El dueño de la finca gestiona las reservas que recibe (no las de otras fincas)
const duenoDeFincaReservada = duenoOAdmin(async (id) => (await reservaDao.buscarPorId(id))?.IdPropietario ?? null);

router.get('/', ...soloAdmin, reservaController.listar);
router.get('/mis-fincas', ...adminODueno, reservaController.listarMisFincas);
router.get('/usuario/:numeroDocumento', ...propioOAdmin('numeroDocumento'), reservaController.listarPorUsuario);
// Fechas ocupadas para el calendario: público y sin datos personales
router.get('/finca/:id/ocupadas', validarId, reservaController.ocupadasPorFinca);

// Un cliente reserva a su nombre (el controlador fuerza el documento del token)
router.post('/', autenticarJwt, reservaController.crear);

router.delete('/delete', ...soloAdmin, validarId, reservaController.eliminar);

router.put('/:id/estado', validarId, ...duenoDeFincaReservada, reservaController.cambiarEstado);

router.get('/:id', validarId, ...duenoOAdmin(duenoDeReserva), reservaController.buscarPorId);
// Un cliente solo puede cancelar su propia reserva (lo verifica el controlador)
router.put('/:id', validarId, ...duenoOAdmin(duenoDeReserva), reservaController.actualizar);
router.delete('/:id', ...soloAdmin, validarId, reservaController.eliminar);

export default router;

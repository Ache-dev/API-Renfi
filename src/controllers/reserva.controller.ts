import * as reservaDao from '../dao/reserva.dao';
import { Reserva } from '../models/reserva';

export const getReservas = async (): Promise<Reserva[]> => {
    try {
        return await reservaDao.listar();
    } catch (error) {
        throw error;
    }
};

export const crearReserva = async (reserva: Reserva): Promise<void> => {
    try {
        await reservaDao.insertar(reserva);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await reservaDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Reserva | null> => {
    try {
        return await reservaDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};
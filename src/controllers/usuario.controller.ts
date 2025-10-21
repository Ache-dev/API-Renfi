import * as usuarioDao from '../dao/usuario.dao';
import { Usuario } from '../models/usuario';

export const getUsuarios = async (): Promise<Usuario[]> => {
    try {
        const usuarios = await usuarioDao.listar();
        return usuarios;
    } catch (error) {
        throw error;
    }
};

export const crearUsuario = async (usuario: Usuario): Promise<void> => {
    try {
        await usuarioDao.insertar(usuario);
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        await usuarioDao.eliminarPorId(id);
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Usuario | null> => {
    try {
        return await usuarioDao.buscarPorId(id);
    } catch (error) {
        throw error;
    }
};
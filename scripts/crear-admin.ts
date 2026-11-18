/**
 * Crea o reactiva el administrador de Renfi con la contraseña que tú elijas (el esquema no trae ninguna por defecto).
 *
 *   ADMIN_CONTRASENA='<clave-larga>' npm run crear-admin
 *   (opcional) ADMIN_CORREO=otro@dominio.com ADMIN_NOMBRE=Ana ADMIN_APELLIDO=Perez
 *
 * Usa DATABASE_URL del .env (rol renfi_app) y los mismos procedimientos y hash que la API.
 * La contraseña solo se lee del entorno: no queda en el repositorio.
 */
import envConfig from '../src/config/env.config';
import { cerrarPool } from '../src/conexion/postgres';
import * as usuarioDao from '../src/dao/usuario.dao';
import { hashContrasena } from '../src/services/usuario.service';

(async () => {
    if (!envConfig.DATABASE_URL) throw new Error('Falta DATABASE_URL en el .env');
    const contrasena = process.env.ADMIN_CONTRASENA ?? '';
    if (contrasena.length < 12 || contrasena.length > 128) throw new Error('Define ADMIN_CONTRASENA con entre 12 y 128 caracteres.');
    const correo = (process.env.ADMIN_CORREO || 'admin@renfi.com').trim().toLowerCase();

    const hash = await hashContrasena(contrasena);
    const existente = await usuarioDao.buscarPorCorreo(correo);
    if (existente) {
        await usuarioDao.actualizar({ ...existente, IdRol: 1, Contrasena: hash, Estado: 'Activo' });
        console.log(`Administrador ${correo} actualizado y activado.`);
    } else {
        await usuarioDao.insertar({
            IdRol: 1,
            NombreUsuario: process.env.ADMIN_NOMBRE || 'Admin',
            ApellidoUsuario: process.env.ADMIN_APELLIDO || 'Renfi',
            Correo: correo,
            Contrasena: hash,
            Estado: 'Activo'
        });
        console.log(`Administrador ${correo} creado.`);
    }
})()
    .catch((e) => { console.error(`❌ ${e.message}`); process.exitCode = 1; })
    .finally(cerrarPool);

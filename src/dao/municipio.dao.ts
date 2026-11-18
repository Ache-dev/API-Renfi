import { filas, fila, insertar as insertarSp, ejecutar, contar } from "../conexion/postgres";
import { Municipio, MunicipioReporte } from "../models/municipio";

export type { MunicipioReporte };

/**
 * Reporte: reservas por finca y municipio, de mayor a menor.
 */
export const municipiosConMasReservas = (): Promise<MunicipioReporte[]> => filas('sp_municipio_mas_reservas');

/**
 * Lista todos los municipios.
 */
export const listar = (): Promise<Municipio[]> => filas('sp_municipio_listar');

/**
 * Inserta un nuevo municipio y retorna el IdMunicipio generado.
 */
export const insertar = (municipio: Municipio): Promise<number> => insertarSp('sp_municipio_insertar', [municipio.NombreMunicipio]);

/**
 * Actualiza un municipio existente.
 */
export const actualizar = (municipio: Municipio): Promise<void> =>
    ejecutar('sp_municipio_actualizar', [municipio.IdMunicipio, municipio.NombreMunicipio]);

/**
 * Elimina un municipio por su ID.
 */
export const eliminarPorId = (id: number): Promise<void> => ejecutar('sp_municipio_eliminar', [id]);

/**
 * Busca un municipio por su ID.
 */
export const buscarPorId = (id: number): Promise<Municipio | null> => fila('sp_municipio_buscar', [id]);

/**
 * Cuenta registros de Finca que referencian al id (el esquema usa ON DELETE SET NULL).
 */
export const contarReferencias = (id: number): Promise<number> => contar('sp_municipio_contar_fincas', id);

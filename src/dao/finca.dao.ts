import { query } from "../conexion/connection";
import { 
    Finca, 
    FincaReservada, 
    FincaPromedioCalificacion, 
    FincaIngresos, 
    FincaIngresosTop 
} from "../models/finca";

export type { 
    FincaReservada, 
    FincaPromedioCalificacion, 
    FincaIngresos, 
    FincaIngresosTop 
};

/**
 * Lista todas las fincas con información de municipio y propietario.
 */
export const listar = async (): Promise<Finca[]> => {
    const rs = await query<Finca>('SELECT * FROM public."SP_ListarFincas"()');
    return rs.rows;
};

/**
 * Inserta una nueva finca y retorna el IdFinca generado.
 */
export const insertar = async (finca: Finca): Promise<number> => {
    const rs = await query<{ IdFinca: number }>(
        'SELECT public."SP_InsertarFinca"($1, $2, $3, $4, $5, $6, $7, $8, $9) AS "IdFinca"',
        [
            finca.IdMunicipio,
            finca.NumeroDocumentoUsuario,
            finca.NombreFinca,
            finca.Direccion,
            finca.InformacionAdicional ?? null,
            finca.Capacidad ?? 0,
            finca.Precio ?? 0,
            finca.Estado ?? 'Disponible',
            finca.Calificacion ?? 5
        ]
    );

    const nuevoId = rs.rows[0]?.IdFinca;
    if (!nuevoId) {
        throw new Error('No se pudo obtener el identificador de la finca creada.');
    }
    return Number(nuevoId);
};

/**
 * Actualiza los datos de una finca existente.
 */
export const actualizar = async (finca: Finca): Promise<void> => {
    await query(
        'SELECT public."SP_ActualizarFinca"($1, $2, $3, $4, $5, $6, $7)',
        [
            finca.IdFinca,
            finca.NombreFinca,
            finca.Direccion,
            finca.InformacionAdicional ?? null,
            finca.Capacidad ?? 0,
            finca.Precio ?? 0,
            finca.Estado ?? 'Disponible'
        ]
    );
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    await query('DELETE FROM public."Finca" WHERE "IdFinca" = $1', [id]);
};

/**
 * Busca una finca por su identificador incluyendo datos del propietario y municipio.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => {
    const rs = await query<Finca>(
        `SELECT 
            F."IdFinca", 
            F."IdMunicipio", 
            F."NumeroDocumentoUsuario", 
            F."NombreFinca", 
            F."Direccion", 
            F."InformacionAdicional", 
            F."Capacidad", 
            F."Precio", 
            F."Estado", 
            F."Calificacion", 
            M."NombreMunicipio", 
            U."NumeroDocumento" AS "IdPropietario",
            U."NombreUsuario" AS "NombrePropietario",
            U."ApellidoUsuario" AS "ApellidoPropietario",
            U."Telefono" AS "TelefonoPropietario",
            U."Correo" AS "CorreoPropietario",
            U."NombreUsuario" AS "Dueno"
        FROM public."Finca" F 
        LEFT JOIN public."Municipio" M ON F."IdMunicipio" = M."IdMunicipio" 
        LEFT JOIN public."Usuario" U ON F."NumeroDocumentoUsuario" = U."NumeroDocumento" 
        WHERE F."IdFinca" = $1`,
        [id]
    );
    return rs.rows[0] || null;
};

// Reportes
export const fincasMasReservadas = async (): Promise<FincaReservada[]> => {
    const rs = await query<FincaReservada>('SELECT * FROM public."SP_FincasMasReservadas"()');
    return rs.rows;
};

export const promedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    const rs = await query<FincaPromedioCalificacion>('SELECT * FROM public."SP_PromedioCalificacionFincas"()');
    return rs.rows;
};

export const totalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    const rs = await query<FincaIngresos>('SELECT * FROM public."SP_TotalIngresosPorFinca"()');
    return rs.rows;
};

export const fincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    const rs = await query<FincaIngresosTop>('SELECT * FROM public."SP_FincasConMasIngresos"()');
    return rs.rows;
};
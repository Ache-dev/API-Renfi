import getConnection from "../conexion/connection";
import { 
    Finca, 
    FincaReservada, 
    FincaPromedioCalificacion, 
    FincaIngresos, 
    FincaIngresosTop 
} from "../models/finca";
import sql from 'mssql';

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
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_ListarFincas');
        if (rs && rs.recordset) {
            return rs.recordset as Finca[];
        }
        return [];
    } catch (error) {
        throw error;
    }
};

/**
 * Inserta una nueva finca y retorna el IdFinca generado.
 */
export const insertar = async (finca: Finca): Promise<number> => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('IdMunicipio', sql.Int, finca.IdMunicipio)
            .input('NumeroDocumentoUsuario', sql.Int, finca.NumeroDocumentoUsuario)
            .input('NombreFinca', sql.VarChar(300), finca.NombreFinca)
            .input('Direccion', sql.VarChar(500), finca.Direccion)
            .input('InformacionAdicional', sql.VarChar(500), finca.InformacionAdicional ?? null)
            .input('Capacidad', sql.Int, finca.Capacidad ?? 0)
            .input('Precio', sql.Int, finca.Precio ?? 0)
            .input('Estado', sql.VarChar(150), finca.Estado ?? 'Disponible')
            .input('Calificacion', sql.Int, finca.Calificacion ?? 5)
            .query(`
                INSERT INTO Finca (IdMunicipio, NumeroDocumentoUsuario, NombreFinca, Direccion, InformacionAdicional, Capacidad, Precio, Estado, Calificacion)
                VALUES (@IdMunicipio, @NumeroDocumentoUsuario, @NombreFinca, @Direccion, @InformacionAdicional, @Capacidad, @Precio, @Estado, @Calificacion);
                
                SELECT SCOPE_IDENTITY() AS IdFinca;
            `);

        const nuevoId = result?.recordset?.[0]?.IdFinca;
        if (!nuevoId) {
            throw new Error('No se pudo obtener el identificador de la finca creada.');
        }
        return Number(nuevoId);
    } catch (error) {
        throw error;
    }
};

/**
 * Actualiza los datos de una finca existente.
 */
export const actualizar = async (finca: Finca): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFinca', sql.Int, finca.IdFinca)
            .input('NombreFinca', sql.VarChar(300), finca.NombreFinca)
            .input('Direccion', sql.VarChar(500), finca.Direccion)
            .input('InformacionAdicional', sql.VarChar(500), finca.InformacionAdicional ?? null)
            .input('Capacidad', sql.Int, finca.Capacidad ?? 0)
            .input('Precio', sql.Int, finca.Precio ?? 0)
            .input('Estado', sql.VarChar(150), finca.Estado ?? 'Disponible')
            .execute('SP_ActualizarFinca');
    } catch (error) {
        throw error;
    }
};

/**
 * Elimina una finca por su identificador.
 */
export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFinca', sql.Int, id)
            .query('DELETE FROM Finca WHERE IdFinca = @IdFinca');
    } catch (error) {
        throw error;
    }
};

/**
 * Busca una finca por su identificador incluyendo datos del propietario y municipio.
 */
export const buscarPorId = async (id: number): Promise<Finca | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFinca', sql.Int, id)
            .query(`
                SELECT 
                    F.IdFinca, 
                    F.IdMunicipio, 
                    F.NumeroDocumentoUsuario, 
                    F.NombreFinca, 
                    F.Direccion, 
                    F.InformacionAdicional, 
                    F.Capacidad, 
                    F.Precio, 
                    F.Estado, 
                    F.Calificacion, 
                    M.NombreMunicipio, 
                    U.NumeroDocumento AS IdPropietario,
                    U.NombreUsuario AS NombrePropietario,
                    U.ApellidoUsuario AS ApellidoPropietario,
                    U.Telefono AS TelefonoPropietario,
                    U.Correo AS CorreoPropietario,
                    U.NombreUsuario AS Dueno
                FROM Finca F 
                LEFT JOIN Municipio M ON F.IdMunicipio = M.IdMunicipio 
                LEFT JOIN Usuario U ON F.NumeroDocumentoUsuario = U.NumeroDocumento 
                WHERE F.IdFinca = @IdFinca
            `);
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Finca;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

// Reportes
export const fincasMasReservadas = async (): Promise<FincaReservada[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_FincasMasReservadas');
        return (rs?.recordset as FincaReservada[]) ?? [];
    } catch (error) {
        throw error;
    }
};

export const promedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_PromedioCalificacionFincas');
        return (rs?.recordset as FincaPromedioCalificacion[]) ?? [];
    } catch (error) {
        throw error;
    }
};

export const totalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_TotalIngresosPorFinca');
        return (rs?.recordset as FincaIngresos[]) ?? [];
    } catch (error) {
        throw error;
    }
};

export const fincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_FincasConMasIngresos');
        return (rs?.recordset as FincaIngresosTop[]) ?? [];
    } catch (error) {
        throw error;
    }
};
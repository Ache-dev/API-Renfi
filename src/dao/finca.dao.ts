import getConnection from "../conexion/connection";
import { Finca } from "../models/finca";
// Interfaces para los reportes
export interface FincaReservada {
    NombreFinca: string;
    CantidadReservas: number;
}

export interface FincaPromedioCalificacion {
    NombreFinca: string;
    PromedioCalificacion: number;
}

export interface FincaIngresos {
    NombreFinca: string;
    TotalIngresos: number;
}

export interface FincaIngresosTop {
    NombreFinca: string;
    IngresosTotales: number;
}

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

export const insertar = async (finca: Finca): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdMunicipio', finca.IdMunicipio)
            .input('NumeroDocumentoUsuario', finca.NumeroDocumentoUsuario)
            .input('NombreFinca', finca.NombreFinca)
            .input('Direccion', finca.Direccion)
            .input('InformacionAdicional', finca.InformacionAdicional)
            .input('Capacidad', finca.Capacidad)
            .input('Precio', finca.Precio)
            .input('Estado', finca.Estado)
            .execute('SP_InsertarFinca');
    } catch (error) {
        throw error;
    }
};

export const actualizar = async (finca: Finca): Promise<void> => {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('IdFinca', finca.IdFinca)
            .input('NombreFinca', finca.NombreFinca)
            .input('Direccion', finca.Direccion)
            .input('InformacionAdicional', finca.InformacionAdicional)
            .input('Capacidad', finca.Capacidad)
            .input('Precio', finca.Precio)
            .input('Estado', finca.Estado)
            .execute('SP_ActualizarFinca');
    } catch (error) {
        throw error;
    }
};

export const eliminarPorId = async (id: number): Promise<void> => {
    try {
        const pool = await getConnection();
        // El trigger INSTEAD OF DELETE marcará la finca como 'No Disponible'
        await pool.request()
            .input('IdFinca', id)
            .query('DELETE FROM Finca WHERE IdFinca = @IdFinca');
    } catch (error) {
        throw error;
    }
};

// Reporte: Fincas más reservadas
export const fincasMasReservadas = async (): Promise<FincaReservada[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_FincasMasReservadas');
        return rs.recordset as FincaReservada[];
    } catch (error) {
        throw error;
    }
};

// Reporte: Promedio de calificación de fincas
export const promedioCalificacionFincas = async (): Promise<FincaPromedioCalificacion[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_PromedioCalificacionFincas');
        return rs.recordset as FincaPromedioCalificacion[];
    } catch (error) {
        throw error;
    }
};

// Reporte: Total de ingresos por finca
export const totalIngresosPorFinca = async (): Promise<FincaIngresos[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_TotalIngresosPorFinca');
        return rs.recordset as FincaIngresos[];
    } catch (error) {
        throw error;
    }
};

// Reporte: Fincas con más ingresos (TOP 5)
export const fincasConMasIngresos = async (): Promise<FincaIngresosTop[]> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request().execute('SP_FincasConMasIngresos');
        return rs.recordset as FincaIngresosTop[];
    } catch (error) {
        throw error;
    }
};

export const buscarPorId = async (id: number): Promise<Finca | null> => {
    try {
        const pool = await getConnection();
        const rs = await pool.request()
            .input('IdFinca', id)
            .query('SELECT F.IdFinca, F.IdMunicipio, F.NumeroDocumentoUsuario, F.NombreFinca, F.Direccion, F.InformacionAdicional, F.Capacidad, F.Precio, F.Estado, F.Calificacion, M.NombreMunicipio, U.NombreUsuario AS Dueno FROM Finca F LEFT JOIN Municipio M ON F.IdMunicipio = M.IdMunicipio LEFT JOIN Usuario U ON F.NumeroDocumentoUsuario = U.NumeroDocumento WHERE F.IdFinca = @IdFinca');
        if (rs && rs.recordset && rs.recordset.length > 0) {
            return rs.recordset[0] as Finca;
        }
        return null;
    } catch (error) {
        throw error;
    }
};
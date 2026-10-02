import sql, { ConnectionPool } from "mssql";
import { sqlConfig } from "./config";

let pool: ConnectionPool | null = null;

/**
 * Retorna la instancia activa del ConnectionPool de SQL Server (Singleton).
 * Si la conexión no existe o está cerrada, inicializa un nuevo pool con reintentos.
 */
export default async function getConnection(): Promise<ConnectionPool> {
    try {
        if (pool && pool.connected) {
            return pool;
        }

        if (pool && pool.connecting) {
            // Esperar a que termine de conectarse
            await new Promise((resolve) => setTimeout(resolve, 300));
            if (pool.connected) {
                return pool;
            }
        }

        // Crear y conectar un nuevo pool
        pool = new sql.ConnectionPool(sqlConfig);
        await pool.connect();

        pool.on('error', (err) => {
            console.error('[Database Pool Error]:', err);
            pool = null;
        });

        return pool;
    } catch (error) {
        console.error('[Database Connection Failed]:', error);
        pool = null;
        throw error;
    }
}

/**
 * Cierra ordenadamente la conexión al pool de base de datos.
 */
export async function closeConnection(): Promise<void> {
    if (pool && pool.connected) {
        try {
            await pool.close();
            pool = null;
        } catch (error) {
            console.error('[Database Close Error]:', error);
        }
    }
}
}
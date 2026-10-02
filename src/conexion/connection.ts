import { Pool, QueryResult, QueryResultRow } from "pg";
import { pgConfig } from "./config";

let pool: Pool | null = null;

/**
 * Retorna la instancia activa del Pool de PostgreSQL / Supabase (Singleton).
 */
export default function getPool(): Pool {
    if (!pool) {
        pool = new Pool(pgConfig);

        pool.on("error", (err) => {
            console.error("[PostgreSQL Pool Error]:", err);
        });
    }
    return pool;
}

/**
 * Helper para ejecutar consultas parametrizadas con gestión automática de clientes del pool.
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const client = getPool();
    return await client.query<T>(text, params);
}

/**
 * Cierra ordenadamente la conexión al pool de base de datos.
 */
export async function closeConnection(): Promise<void> {
    if (pool) {
        try {
            await pool.end();
            pool = null;
        } catch (error) {
            console.error("[PostgreSQL Pool Close Error]:", error);
        }
    }
}
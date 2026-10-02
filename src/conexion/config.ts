import { PoolConfig } from "pg";
import envConfig from "../config/env.config";

/**
 * Configuración del Pool de conexiones para PostgreSQL / Supabase.
 * Soporta conexión por URI (DATABASE_URL) o por parámetros individuales.
 */
export const pgConfig: PoolConfig = envConfig.DB.CONNECTION_STRING
    ? {
        connectionString: envConfig.DB.CONNECTION_STRING,
        ssl: envConfig.DB.SSL ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    }
    : {
        host: envConfig.DB.HOST,
        port: envConfig.DB.PORT,
        user: envConfig.DB.USER,
        password: envConfig.DB.PASSWORD,
        database: envConfig.DB.DATABASE,
        ssl: envConfig.DB.SSL ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    };

export default pgConfig;
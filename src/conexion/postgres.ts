import { Pool } from 'pg';
import envConfig from '../config/env.config';

let pool: Pool | null = null;

/**
 * Pool de conexiones a Azure Database for PostgreSQL (Singleton).
 * En producción exige TLS con verificación de certificado.
 */
export default function getPool(): Pool {
    if (!pool) {
        if (!envConfig.DATABASE_URL) throw new Error('Falta DATABASE_URL en el archivo .env');
        pool = new Pool({
            connectionString: envConfig.DATABASE_URL,
            ssl: envConfig.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000
        });
        // Un error en una conexión inactiva no debe tumbar el proceso
        pool.on('error', (err) => console.error('[Postgres] Error en una conexión inactiva:', err.message));
    }
    return pool;
}

/**
 * La API solo ejecuta procedimientos almacenados (sp_*): `sp` es siempre una constante del código
 * (nunca texto del usuario) y los valores viajan como parámetros ($1, $2...), nunca concatenados.
 * Los errores de pg conservan code / detail / column (SQLSTATE) para que error.middleware los traduzca a 4xx.
 */
const llamada = (sp: string, args: unknown[]) =>
    getPool().query(`SELECT ${sp}(${args.map((_, i) => `$${i + 1}`).join(', ')}) AS r`, args);

/**
 * Procedimiento que devuelve varias filas (SETOF jsonb): arreglo de objetos.
 */
export async function filas<T = any>(sp: string, args: unknown[] = []): Promise<T[]> {
    return (await llamada(sp, args)).rows.map((f) => f.r);
}

/**
 * Procedimiento que devuelve a lo sumo una fila (jsonb / escalar): el valor o null.
 */
export async function fila<T = any>(sp: string, args: unknown[] = []): Promise<T | null> {
    return (await llamada(sp, args)).rows[0]?.r ?? null;
}

/**
 * Procedimiento INSERT ... RETURNING: devuelve el Id generado (el equivalente de SCOPE_IDENTITY).
 */
export async function insertar(sp: string, args: unknown[]): Promise<number> {
    const id = await fila<number>(sp, args);
    if (id === null) throw new Error('La base de datos no devolvió el registro esperado.');
    return Number(id);
}

/**
 * Procedimiento sin resultado (UPDATE / DELETE).
 */
export async function ejecutar(sp: string, args: unknown[] = []): Promise<void> {
    await llamada(sp, args);
}

/**
 * Procedimiento de conteo (sp_*_contar_*).
 */
export async function contar(sp: string, id: number): Promise<number> {
    return Number((await fila<number>(sp, [id])) ?? 0);
}

/**
 * Verifica que la base responde (arranque de la API).
 */
export async function verificarConexion(): Promise<void> {
    await getPool().query('SELECT 1');
}

export async function cerrarPool(): Promise<void> {
    if (pool) await pool.end();
    pool = null;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import envConfig from '../config/env.config';

let client: SupabaseClient | null = null;

/**
 * Retorna el cliente de Supabase (Singleton). Habla con PostgREST por HTTPS,
 * por lo que no mantiene conexiones abiertas que haya que cerrar.
 */
export default function getSupabase(): SupabaseClient {
    if (!client) {
        const { URL, KEY } = envConfig.SUPABASE;
        if (!URL || !KEY) {
            throw new Error('Faltan SUPABASE_URL y/o SUPABASE_KEY en el archivo .env');
        }
        client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    return client;
}

type Resultado = { data: any; error: { message: string; code?: string; details?: string } | null };

/**
 * Resuelve una consulta de supabase-js: devuelve data o lanza el error de PostgREST
 * conservando code/detail (SQLSTATE) para que error.middleware lo traduzca a 4xx.
 * El cliente no está tipado con el esquema, por eso data es any.
 */
export async function unwrap(consulta: PromiseLike<Resultado>): Promise<any> {
    const { data, error } = await consulta;
    if (error) {
        throw Object.assign(new Error(error.message), { code: error.code ?? '', detail: error.details ?? '' });
    }
    return data;
}

/**
 * Como unwrap, pero exige una fila (insert ... select().single()).
 */
export async function unwrapOne(consulta: PromiseLike<Resultado>): Promise<any> {
    const data = await unwrap(consulta);
    if (data === null || data === undefined) throw new Error('La base de datos no devolvió el registro esperado.');
    return data;
}

/**
 * Cuenta filas de una tabla que cumplen col = valor.
 */
export async function contar(tabla: string, columna: string, valor: number): Promise<number> {
    const { count, error } = await getSupabase().from(tabla).select(columna, { count: 'exact', head: true }).eq(columna, valor);
    if (error) throw Object.assign(new Error(error.message), { code: error.code ?? '', detail: error.details ?? '' });
    return count ?? 0;
}

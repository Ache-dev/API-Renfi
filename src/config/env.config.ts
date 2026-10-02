import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Configuración centralizada de variables de entorno de la aplicación.
 * Proporciona valores por defecto seguros para el entorno de desarrollo local.
 */
export const envConfig = {
    // Entorno de ejecución y servidor
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 3000,

    // Base de datos PostgreSQL / Supabase
    DB: {
        CONNECTION_STRING: process.env.DATABASE_URL || '',
        HOST: process.env.DB_HOST || process.env.PGHOST || 'localhost',
        PORT: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
        USER: process.env.DB_USER || process.env.PGUSER || 'postgres',
        PASSWORD: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
        DATABASE: process.env.DB_DATABASE || process.env.PGDATABASE || 'postgres',
        SSL: process.env.DB_SSL === 'true' || (Boolean(process.env.DATABASE_URL) && !(process.env.DATABASE_URL || '').includes('localhost'))
    },

    // Seguridad y Autenticación JWT
    JWT: {
        SECRET: process.env.JWT_SECRET || 'renfi_jwt_super_secret_key_2025_safe_token',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
    },

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

export default envConfig;


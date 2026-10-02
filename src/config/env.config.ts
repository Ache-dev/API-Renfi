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

    // Base de datos SQL Server
    DB: {
        USER: process.env.DB_USER || 'sa',
        PASSWORD: process.env.DB_PASSWORD || 'Passw0rd!',
        SERVER: process.env.DB_SERVER || 'localhost',
        DATABASE: process.env.DB_DATABASE || 'Renfi',
        PORT: Number(process.env.DB_PORT) || 1433,
        ENCRYPT: process.env.DB_ENCRYPT !== 'false',
        TRUST_SERVER_CERTIFICATE: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
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


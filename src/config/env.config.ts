import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Configuración centralizada de variables de entorno de la aplicación.
 */
export const envConfig = {
    // Entorno de ejecución y servidor
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 3000,

    // Número de proxies de confianza delante de la API (1 en Azure App Service). Necesario para ver la IP real del cliente.
    TRUST_PROXY: Number(process.env.TRUST_PROXY || (process.env.NODE_ENV === 'production' ? 1 : 0)) || 0,

    // Azure Database for PostgreSQL (cadena de conexión del rol renfi_app)
    DATABASE_URL: process.env.DATABASE_URL || '',
    // Conexiones máximas por instancia de la API (el servidor limita al rol a 30 en total: instancias x pool <= 30)
    DB_POOL_MAX: Math.min(Math.max(Number(process.env.DB_POOL_MAX) || 10, 1), 30),

    // Azure Blob Storage: contenedor público de imágenes de fincas
    AZURE_STORAGE: {
        ACCOUNT_URL: (process.env.AZURE_STORAGE_ACCOUNT_URL || '').replace(/\/+$/, ''),
        CONTAINER: process.env.AZURE_STORAGE_CONTAINER || 'fincas-imagenes',
        // Solo desarrollo (Azurite o clave de la cuenta). En Azure se usa la identidad administrada.
        CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING || ''
    },

    // Seguridad y Autenticación JWT
    JWT: {
        // Sin valor por defecto: un secreto público en el repositorio permitiría falsificar tokens de administrador.
        SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'secreto-solo-para-pruebas' : ''),
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d'
    },

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

export default envConfig;

if (envConfig.JWT.SECRET.length < 32) {
    throw new Error('Define JWT_SECRET en el .env con al menos 32 caracteres (generalo con crypto.randomBytes(48).toString("hex")).');
}

/**
 * Falla al arrancar, con un mensaje claro, si falta la configuración de base de datos o de Blob Storage.
 * Se invoca desde src/index.ts (no al importar, para que las pruebas con servicios simulados no la necesiten).
 */
export const validarConfiguracion = (): void => {
    const faltan: string[] = [];
    if (!envConfig.DATABASE_URL) faltan.push('DATABASE_URL');
    if (!envConfig.AZURE_STORAGE.ACCOUNT_URL) faltan.push('AZURE_STORAGE_ACCOUNT_URL');
    if (!envConfig.AZURE_STORAGE.CONTAINER) faltan.push('AZURE_STORAGE_CONTAINER');
    if (faltan.length) {
        throw new Error(`Faltan variables de entorno obligatorias en el .env: ${faltan.join(', ')}. Revisa .env.example.`);
    }
    if (envConfig.NODE_ENV === 'production' && envConfig.AZURE_STORAGE.CONNECTION_STRING) {
        console.warn('[Config] AZURE_STORAGE_CONNECTION_STRING es solo para desarrollo: en producción usa identidad administrada.');
    }
};

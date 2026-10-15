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

    // Base de datos: Supabase (PostgREST). Acepta la clave publishable o la secret.
    // Se mantienen los nombres NEXT_PUBLIC_* para reutilizar el .env de Renfi-ExpoGo.
    SUPABASE: {
        URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        KEY: process.env.SUPABASE_SECRET_KEY
            || process.env.SUPABASE_KEY
            || process.env.SUPABASE_PUBLISHABLE_KEY
            || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            || '',
        // Bucket público de imágenes de fincas (se crea con db/migraciones/001_imagenes_y_ficha_finca.sql)
        BUCKET_FINCAS: process.env.SUPABASE_BUCKET_FINCAS || 'fincas-imagenes'
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

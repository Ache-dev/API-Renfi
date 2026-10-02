import { config } from "mssql";
import envConfig from "../config/env.config";

/**
 * Configuración de la conexión a SQL Server.
 * Obtiene credenciales y parámetros de conexión dinámicamente desde envConfig.
 */
export const sqlConfig: config = {
    user: envConfig.DB.USER,
    password: envConfig.DB.PASSWORD,
    database: envConfig.DB.DATABASE,
    server: envConfig.DB.SERVER,
    port: envConfig.DB.PORT,
    options: {
        trustServerCertificate: envConfig.DB.TRUST_SERVER_CERTIFICATE,
        encrypt: envConfig.DB.ENCRYPT
    },
    pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000
    }
};

export default sqlConfig;
}
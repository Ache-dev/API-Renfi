import envConfig, { validarConfiguracion } from './config/env.config';
import { verificarConexion, cerrarPool } from './conexion/postgres';
import app from './app';

const PORT = envConfig.PORT;

const iniciar = async () => {
    // Falla al arrancar (y no en la primera petición) si falta la configuración o la base no responde
    validarConfiguracion();
    try {
        await verificarConexion();
    } catch (e: any) {
        throw new Error(`No se pudo conectar a la base de datos (DATABASE_URL): ${e.message}`);
    }

    // Inicialización del servidor
    const server = app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Servidor Renfi API corriendo en: http://localhost:${PORT}`);
        console.log(`🌱 Entorno: ${envConfig.NODE_ENV}`);
        console.log(`📚 Endpoints principales:`);
        console.log(`   - Usuarios:        http://localhost:${PORT}/api/usuario`);
        console.log(`   - Fincas:          http://localhost:${PORT}/api/finca`);
        console.log(`   - Reservas:        http://localhost:${PORT}/api/reserva`);
        console.log(`   - Pagos:           http://localhost:${PORT}/api/pago`);
        console.log(`   - Facturas:        http://localhost:${PORT}/api/factura`);
        console.log(`   - Métodos de Pago: http://localhost:${PORT}/api/metododepago`);
        console.log(`   - Municipios:      http://localhost:${PORT}/api/municipio`);
        console.log(`   - Imágenes:        http://localhost:${PORT}/api/imagen`);
        console.log(`   - Roles:           http://localhost:${PORT}/api/rol`);
        console.log(`====================================================`);
    });

    // Cierre controlado de conexiones (Graceful shutdown)
    const gracefulShutdown = (signal: string) => {
        console.log(`\n[${signal}] Apagando servidor ordenadamente...`);
        server.close(async () => {
            await cerrarPool();
            console.log('Proceso finalizado.');
            process.exit(0);
        });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

iniciar().catch((e) => {
    console.error(`\n❌ ${e.message}\n`);
    process.exit(1);
});

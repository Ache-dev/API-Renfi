import envConfig from './config/env.config';
import { closeConnection } from './conexion/connection';
import app from './app';

const PORT = envConfig.PORT;

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
const gracefulShutdown = async (signal: string) => {
    console.log(`\n[${signal}] Apagando servidor ordenadamente...`);
    server.close(async () => {
        await closeConnection();
        console.log('Conexiones a base de datos cerradas. Proceso finalizado.');
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

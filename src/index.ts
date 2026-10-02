import express from 'express';
import cors from 'cors';
import envConfig from './config/env.config';
import { closeConnection } from './conexion/connection';
import { errorHandler } from './middlewares/error.middleware';

// Importación de rutas
import usuarioRouter from './routes/usuario.route';
import fincaRouter from './routes/finca.route';
import imagenRouter from './routes/imagen.route';
import metodoRouter from './routes/metododepago.route';
import municipioRouter from './routes/municipio.route';
import pagoRouter from './routes/pago.route';
import reservaRouter from './routes/reserva.route';
import facturaRouter from './routes/factura.route';
import rolRouter from './routes/rol.route';

const app = express();
const PORT = envConfig.PORT;

// Middlewares globales de seguridad y parsing
app.use(cors({
    origin: envConfig.CORS_ORIGIN === '*' ? true : envConfig.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware simple de auditoría/logging de peticiones en consola
app.use((req, _res, next) => {
    if (envConfig.NODE_ENV !== 'test') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    }
    next();
});

// Health check y estado del sistema
app.get('/', (_, res) => {
    res.status(200).json({
        success: true,
        message: 'API Renfi operativa y lista para recibir peticiones',
        version: '1.0.0',
        environment: envConfig.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (_, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api/usuario', usuarioRouter);
app.use('/api/finca', fincaRouter);
app.use('/api/imagen', imagenRouter);
app.use('/api/metododepago', metodoRouter);
app.use('/api/municipio', municipioRouter);
app.use('/api/pago', pagoRouter);
app.use('/api/reserva', reservaRouter);
app.use('/api/factura', facturaRouter);
app.use('/api/rol', rolRouter);

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `La ruta '${req.method} ${req.originalUrl}' no existe en esta API.`
    });
});

// Middleware global de manejo de errores (siempre al final de las rutas)
app.use(errorHandler);

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

export default app;
export default app;
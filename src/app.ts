import express from 'express';
import cors from 'cors';
import envConfig from './config/env.config';
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

export default app;

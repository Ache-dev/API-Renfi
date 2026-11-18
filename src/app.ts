import express from 'express';
import cors from 'cors';
import envConfig from './config/env.config';
import { errorHandler, soloValoresPlanos, limitarConsulta } from './middlewares/error.middleware';
import { limitarIntentos } from './middlewares/rate-limit.middleware';

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

// Detrás de Azure App Service / Front Door la IP real llega en X-Forwarded-For: sin esto, el límite de peticiones
// contaría a todos los usuarios como uno solo.
if (envConfig.TRUST_PROXY > 0) app.set('trust proxy', envConfig.TRUST_PROXY);
app.disable('x-powered-by');

// Middlewares globales de seguridad y parsing
app.use(cors({
    origin: envConfig.CORS_ORIGIN === '*' ? true : envConfig.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(soloValoresPlanos);
app.use(limitarConsulta);

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

// Límites de uso (evitan caídas y sobrecostos). Por IP: 300 peticiones/min en total y 60 escrituras/min.
app.use('/api', limitarIntentos(300, 60_000));
app.use('/api', limitarIntentos(60, 60_000, true));

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

import express from 'express';
import cors from 'cors';
import usuarioRouter from './routes/usuario.route';
import fincaRouter from './routes/finca.route';
import imagenRouter from './routes/imagen.route';
import metodoRouter from './routes/metododepago.route';
import municipioRouter from './routes/municipio.route';
import pagoRouter from './routes/pago.route';
import reservaRouter from './routes/reserva.route';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (_, res) => {
  res.send('API Finca operativa');
});

// Rutas
app.use('/api/usuario', usuarioRouter);
app.use('/api/finca', fincaRouter);
app.use('/api/imagen', imagenRouter);
app.use('/api/metododepago', metodoRouter);
app.use('/api/municipio', municipioRouter);
app.use('/api/pago', pagoRouter);
app.use('/api/reserva', reservaRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`- Usuarios:  http://localhost:${PORT}/api/usuario`);
  console.log(`- Fincas:    http://localhost:${PORT}/api/finca`);
  console.log(`- Imagenes:  http://localhost:${PORT}/api/imagen`);
  console.log(`- Metodos de Pago:  http://localhost:${PORT}/api/metododepago`);
  console.log(`- Municipios:  http://localhost:${PORT}/api/municipio`);
  console.log(`- Pagos:  http://localhost:${PORT}/api/pago`);
  console.log(`- Reservas:  http://localhost:${PORT}/api/reserva`);
});

  

export default app;
import express from 'express';
import cors from 'cors';
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
app.use('/api/factura', facturaRouter);
app.use('/api/rol', rolRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`- Usuarios:   http://localhost:${PORT}/api/usuario`);
  console.log(`- Fincas:     http://localhost:${PORT}/api/finca`);
  console.log(`    - Reporte más reservadas:   http://localhost:${PORT}/api/finca/report/mas-reservadas`);
  console.log(`    - Reporte promedio calificación:   http://localhost:${PORT}/api/finca/report/promedio-calificacion`);
  console.log(`    - Reporte total ingresos:   http://localhost:${PORT}/api/finca/report/total-ingresos`);
  console.log(`    - Reporte más ingresos:   http://localhost:${PORT}/api/finca/report/mas-ingresos`);
  console.log(`- Imagenes:   http://localhost:${PORT}/api/imagen`);
  console.log(`    - Imágenes por finca:   http://localhost:${PORT}/api/imagen/finca/:id`);
  console.log(`- Metodos de Pago: http://localhost:${PORT}/api/metododepago`);
  console.log(`- Municipios: http://localhost:${PORT}/api/municipio`);
  console.log(`    - Reporte más reservas:   http://localhost:${PORT}/api/municipio/report/mas-reservas`);
  console.log(`- Pagos:      http://localhost:${PORT}/api/pago`);
  console.log(`    - Reporte pendientes:   http://localhost:${PORT}/api/pago/report/pendientes`);
  console.log(`- Reservas:   http://localhost:${PORT}/api/reserva`);
  console.log(`- Facturas:   http://localhost:${PORT}/api/factura`);
  console.log(`- Roles:      http://localhost:${PORT}/api/rol`);
});

  

export default app;
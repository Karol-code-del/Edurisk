const express = require('express');
const cors = require('cors');
require('dotenv').config();

require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const docenteRoutes = require('./routes/docenteRoutes');
const jefeRoutes = require('./routes/jefeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/docente', docenteRoutes);
app.use('/api/jefe', jefeRoutes);

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Servidor de Alerta Temprana funcionando correctamente.',
    timestamp: new Date()
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
});

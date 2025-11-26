// Cargar variables de entorno desde la raíz del proyecto
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (compatible con desarrollo y Docker)
const frontendPath = path.join(__dirname, '../frontend');
if (!fs.existsSync(frontendPath)) {
  // Si no existe en ../frontend, buscar en ./frontend (Docker)
  app.use(express.static(path.join(__dirname, './frontend')));
} else {
  app.use(express.static(frontendPath));
}

// Servir archivos de uploads
const uploadsPath = path.join(__dirname, '../uploads');
if (fs.existsSync(uploadsPath)) {
  app.use('/uploads', express.static(uploadsPath));
}

// Rutas
const clientesRoutes = require('./routes/clientes');
const asesoresRoutes = require('./routes/asesores');
const asignacionesRoutes = require('./routes/asignaciones');
const importarRoutes = require('./routes/importar');
const reportesRoutes = require('./routes/reportes');

app.use('/api/clientes', clientesRoutes);
app.use('/api/asesores', asesoresRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/importar', importarRoutes);
app.use('/api/reportes', reportesRoutes);

// Ruta principal
app.get('/', (req, res) => {
  const frontendPath = path.join(__dirname, '../frontend');
  const indexPath = fs.existsSync(frontendPath) 
    ? path.join(frontendPath, 'index.html')
    : path.join(__dirname, './frontend/index.html');
  res.sendFile(indexPath);
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});


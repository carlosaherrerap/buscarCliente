const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta del directorio de uploads
// En Docker: /app/uploads (desde WORKDIR /app)
// En desarrollo: ../../uploads (raíz del proyecto)
const isDocker = process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');
const uploadsDir = isDocker 
  ? path.join(__dirname, '../uploads')  // En Docker: /app/uploads
  : path.join(__dirname, '../../uploads'); // En desarrollo: raíz del proyecto

// Crear directorio de uploads si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Directorio de uploads creado en:', uploadsDir);
}

console.log('Directorio de uploads configurado:', uploadsDir);
console.log('Es Docker:', isDocker);

// Configurar multer para subir archivos con nombres descriptivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único: timestamp + nombre original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_'); // Limpiar nombre
    const filename = `voucher_${name}_${uniqueSuffix}${ext}`;
    console.log('Generando nombre de archivo:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    // Permitir solo imágenes y PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen o PDF'));
    }
  }
});

// Crear asignación (ahora usa id_cuenta en lugar de id_cliente)
router.post('/', upload.single('voucher'), async (req, res) => {
  let uploadedFile = null;
  
  try {
    const { id_cuenta, id_asesor, importe, fecha_pago, tipo_pago } = req.body;
    const pool = await getPool();
    
    // Validar campos requeridos
    if (!id_cuenta || !id_asesor || !importe || !fecha_pago || !tipo_pago) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        message: 'Todos los campos son obligatorios excepto el voucher'
      });
    }
    
    let voucherPath = null;
    if (req.file) {
      // Log para depuración
      console.log('Archivo recibido:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      });
      
      // Verificar que el archivo se haya guardado correctamente
      if (!req.file.filename) {
        console.error('Error: req.file.filename está vacío');
        return res.status(500).json({ 
          error: 'Error al procesar el archivo',
          message: 'No se pudo generar el nombre del archivo'
        });
      }
      
      // Guardar la ruta relativa: uploads/nombre_archivo
      // req.file.filename debería tener el nombre generado por el storage
      voucherPath = `uploads/${req.file.filename}`;
      uploadedFile = req.file.path;
      
      console.log('Ruta del voucher que se guardará en BD:', voucherPath);
      
      // Verificar que el archivo existe físicamente
      if (!fs.existsSync(req.file.path)) {
        console.error('Error: El archivo no existe en:', req.file.path);
        return res.status(500).json({ 
          error: 'Error al guardar el archivo',
          message: 'El archivo no se guardó correctamente'
        });
      }
    }
    
    const result = await pool.request()
      .input('id_cuenta', sql.Int, parseInt(id_cuenta))
      .input('id_asesor', sql.Int, parseInt(id_asesor))
      .input('importe', sql.Float, parseFloat(importe))
      .input('fecha_pago', sql.Date, fecha_pago)
      .input('tipo_pago', sql.VarChar, tipo_pago)
      .input('voucher', sql.VarChar, voucherPath)
      .query(`
        INSERT INTO asignacion_cliente (id_cuenta, id_asesor, importe, fecha_pago, tipo_pago, voucher)
        VALUES (@id_cuenta, @id_asesor, @importe, @fecha_pago, @tipo_pago, @voucher)
        SELECT SCOPE_IDENTITY() as id
      `);
    
    res.json({ 
      success: true, 
      message: 'Asignación guardada correctamente',
      id: result.recordset[0].id,
      voucher: voucherPath
    });
  } catch (error) {
    // Si hubo error y se subió un archivo, eliminarlo
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      try {
        fs.unlinkSync(uploadedFile);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo subido:', unlinkError);
      }
    }
    
    console.error('Error al crear asignación:', error);
    res.status(500).json({ 
      error: 'Error al crear asignación', 
      message: error.message 
    });
  }
});

// Obtener asignaciones de una cuenta
router.get('/cuenta/:id_cuenta', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_cuenta', sql.Int, req.params.id_cuenta)
      .query(`
        SELECT ac.*, a.nombre as asesor_nombre, a.dni as asesor_dni
        FROM asignacion_cliente ac
        INNER JOIN asesor a ON ac.id_asesor = a.id
        WHERE ac.id_cuenta = @id_cuenta
        ORDER BY ac.fecha_pago DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({ error: 'Error al obtener asignaciones', message: error.message });
  }
});

// Obtener asignaciones de un cliente (todas sus cuentas)
router.get('/cliente/:id_cliente', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_cliente', sql.Int, req.params.id_cliente)
      .query(`
        SELECT 
          ac.*, 
          a.nombre as asesor_nombre, 
          a.dni as asesor_dni,
          cu.numero_cuenta
        FROM asignacion_cliente ac
        INNER JOIN asesor a ON ac.id_asesor = a.id
        INNER JOIN cuenta cu ON ac.id_cuenta = cu.id
        WHERE cu.id_cliente = @id_cliente
        ORDER BY ac.fecha_pago DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({ error: 'Error al obtener asignaciones', message: error.message });
  }
});

module.exports = router;


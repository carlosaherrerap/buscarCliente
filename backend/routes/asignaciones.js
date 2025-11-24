const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subir archivos
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Crear directorio de uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Crear asignación (ahora usa id_cuenta en lugar de id_cliente)
router.post('/', upload.single('voucher'), async (req, res) => {
  try {
    const { id_cuenta, id_asesor, importe, fecha_pago, tipo_pago } = req.body;
    const pool = await getPool();
    
    let voucherPath = null;
    if (req.file) {
      voucherPath = req.file.filename;
    }
    
    const result = await pool.request()
      .input('id_cuenta', sql.Int, id_cuenta)
      .input('id_asesor', sql.Int, id_asesor)
      .input('importe', sql.Float, importe)
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
      id: result.recordset[0].id
    });
  } catch (error) {
    console.error('Error al crear asignación:', error);
    res.status(500).json({ error: 'Error al crear asignación', message: error.message });
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


const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { getPool, sql } = require('../config/database');
const fs = require('fs');

const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Crear directorio si no existe
if (!fs.existsSync('uploads/temp')) {
  fs.mkdirSync('uploads/temp', { recursive: true });
}

// Importar clientes desde Excel
router.post('/clientes', upload.single('archivo'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Validar campos requeridos
    const camposRequeridos = ['dni', 'nombres'];
    const camposEncontrados = Object.keys(data[0]);
    const camposFaltantes = camposRequeridos.filter(campo => 
      !camposEncontrados.some(c => c.toLowerCase().includes(campo.toLowerCase()))
    );

    if (camposFaltantes.length > 0) {
      return res.status(400).json({ 
        error: `No se encontraron los campos: ${camposFaltantes.join(', ')}` 
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      for (const row of data) {
        // Mapear campos (case insensitive)
        const dni = row.dni || row.DNI || row.Dni || '';
        const nombres = row.nombres || row.Nombres || row.NOMBRES || '';
        const campaña = row.campaña || row.Campaña || row.CAMPAÑA || row.campana || row.Campana || null;
        const cartera = row.cartera || row.Cartera || row.CARTERA || null;
        const sub_cartera = row.sub_cartera || row.Sub_Cartera || row.SUB_CARTERA || row.subcartera || null;
        const producto = row.producto || row.Producto || row.PRODUCTO || null;
        const capital = parseFloat(row.capital || row.Capital || row.CAPITAL || 0) || 0;
        const fecha_castigo = row.fecha_castigo || row.Fecha_Castigo || row.FECHA_CASTIGO || null;
        const direccion = row.direccion || row.Direccion || row.DIRECCION || null;

        if (!dni || !nombres) continue;

        const request = new sql.Request(transaction);
        await request
          .input('dni', sql.VarChar(8), dni.toString().substring(0, 8))
          .input('nombres', sql.VarChar, nombres)
          .input('campaña', sql.VarChar, campaña)
          .input('cartera', sql.VarChar, cartera)
          .input('sub_cartera', sql.VarChar, sub_cartera)
          .input('producto', sql.VarChar, producto)
          .input('capital', sql.Float, capital)
          .input('fecha_castigo', sql.Date, fecha_castigo ? new Date(fecha_castigo) : null)
          .input('direccion', sql.VarChar, direccion)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM cliente WHERE dni = @dni)
            BEGIN
              INSERT INTO cliente (dni, nombres, campaña, cartera, sub_cartera, producto, capital, fecha_castigo, direccion)
              VALUES (@dni, @nombres, @campaña, @cartera, @sub_cartera, @producto, @capital, @fecha_castigo, @direccion)
            END
          `);
      }

      await transaction.commit();
      res.json({ success: true, message: 'Importación exitosa', registros: data.length });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al importar clientes:', error);
    res.status(500).json({ 
      error: 'Error al importar clientes', 
      message: error.message 
    });
  } finally {
    // Limpiar archivo temporal
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// Importar asesores desde Excel
router.post('/asesores', upload.single('archivo'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Validar campos requeridos
    const camposRequeridos = ['dni', 'nombres'];
    const camposEncontrados = Object.keys(data[0]);
    const camposFaltantes = camposRequeridos.filter(campo => 
      !camposEncontrados.some(c => c.toLowerCase().includes(campo.toLowerCase()))
    );

    if (camposFaltantes.length > 0) {
      return res.status(400).json({ 
        error: `No se encontraron los campos: ${camposFaltantes.join(', ')}` 
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      for (const row of data) {
        const dni = row.dni || row.DNI || row.Dni || '';
        const nombres = row.nombres || row.Nombres || row.NOMBRES || '';

        if (!dni || !nombres) continue;

        const request = new sql.Request(transaction);
        await request
          .input('dni', sql.VarChar(8), dni.toString().substring(0, 8))
          .input('nombres', sql.VarChar, nombres)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM asesor WHERE dni = @dni)
            BEGIN
              INSERT INTO asesor (dni, nombres)
              VALUES (@dni, @nombres)
            END
          `);
      }

      await transaction.commit();
      res.json({ success: true, message: 'Importación exitosa', registros: data.length });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al importar asesores:', error);
    res.status(500).json({ 
      error: 'Error al importar asesores', 
      message: error.message 
    });
  } finally {
    // Limpiar archivo temporal
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

module.exports = router;


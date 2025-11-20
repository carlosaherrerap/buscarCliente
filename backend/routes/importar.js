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

    // Validar campos requeridos - Buscar los campos exactos del Excel
    const camposRequeridos = ['DNI', 'NOMBRE Y APELLIDOS'];
    const camposEncontrados = Object.keys(data[0]);
    
    // Función para buscar campo (case insensitive y con espacios)
    const buscarCampo = (nombreBuscado) => {
      return camposEncontrados.find(c => 
        c.trim().toUpperCase().replace(/\s+/g, ' ') === nombreBuscado.toUpperCase().trim() ||
        c.trim().toUpperCase().replace(/\s+/g, '') === nombreBuscado.toUpperCase().trim().replace(/\s+/g, '')
      );
    };
    
    const campoDNI = buscarCampo('DNI');
    const campoNombres = buscarCampo('NOMBRE Y APELLIDOS');
    
    if (!campoDNI) {
      return res.status(400).json({ 
        error: 'No se encontró el campo: DNI' 
      });
    }
    
    if (!campoNombres) {
      return res.status(400).json({ 
        error: 'No se encontró el campo: NOMBRE Y APELLIDOS' 
      });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      for (const row of data) {
        // Mapear campos exactos del Excel (case insensitive)
        const dni = row[campoDNI] || '';
        const nombres = row[campoNombres] || '';
        
        // Buscar campos opcionales (en el orden que aparecen en el Excel)
        const campoCartera = buscarCampo('CARTERA');
        const campoSubCartera = buscarCampo('SUB CARTERA');
        const campoProducto = buscarCampo('PRODUCTO');
        const campoCapital = buscarCampo('CAPITAL');
        const campoCampana = buscarCampo('CAMPAÑA') || buscarCampo('CAMPANA');
        const campoFechaCastigo = buscarCampo('FECHA CASTIGO') || buscarCampo('FECHA_CASTIGO');
        const campoDireccion = buscarCampo('DIRECCION COMPLETA') || buscarCampo('DIRECCIÓN COMPLETA') || buscarCampo('DIRECCION');
        
        const cartera = campoCartera ? (row[campoCartera] || null) : null;
        const sub_cartera = campoSubCartera ? (row[campoSubCartera] || null) : null;
        const producto = campoProducto ? (row[campoProducto] || null) : null;
        const capital = campoCapital ? (parseFloat(row[campoCapital]) || 0) : 0;
        const campaña = campoCampana ? (row[campoCampana] || null) : null;
        
        // Manejar fecha_castigo - puede venir como fecha de Excel o string
        let fecha_castigo = null;
        if (campoFechaCastigo && row[campoFechaCastigo]) {
          const fechaValue = row[campoFechaCastigo];
          if (fechaValue instanceof Date) {
            fecha_castigo = fechaValue;
          } else if (typeof fechaValue === 'string' && fechaValue.trim()) {
            // Intentar parsear string a fecha
            const fechaParsed = new Date(fechaValue);
            if (!isNaN(fechaParsed.getTime())) {
              fecha_castigo = fechaParsed;
            }
          } else if (typeof fechaValue === 'number') {
            // Fecha serial de Excel
            fecha_castigo = new Date((fechaValue - 25569) * 86400 * 1000);
          }
        }
        
        const direccion = campoDireccion ? (row[campoDireccion] || null) : null;

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
          .input('fecha_castigo', sql.Date, fecha_castigo)
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


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

//CAMPAÑA

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
    const camposRequeridos = ['DNI', 'NOMBRE Y APELLIDOS', 'NUMERO DE CUENTA'];
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
    const campoNumeroCuenta = buscarCampo('NUMERO DE CUENTA');
    
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
    
    if (!campoNumeroCuenta) {
      return res.status(400).json({ 
        error: 'No se encontró el campo: NUMERO DE CUENTA' 
      });
    }

    console.log('========================================');
    console.log('INICIO DE IMPORTACIÓN');
    console.log('========================================');
    console.log('Total de filas en Excel:', data.length);
    console.log('Campos encontrados en Excel:', Object.keys(data[0]));
    console.log('');

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    console.log('✓ Transacción iniciada');

    try {
      let filaProcesada = 0;
      for (const row of data) {
        filaProcesada++;
        console.log(`\n--- Procesando fila ${filaProcesada} ---`);
        
        // Mapear campos exactos del Excel (case insensitive)
        const dni = row[campoDNI] || '';
        const nombres = row[campoNombres] || '';
        console.log(`DNI: ${dni}, Nombres: ${nombres}`);
        
        // Buscar campos opcionales (en el orden que aparecen en el Excel)
        const campoCartera = buscarCampo('CARTERA');
        const campoSubCartera = buscarCampo('SUB CARTERA');
        const campoProducto = buscarCampo('PRODUCTO');
        const campoCapital = buscarCampo('CAPITAL');
        const campoDeudaTotal = buscarCampo('DEUDA TOTAL');
        const campoCampana = buscarCampo('CAMPAÑA') || buscarCampo('CAMPANA');
        const campoFechaCastigo = buscarCampo('FECHA CASTIGO') || buscarCampo('FECHA_CASTIGO');
        const campoDireccion = buscarCampo('DIRECCION COMPLETA') || buscarCampo('DIRECCIÓN COMPLETA') || buscarCampo('DIRECCION');
        
        console.log('Campos encontrados:');
        console.log(`  - NUMERO DE CUENTA: ${campoNumeroCuenta || 'NO ENCONTRADO'}`);
        console.log(`  - CARTERA: ${campoCartera || 'NO ENCONTRADO'}`);
        console.log(`  - SUB CARTERA: ${campoSubCartera || 'NO ENCONTRADO'}`);
        console.log(`  - PRODUCTO: ${campoProducto || 'NO ENCONTRADO'}`);
        console.log(`  - CAPITAL: ${campoCapital || 'NO ENCONTRADO'}`);
        console.log(`  - DEUDA TOTAL: ${campoDeudaTotal || 'NO ENCONTRADO'}`);
        console.log(`  - CAMPAÑA/CAMPANA: ${campoCampana || 'NO ENCONTRADO'}`);
        console.log(`  - FECHA CASTIGO: ${campoFechaCastigo || 'NO ENCONTRADO'}`);
        console.log(`  - DIRECCION: ${campoDireccion || 'NO ENCONTRADO'}`);
        
        // Convertir valores a string y manejar null/undefined correctamente
        const numero_cuenta = campoNumeroCuenta && row[campoNumeroCuenta] ? String(row[campoNumeroCuenta]).trim() : '';
        const nombreCartera = campoCartera && row[campoCartera] ? String(row[campoCartera]).trim() || null : null;
        const sub_cartera = campoSubCartera && row[campoSubCartera] ? String(row[campoSubCartera]).trim() || null : null;
        const producto = campoProducto && row[campoProducto] ? String(row[campoProducto]).trim() || null : null;
        const capital = campoCapital && row[campoCapital] ? (parseFloat(row[campoCapital]) || 0) : 0;
        const deuda_total = campoDeudaTotal && row[campoDeudaTotal] ? (parseFloat(row[campoDeudaTotal]) || 0) : 0;
        const campana = campoCampana && row[campoCampana] ? String(row[campoCampana]).trim() || null : null;
        
        console.log('Valores extraídos:');
        console.log(`  - numero_cuenta: ${numero_cuenta}`);
        console.log(`  - nombreCartera: ${nombreCartera}`);
        console.log(`  - sub_cartera: ${sub_cartera}`);
        console.log(`  - producto: ${producto}`);
        console.log(`  - capital: ${capital}`);
        console.log(`  - deuda_total: ${deuda_total}`);
        console.log(`  - campana: ${campana}`);
        
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
        console.log(`  - fecha_castigo: ${fecha_castigo}`);
        
        const direccion = campoDireccion && row[campoDireccion] ? String(row[campoDireccion]).trim() || null : null;
        console.log(`  - direccion: ${direccion}`);

        if (!dni || !nombres || !numero_cuenta) {
          console.log('⚠️  Fila omitida: DNI, nombres o número de cuenta vacíos');
          continue;
        }

        if (!nombreCartera) {
          console.log('⚠️  Fila omitida: Cartera es requerida');
          continue;
        }

        console.log('📝 Preparando consultas SQL...');

        // 1. Crear o obtener cliente
        let request = new sql.Request(transaction);
        let clienteResult = await request
          .input('dni', sql.VarChar(8), dni.toString().substring(0, 8))
          .input('nombres', sql.VarChar, nombres)
          .input('direccion', sql.VarChar, direccion || null)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM cliente WHERE dni = @dni)
            BEGIN
              INSERT INTO cliente (dni, nombres, direccion)
              VALUES (@dni, @nombres, @direccion)
            END
            SELECT id FROM cliente WHERE dni = @dni
          `);
        const id_cliente = clienteResult.recordset[0].id;
        console.log(`✓ Cliente obtenido/creado: ID ${id_cliente}`);

        // 2. Crear o obtener cartera (tipo por defecto: 'castigada')
        request = new sql.Request(transaction);
        let carteraResult = await request
          .input('nombre', sql.VarChar, nombreCartera)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM cartera WHERE nombre = @nombre)
            BEGIN
              INSERT INTO cartera (nombre, tipo)
              VALUES (@nombre, 'castigada')
            END
            SELECT id FROM cartera WHERE nombre = @nombre
          `);
        const id_cartera = carteraResult.recordset[0].id;
        console.log(`✓ Cartera obtenida/creada: ID ${id_cartera} (${nombreCartera})`);

        // 3. Crear o actualizar cuenta
        request = new sql.Request(transaction);
        await request
          .input('id_cliente', sql.Int, id_cliente)
          .input('numero_cuenta', sql.VarChar, numero_cuenta)
          .input('id_cartera', sql.Int, id_cartera)
          .input('capital', sql.Float, capital)
          .input('deuda_total', sql.Float, deuda_total)
          .input('producto', sql.VarChar, producto || null)
          .input('sub_cartera', sql.VarChar, sub_cartera || null)
          .input('campana', sql.VarChar, campana || null)
          .input('fecha_castigo', sql.Date, fecha_castigo || null)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM cuenta WHERE id_cliente = @id_cliente AND numero_cuenta = @numero_cuenta)
            BEGIN
              INSERT INTO cuenta (id_cliente, numero_cuenta, id_cartera, capital, deuda_total, producto, sub_cartera, campana, fecha_castigo)
              VALUES (@id_cliente, @numero_cuenta, @id_cartera, @capital, @deuda_total, @producto, @sub_cartera, @campana, @fecha_castigo)
            END
            ELSE
            BEGIN
              UPDATE cuenta 
              SET id_cartera = @id_cartera,
                  capital = @capital,
                  deuda_total = @deuda_total,
                  producto = @producto,
                  sub_cartera = @sub_cartera,
                  campana = @campana,
                  fecha_castigo = @fecha_castigo
              WHERE id_cliente = @id_cliente AND numero_cuenta = @numero_cuenta
            END
          `);
        console.log(`✓ Cuenta ${numero_cuenta} creada/actualizada correctamente`);
      }

      console.log('\n========================================');
      console.log('✓ Todas las filas procesadas correctamente');
      console.log('🔄 Haciendo commit de la transacción...');
      await transaction.commit();
      console.log('✅ Transacción confirmada exitosamente');
      console.log('========================================\n');
      res.json({ success: true, message: 'Importación exitosa', registros: data.length });
    } catch (error) {
      console.error('\n❌ ERROR EN LA TRANSACCIÓN:');
      console.error('Mensaje:', error.message);
      console.error('Código:', error.code);
      console.error('Número:', error.number);
      console.error('Línea:', error.lineNumber);
      console.error('Estado:', error.state);
      if (error.originalError) {
        console.error('Error original:', error.originalError.message);
      }
      if (error.info) {
        console.error('Info del error:', error.info);
      }
      console.error('🔄 Haciendo rollback de la transacción...');
      await transaction.rollback();
      console.error('========================================\n');
      throw error;
    }
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ ERROR GENERAL AL IMPORTAR CLIENTES');
    console.error('========================================');
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) console.error('Código:', error.code);
    if (error.number) console.error('Número SQL:', error.number);
    if (error.lineNumber) console.error('Línea SQL:', error.lineNumber);
    if (error.state) console.error('Estado SQL:', error.state);
    console.error('========================================\n');
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


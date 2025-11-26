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
        const campoFechaCastigo = buscarCampo('FECHA CASTIGO') || buscarCampo('FECHA_CASTIGO') || buscarCampo('FECHA CASTIGO') || buscarCampo('FECHA DE CASTIGO');
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
        if (campoFechaCastigo && row[campoFechaCastigo] !== undefined && row[campoFechaCastigo] !== null && row[campoFechaCastigo] !== '') {
          const fechaValue = row[campoFechaCastigo];
          console.log(`  - Valor crudo de FECHA CASTIGO: ${fechaValue} (tipo: ${typeof fechaValue})`);
          
          try {
            if (fechaValue instanceof Date) {
              fecha_castigo = fechaValue;
              console.log(`  - Fecha parseada (Date): ${fecha_castigo}`);
            } else if (typeof fechaValue === 'string' && fechaValue.trim()) {
              // Intentar parsear string a fecha (varios formatos)
              const fechaStr = fechaValue.trim();
              let fechaParsed = null;
              
              // Detectar formato basado en el patrón
              // Formato YYYY-MM-DD o YYYY/MM/DD
              if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(fechaStr)) {
                // Año primero = YYYY-MM-DD
                fechaParsed = new Date(fechaStr);
                console.log(`  - Formato detectado: YYYY-MM-DD`);
              }
              // Formato DD-MM-YYYY o DD/MM/YYYY (día-mes-año)
              else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(fechaStr)) {
                const parts = fechaStr.split(/[\/\-]/);
                const dia = parseInt(parts[0], 10);
                const mes = parseInt(parts[1], 10);
                const año = parseInt(parts[2], 10);
                
                // Validar que el día sea <= 31 y mes <= 12 para determinar formato
                // Si día > 12, definitivamente es DD-MM-YYYY
                if (dia > 12) {
                  fechaParsed = new Date(año, mes - 1, dia);
                  console.log(`  - Formato detectado: DD-MM-YYYY (día=${dia}, mes=${mes}, año=${año})`);
                }
                // Si día <= 12, podría ser DD-MM-YYYY o MM-DD-YYYY
                // Asumimos DD-MM-YYYY (formato más común en español)
                else {
                  fechaParsed = new Date(año, mes - 1, dia);
                  console.log(`  - Formato detectado: DD-MM-YYYY (asumido, día=${dia}, mes=${mes}, año=${año})`);
                }
              }
              // Intentar parseo directo como último recurso
              else {
                fechaParsed = new Date(fechaStr);
                console.log(`  - Formato: parseo directo`);
              }
              
              if (fechaParsed && !isNaN(fechaParsed.getTime())) {
                fecha_castigo = fechaParsed;
                console.log(`  - Fecha parseada (String): ${fecha_castigo.toISOString().split('T')[0]}`);
              } else {
                console.log(`  ⚠️  No se pudo parsear la fecha: ${fechaStr}`);
              }
            } else if (typeof fechaValue === 'number') {
              // Fecha serial de Excel (número de días desde 1900-01-01)
              // Excel usa 1900-01-01 como día 1, pero tiene un bug: considera 1900 como año bisiesto
              // Fórmula correcta: (número - 25569) * 86400 * 1000
              const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
              fecha_castigo = new Date(excelEpoch.getTime() + fechaValue * 86400 * 1000);
              console.log(`  - Fecha parseada (Excel serial ${fechaValue}): ${fecha_castigo}`);
            }
          } catch (error) {
            console.error(`  ❌ Error al procesar fecha: ${error.message}`);
          }
        } else {
          console.log(`  - fecha_castigo: NULL (campo no encontrado o vacío)`);
        }
        console.log(`  - fecha_castigo final: ${fecha_castigo ? fecha_castigo.toISOString().split('T')[0] : 'NULL'}`);
        
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
        // Formatear fecha_castigo para SQL (solo la parte de fecha, sin hora)
        let fechaCastigoSQL = null;
        if (fecha_castigo) {
          try {
            // Asegurar que sea un objeto Date válido
            const fecha = fecha_castigo instanceof Date ? fecha_castigo : new Date(fecha_castigo);
            if (!isNaN(fecha.getTime())) {
              // Formatear como YYYY-MM-DD para SQL Server
              const year = fecha.getFullYear();
              const month = String(fecha.getMonth() + 1).padStart(2, '0');
              const day = String(fecha.getDate()).padStart(2, '0');
              fechaCastigoSQL = `${year}-${month}-${day}`;
              console.log(`  ✓ Fecha formateada para SQL: ${fechaCastigoSQL}`);
            } else {
              console.log(`  ⚠️  Fecha inválida, se guardará como NULL`);
            }
          } catch (error) {
            console.error(`  ❌ Error al formatear fecha: ${error.message}`);
          }
        }
        
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
          .input('fecha_castigo', sql.Date, fechaCastigoSQL || null)
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

    const camposEncontrados = Object.keys(data[0]);
    console.log('Campos encontrados en Excel:', camposEncontrados);

    // Función para buscar campo (case insensitive y con espacios)
    const buscarCampo = (nombreBuscado) => {
      return camposEncontrados.find(c => 
        c.trim().toUpperCase().replace(/\s+/g, ' ') === nombreBuscado.toUpperCase().trim() ||
        c.trim().toUpperCase().replace(/\s+/g, '') === nombreBuscado.toUpperCase().trim().replace(/\s+/g, '')
      );
    };

    // Validar campos requeridos
    const campoDNI = buscarCampo('DNI');
    const campoNombre = buscarCampo('NOMBRE');

    if (!campoDNI) {
      return res.status(400).json({ 
        error: 'No se encontró el campo: DNI' 
      });
    }

    if (!campoNombre) {
      return res.status(400).json({ 
        error: 'No se encontró el campo: NOMBRE' 
      });
    }

    // Buscar campos opcionales
    const campoCargo = buscarCampo('CARGO');
    const campoMeta = buscarCampo('META');
    const campoEstado = buscarCampo('ESTADO');
    const campoFechaIngreso = buscarCampo('FECHA INGRESO');
    const campoFechaSalida = buscarCampo('FECHA SALIDA');

    console.log('Campos encontrados:');
    console.log('  - DNI:', campoDNI || 'NO ENCONTRADO');
    console.log('  - NOMBRE:', campoNombre || 'NO ENCONTRADO');
    console.log('  - CARGO:', campoCargo || 'NO ENCONTRADO');
    console.log('  - META:', campoMeta || 'NO ENCONTRADO');
    console.log('  - ESTADO:', campoEstado || 'NO ENCONTRADO');
    console.log('  - FECHA INGRESO:', campoFechaIngreso || 'NO ENCONTRADO');
    console.log('  - FECHA SALIDA:', campoFechaSalida || 'NO ENCONTRADO');

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    console.log('✓ Transacción iniciada para importación de asesores');

    try {
      let filaProcesada = 0;
      for (const row of data) {
        filaProcesada++;
        console.log(`\n--- Procesando fila ${filaProcesada} ---`);

        const dni = campoDNI && row[campoDNI] ? String(row[campoDNI]).trim() : '';
        const nombre = campoNombre && row[campoNombre] ? String(row[campoNombre]).trim() : '';
        const cargo = campoCargo && row[campoCargo] ? String(row[campoCargo]).trim() || null : null;
        const meta = campoMeta && row[campoMeta] ? (parseFloat(String(row[campoMeta]).replace(/[^\d.-]/g, '')) || null) : null;
        const estado = campoEstado && row[campoEstado] ? String(row[campoEstado]).trim().toUpperCase() : 'ACTIVO';
        
        // Validar que estado sea ACTIVO o INACTIVO
        const estadoFinal = (estado === 'ACTIVO' || estado === 'INACTIVO') ? estado : 'ACTIVO';

        // Manejar fecha_ingreso
        let fecha_ingreso = null;
        if (campoFechaIngreso && row[campoFechaIngreso]) {
          const fechaValue = row[campoFechaIngreso];
          if (fechaValue instanceof Date) {
            fecha_ingreso = fechaValue;
          } else if (typeof fechaValue === 'string' && fechaValue.trim()) {
            const fechaParsed = new Date(fechaValue);
            if (!isNaN(fechaParsed.getTime())) {
              fecha_ingreso = fechaParsed;
            }
          } else if (typeof fechaValue === 'number') {
            fecha_ingreso = new Date((fechaValue - 25569) * 86400 * 1000);
          }
        }

        // Manejar fecha_salida (debe ser NULL si estado es ACTIVO)
        let fecha_salida = null;
        if (estadoFinal === 'INACTIVO' && campoFechaSalida && row[campoFechaSalida]) {
          const fechaValue = row[campoFechaSalida];
          if (fechaValue instanceof Date) {
            fecha_salida = fechaValue;
          } else if (typeof fechaValue === 'string' && fechaValue.trim()) {
            const fechaParsed = new Date(fechaValue);
            if (!isNaN(fechaParsed.getTime())) {
              fecha_salida = fechaParsed;
            }
          } else if (typeof fechaValue === 'number') {
            fecha_salida = new Date((fechaValue - 25569) * 86400 * 1000);
          }
        }
        // Si estado es ACTIVO, forzar fecha_salida a NULL
        if (estadoFinal === 'ACTIVO') {
          fecha_salida = null;
        }

        console.log('Valores extraídos:');
        console.log(`  - dni: ${dni}`);
        console.log(`  - nombre: ${nombre}`);
        console.log(`  - cargo: ${cargo || 'NULL'}`);
        console.log(`  - meta: ${meta || 'NULL'}`);
        console.log(`  - estado: ${estadoFinal}`);
        console.log(`  - fecha_ingreso: ${fecha_ingreso || 'NULL'}`);
        console.log(`  - fecha_salida: ${fecha_salida || 'NULL'}`);

        if (!dni || !nombre) {
          console.log('⚠️  Fila omitida: DNI o nombre vacíos');
          continue;
        }

        const request = new sql.Request(transaction);
        await request
          .input('dni', sql.VarChar(8), dni.toString().substring(0, 8))
          .input('nombre', sql.VarChar, nombre)
          .input('cargo', sql.VarChar, cargo || null)
          .input('meta', sql.Float, meta || null)
          .input('estado', sql.VarChar, estadoFinal)
          .input('fecha_ingreso', sql.Date, fecha_ingreso || null)
          .input('fecha_salida', sql.Date, fecha_salida || null)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM asesor WHERE dni = @dni)
            BEGIN
              INSERT INTO asesor (dni, nombre, cargo, meta, estado, fecha_ingreso, fecha_salida)
              VALUES (@dni, @nombre, @cargo, @meta, @estado, @fecha_ingreso, @fecha_salida)
            END
            ELSE
            BEGIN
              UPDATE asesor 
              SET nombre = @nombre,
                  cargo = @cargo,
                  meta = @meta,
                  estado = @estado,
                  fecha_ingreso = @fecha_ingreso,
                  fecha_salida = @fecha_salida
              WHERE dni = @dni
            END
          `);
        console.log(`✓ Asesor ${dni} procesado correctamente`);
      }

      await transaction.commit();
      console.log('✅ Transacción confirmada exitosamente');
      res.json({ success: true, message: 'Importación exitosa', registros: data.length });
    } catch (error) {
      console.error('❌ ERROR EN LA TRANSACCIÓN:', error);
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


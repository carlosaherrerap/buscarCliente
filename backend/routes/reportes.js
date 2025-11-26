const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { getPool, sql } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Obtener pagos con filtros
router.post('/pagos', async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      tipo_fecha, 
      cartera, 
      campana, 
      id_asesor,
      filtro_cartera,
      filtro_campana,
      filtro_asesor
    } = req.body;

    const pool = await getPool();
    let query = `
      SELECT 
        cl.id as cliente_id,
        cl.dni,
        cl.nombres,
        cl.direccion,
        cu.id as cuenta_id,
        cu.numero_cuenta,
        cu.campana,
        cu.sub_cartera,
        cu.producto,
        cu.capital,
        cu.deuda_total,
        cu.fecha_castigo,
        ca.id as cartera_id,
        ca.nombre as cartera,
        ca.tipo as cartera_tipo,
        ac.id as asignacion_id,
        ac.importe,
        ac.fecha_pago,
        ac.tipo_pago,
        ac.voucher,
        a.nombre as asesor_nombre,
        a.dni as asesor_dni
      FROM asignacion_cliente ac
      INNER JOIN cuenta cu ON ac.id_cuenta = cu.id
      INNER JOIN cliente cl ON cu.id_cliente = cl.id
      INNER JOIN cartera ca ON cu.id_cartera = ca.id
      INNER JOIN asesor a ON ac.id_asesor = a.id
      WHERE 1=1
    `;

    const request = pool.request();

    // Filtro de fechas (siempre aplicado)
    if (tipo_fecha === 'rango') {
      if (fecha_inicio) {
        query += ' AND ac.fecha_pago >= @fecha_inicio';
        request.input('fecha_inicio', sql.Date, fecha_inicio);
      }
      if (fecha_fin) {
        query += ' AND ac.fecha_pago <= @fecha_fin';
        request.input('fecha_fin', sql.Date, fecha_fin);
      }
    } else if (tipo_fecha === 'dia' && fecha_inicio) {
      query += ' AND CAST(ac.fecha_pago AS DATE) = CAST(@fecha_inicio AS DATE)';
      request.input('fecha_inicio', sql.Date, fecha_inicio);
    }

    // Filtros opcionales (solo si el checkbox está activo)
    if (filtro_cartera && cartera) {
      query += ' AND ca.id = @cartera';
      request.input('cartera', sql.Int, cartera);
    }

    if (filtro_asesor && id_asesor) {
      query += ' AND ac.id_asesor = @id_asesor';
      request.input('id_asesor', sql.Int, id_asesor);
    }

    query += ' ORDER BY ac.fecha_pago DESC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error al obtener pagos', message: error.message });
  }
});

// Descargar pagos como Excel
router.post('/pagos/descargar', async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      tipo_fecha, 
      cartera, 
      campana, 
      id_asesor,
      filtro_cartera,
      filtro_campana,
      filtro_asesor
    } = req.body;

    const pool = await getPool();
    // Obtener la URL base del servidor desde el request
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:8080';
    const baseUrl = `${protocol}://${host}`;
    
    let query = `
      SELECT 
        cl.dni as 'DNI',
        cl.nombres as 'NOMBRES COMPLETOS',
        cu.numero_cuenta as 'CUENTA',
        cu.campana as 'CAMPAÑA',
        ca.nombre as 'CARTERA',
        ca.id as 'ID CARTERA',
        cu.sub_cartera as 'SUB CARTERA',
        cu.producto as 'PRODUCTO',
        cu.capital as 'CAPITAL',
        cu.deuda_total as 'DEUDA TOTAL',
        cu.fecha_castigo as 'FECHA CASTIGO',
        a.dni as 'DNI ASESOR',
        a.nombre as 'NOMBRE ASESOR',
        ac.importe as 'IMPORTE',
        ac.fecha_pago as 'FECHA PAGO',
        ac.tipo_pago as 'TIPO PAGO',
        ac.voucher as 'VOUCHER'
      FROM asignacion_cliente ac
      INNER JOIN cuenta cu ON ac.id_cuenta = cu.id
      INNER JOIN cliente cl ON cu.id_cliente = cl.id
      INNER JOIN cartera ca ON cu.id_cartera = ca.id
      INNER JOIN asesor a ON ac.id_asesor = a.id
      WHERE 1=1
    `;

    const request = pool.request();

    // Aplicar mismos filtros que en /pagos
    if (tipo_fecha === 'rango') {
      if (fecha_inicio) {
        query += ' AND ac.fecha_pago >= @fecha_inicio';
        request.input('fecha_inicio', sql.Date, fecha_inicio);
      }
      if (fecha_fin) {
        query += ' AND ac.fecha_pago <= @fecha_fin';
        request.input('fecha_fin', sql.Date, fecha_fin);
      }
    } else if (tipo_fecha === 'dia' && fecha_inicio) {
      query += ' AND CAST(ac.fecha_pago AS DATE) = CAST(@fecha_inicio AS DATE)';
      request.input('fecha_inicio', sql.Date, fecha_inicio);
    }

    if (filtro_cartera && cartera) {
      query += ' AND ca.id = @cartera';
      request.input('cartera', sql.Int, cartera);
    }

    if (filtro_asesor && id_asesor) {
      query += ' AND ac.id_asesor = @id_asesor';
      request.input('id_asesor', sql.Int, id_asesor);
    }

    query += ' ORDER BY ac.fecha_pago DESC';

    const result = await request.query(query);
    
    // Crear workbook con ExcelJS para poder usar hipervínculos
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pagos');
    
    // Definir columnas con anchos
    worksheet.columns = [
      { header: 'DNI', key: 'DNI', width: 12 },
      { header: 'NOMBRES COMPLETOS', key: 'NOMBRES COMPLETOS', width: 25 },
      { header: 'CUENTA', key: 'CUENTA', width: 15 },
      { header: 'CAMPAÑA', key: 'CAMPAÑA', width: 15 },
      { header: 'CARTERA', key: 'CARTERA', width: 15 },
      { header: 'ID CARTERA', key: 'ID CARTERA', width: 12 },
      { header: 'SUB CARTERA', key: 'SUB CARTERA', width: 15 },
      { header: 'PRODUCTO', key: 'PRODUCTO', width: 15 },
      { header: 'CAPITAL', key: 'CAPITAL', width: 12 },
      { header: 'DEUDA TOTAL', key: 'DEUDA TOTAL', width: 12 },
      { header: 'FECHA CASTIGO', key: 'FECHA CASTIGO', width: 15 },
      { header: 'DNI ASESOR', key: 'DNI ASESOR', width: 12 },
      { header: 'NOMBRE ASESOR', key: 'NOMBRE ASESOR', width: 20 },
      { header: 'IMPORTE', key: 'IMPORTE', width: 12 },
      { header: 'FECHA PAGO', key: 'FECHA PAGO', width: 12 },
      { header: 'TIPO PAGO', key: 'TIPO PAGO', width: 12 },
      { header: 'VOUCHER', key: 'VOUCHER', width: 15 }
    ];
    
    // Estilo para el encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Procesar cada fila de datos
    result.recordset.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque la fila 1 es el encabezado
      const excelRow = worksheet.addRow({
        'DNI': row.DNI,
        'NOMBRES COMPLETOS': row['NOMBRES COMPLETOS'],
        'CUENTA': row.CUENTA,
        'CAMPAÑA': row.CAMPAÑA,
        'CARTERA': row.CARTERA,
        'ID CARTERA': row['ID CARTERA'],
        'SUB CARTERA': row['SUB CARTERA'],
        'PRODUCTO': row.PRODUCTO,
        'CAPITAL': row.CAPITAL,
        'DEUDA TOTAL': row['DEUDA TOTAL'],
        'FECHA CASTIGO': row['FECHA CASTIGO'] ? new Date(row['FECHA CASTIGO']) : null,
        'DNI ASESOR': row['DNI ASESOR'],
        'NOMBRE ASESOR': row['NOMBRE ASESOR'],
        'IMPORTE': row.IMPORTE,
        'FECHA PAGO': row['FECHA PAGO'] ? new Date(row['FECHA PAGO']) : null,
        'TIPO PAGO': row['TIPO PAGO'],
        'VOUCHER': '' // Se llenará con el hipervínculo
      });
      
      // Formatear fechas
      const fechaCastigoCell = excelRow.getCell('FECHA CASTIGO');
      if (fechaCastigoCell.value) {
        fechaCastigoCell.numFmt = 'dd/mm/yyyy';
      }
      
      const fechaPagoCell = excelRow.getCell('FECHA PAGO');
      if (fechaPagoCell.value) {
        fechaPagoCell.numFmt = 'dd/mm/yyyy';
      }
      
      // Formatear números
      excelRow.getCell('CAPITAL').numFmt = '#,##0.00';
      excelRow.getCell('DEUDA TOTAL').numFmt = '#,##0.00';
      excelRow.getCell('IMPORTE').numFmt = '#,##0.00';
      
      // Agregar botón "MOSTRAR" con hipervínculo en la columna VOUCHER
      const voucherCell = excelRow.getCell('VOUCHER');
      if (row.VOUCHER && row.VOUCHER.trim() !== '') {
        // Extraer solo el nombre del archivo
        let fileName = row.VOUCHER;
        if (fileName.includes('/')) {
          fileName = fileName.split('/').pop();
        }
        // Crear URL completa
        const voucherUrl = `${baseUrl}/api/reportes/voucher/${encodeURIComponent(fileName)}`;
        
        // Crear hipervínculo con fórmula HYPERLINK
        voucherCell.value = { formula: `HYPERLINK("${voucherUrl}","MOSTRAR")` };
        
        // Estilo del botón
        voucherCell.font = { 
          color: { argb: 'FFFFFFFF' }, 
          bold: true,
          underline: true
        };
        voucherCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0070C0' } // Azul
        };
        voucherCell.alignment = { 
          vertical: 'middle', 
          horizontal: 'center' 
        };
        voucherCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      } else {
        voucherCell.value = '-';
        voucherCell.alignment = { horizontal: 'center' };
      }
    });
    
    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pagos.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error al descargar pagos:', error);
    res.status(500).json({ error: 'Error al descargar pagos', message: error.message });
  }
});

// Ranking de asesores
router.post('/ranking', async (req, res) => {
  try {
    const { dni, nombres, tipo, fecha_inicio, fecha_fin, tipo_fecha } = req.body;
    const pool = await getPool();

    // Buscar asesor
    let queryAsesor = 'SELECT id FROM asesor WHERE 1=1';
    const requestAsesor = pool.request();

    if (tipo === 'dni' && dni) {
      queryAsesor += ' AND dni = @dni';
      requestAsesor.input('dni', sql.VarChar(8), dni);
    } else if (tipo === 'nombres' && nombres) {
      queryAsesor += ' AND nombre LIKE @nombre';
      requestAsesor.input('nombre', sql.VarChar, `%${nombres}%`);
    }

    const asesorResult = await requestAsesor.query(queryAsesor);
    
    if (asesorResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Asesor no encontrado' });
    }

    const idAsesor = asesorResult.recordset[0].id;

    // Calcular estadísticas
    let queryStats = `
      SELECT 
        COUNT(DISTINCT cu.id_cliente) as total_clientes,
        SUM(ac.importe) as total_pagos,
        COUNT(ac.id) as cantidad_pagos
      FROM asignacion_cliente ac
      INNER JOIN cuenta cu ON ac.id_cuenta = cu.id
      WHERE ac.id_asesor = @id_asesor
    `;

    const requestStats = pool.request();
    requestStats.input('id_asesor', sql.Int, idAsesor);

    if (tipo_fecha === 'rango') {
      if (fecha_inicio) {
        queryStats += ' AND ac.fecha_pago >= @fecha_inicio';
        requestStats.input('fecha_inicio', sql.Date, fecha_inicio);
      }
      if (fecha_fin) {
        queryStats += ' AND ac.fecha_pago <= @fecha_fin';
        requestStats.input('fecha_fin', sql.Date, fecha_fin);
      }
    } else if (tipo_fecha === 'dia' && fecha_inicio) {
      queryStats += ' AND CAST(ac.fecha_pago AS DATE) = CAST(@fecha_inicio AS DATE)';
      requestStats.input('fecha_inicio', sql.Date, fecha_inicio);
    }

    const statsResult = await requestStats.query(queryStats);
    const stats = statsResult.recordset[0];

    // Obtener total de metas (asumiendo que hay una tabla de metas)
    // Por ahora, usaremos un valor fijo o calculado
    const totalMetas = 0; // TODO: Implementar tabla de metas

    const totalPagos = parseFloat(stats.total_pagos) || 0;
    const rate = totalMetas > 0 ? (totalPagos / totalMetas) * 100 : 0;

    res.json({
      id_asesor,
      total_clientes: stats.total_clientes || 0,
      total_pagos: totalPagos,
      total_metas: totalMetas,
      rate: rate.toFixed(2)
    });
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking', message: error.message });
  }
});

// Descargar datos de cliente y asignación
router.post('/cliente-asignacion/descargar', async (req, res) => {
  try {
    const { id_cliente } = req.body;
    const pool = await getPool();

    const query = `
      SELECT 
        cl.id as 'ID Cliente',
        cl.dni as 'DNI',
        cl.nombres as 'Nombres',
        cl.direccion as 'Dirección',
        cu.id as 'ID Cuenta',
        cu.numero_cuenta as 'Número de Cuenta',
        cu.campana as 'Campaña',
        ca.nombre as 'Cartera',
        ca.tipo as 'Tipo Cartera',
        cu.sub_cartera as 'Sub Cartera',
        cu.producto as 'Producto',
        cu.capital as 'Capital',
        cu.deuda_total as 'Deuda Total',
        cu.fecha_castigo as 'Fecha Castigo',
        a.dni as 'DNI Asesor',
        a.nombre as 'Nombre Asesor',
        ac.importe as 'Importe',
        ac.fecha_pago as 'Fecha Pago',
        ac.tipo_pago as 'Tipo Pago',
        ac.voucher as 'Voucher'
      FROM cliente cl
      INNER JOIN cuenta cu ON cl.id = cu.id_cliente
      INNER JOIN cartera ca ON cu.id_cartera = ca.id
      LEFT JOIN asignacion_cliente ac ON cu.id = ac.id_cuenta
      LEFT JOIN asesor a ON ac.id_asesor = a.id
      WHERE cl.id = @id_cliente
      ORDER BY cu.numero_cuenta, ac.fecha_pago DESC
    `;

    const result = await pool.request()
      .input('id_cliente', sql.Int, id_cliente)
      .query(query);

    // Convertir a Excel
    const worksheet = XLSX.utils.json_to_sheet(result.recordset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cliente y Asignaciones');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cliente_${id_cliente}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Error al descargar datos:', error);
    res.status(500).json({ error: 'Error al descargar datos', message: error.message });
  }
});

// Ruta para visualizar voucher (PDF o imagen)
router.get('/voucher/:filename(*)', (req, res) => {
  try {
    const filename = req.params.filename;
    // Asegurar que el archivo esté en la carpeta uploads
    const isDocker = process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');
    const uploadsPath = isDocker 
      ? path.join(__dirname, '../uploads')
      : path.join(__dirname, '../../uploads');
    
    const filePath = path.join(uploadsPath, filename);
    
    // Validar que el archivo esté dentro de uploads (seguridad)
    const normalizedPath = path.normalize(filePath);
    const normalizedUploads = path.normalize(uploadsPath);
    
    if (!normalizedPath.startsWith(normalizedUploads)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Determinar tipo de contenido
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filename)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error al servir voucher:', error);
    res.status(500).json({ error: 'Error al servir archivo', message: error.message });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
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
    
    // Procesar los datos para agregar URLs en la columna VOUCHER
    const processedData = result.recordset.map(row => {
      const processedRow = { ...row };
      // Si hay voucher, crear una URL completa al servidor
      if (processedRow.VOUCHER && processedRow.VOUCHER.trim() !== '') {
        // Extraer solo el nombre del archivo de la ruta (puede ser "uploads/archivo.pdf" o solo "archivo.pdf")
        let fileName = processedRow.VOUCHER;
        if (fileName.includes('/')) {
          fileName = fileName.split('/').pop();
        }
        // Crear URL completa para acceder al voucher (página HTML que muestra el voucher)
        const voucherUrl = `${baseUrl}/voucher.html?file=${encodeURIComponent(fileName)}`;
        processedRow.VOUCHER = voucherUrl;
      }
      return processedRow;
    });
    
    // Convertir a Excel
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    
    // Agregar ancho de columnas para mejor visualización
    const colWidths = [
      { wch: 12 }, // DNI
      { wch: 25 }, // NOMBRES COMPLETOS
      { wch: 15 }, // CUENTA
      { wch: 15 }, // CAMPAÑA
      { wch: 15 }, // CARTERA
      { wch: 12 }, // ID CARTERA
      { wch: 15 }, // SUB CARTERA
      { wch: 15 }, // PRODUCTO
      { wch: 12 }, // CAPITAL
      { wch: 12 }, // DEUDA TOTAL
      { wch: 15 }, // FECHA CASTIGO
      { wch: 12 }, // DNI ASESOR
      { wch: 20 }, // NOMBRE ASESOR
      { wch: 12 }, // IMPORTE
      { wch: 12 }, // FECHA PAGO
      { wch: 12 }, // TIPO PAGO
      { wch: 50 }  // VOUCHER (URL larga)
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
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


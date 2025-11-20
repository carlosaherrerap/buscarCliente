const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { getPool, sql } = require('../config/database');

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
        c.id,
        c.dni,
        c.nombres,
        c.campana,
        c.cartera,
        c.sub_cartera,
        c.producto,
        c.capital,
        c.fecha_castigo,
        c.direccion,
        ac.id as asignacion_id,
        ac.importe,
        ac.fecha_pago,
        ac.tipo_pago,
        ac.voucher,
        a.nombres as asesor_nombre,
        a.dni as asesor_dni
      FROM asignacion_cliente ac
      INNER JOIN cliente c ON ac.id_cliente = c.id
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
      query += ' AND c.cartera = @cartera';
      request.input('cartera', sql.VarChar, cartera);
    }

    if (filtro_campana && campana) {
      query += ' AND c.campana = @campana';
      request.input('campana', sql.VarChar, campana);
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
    let query = `
      SELECT 
        c.dni as 'DNI Cliente',
        c.nombres as 'Nombres Cliente',
        c.campana as 'Campaña',
        c.cartera as 'Cartera',
        c.sub_cartera as 'Sub Cartera',
        c.producto as 'Producto',
        c.capital as 'Capital',
        a.dni as 'DNI Asesor',
        a.nombres as 'Nombre Asesor',
        ac.importe as 'Importe',
        ac.fecha_pago as 'Fecha Pago',
        ac.tipo_pago as 'Tipo Pago',
        ac.voucher as 'Voucher'
      FROM asignacion_cliente ac
      INNER JOIN cliente c ON ac.id_cliente = c.id
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
      query += ' AND c.cartera = @cartera';
      request.input('cartera', sql.VarChar, cartera);
    }

    if (filtro_campana && campana) {
      query += ' AND c.campana = @campana';
      request.input('campana', sql.VarChar, campana);
    }

    if (filtro_asesor && id_asesor) {
      query += ' AND ac.id_asesor = @id_asesor';
      request.input('id_asesor', sql.Int, id_asesor);
    }

    query += ' ORDER BY ac.fecha_pago DESC';

    const result = await request.query(query);
    
    // Convertir a Excel
    const worksheet = XLSX.utils.json_to_sheet(result.recordset);
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
      queryAsesor += ' AND nombres LIKE @nombres';
      requestAsesor.input('nombres', sql.VarChar, `%${nombres}%`);
    }

    const asesorResult = await requestAsesor.query(queryAsesor);
    
    if (asesorResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Asesor no encontrado' });
    }

    const idAsesor = asesorResult.recordset[0].id;

    // Calcular estadísticas
    let queryStats = `
      SELECT 
        COUNT(DISTINCT ac.id_cliente) as total_clientes,
        SUM(ac.importe) as total_pagos,
        COUNT(ac.id) as cantidad_pagos
      FROM asignacion_cliente ac
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
        c.id as 'ID Cliente',
        c.dni as 'DNI',
        c.nombres as 'Nombres',
        c.campana as 'Campaña',
        c.cartera as 'Cartera',
        c.sub_cartera as 'Sub Cartera',
        c.producto as 'Producto',
        c.capital as 'Capital',
        c.fecha_castigo as 'Fecha Castigo',
        c.direccion as 'Dirección',
        a.dni as 'DNI Asesor',
        a.nombres as 'Nombre Asesor',
        ac.importe as 'Importe',
        ac.fecha_pago as 'Fecha Pago',
        ac.tipo_pago as 'Tipo Pago',
        ac.voucher as 'Voucher'
      FROM cliente c
      LEFT JOIN asignacion_cliente ac ON c.id = ac.id_cliente
      LEFT JOIN asesor a ON ac.id_asesor = a.id
      WHERE c.id = @id_cliente
      ORDER BY ac.fecha_pago DESC
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

module.exports = router;


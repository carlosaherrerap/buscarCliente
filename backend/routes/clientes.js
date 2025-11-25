const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');

// Buscar cliente por DNI o nombre (retorna cliente con sus cuentas)
router.get('/buscar', async (req, res) => {
  try {
    const { dni, nombres, tipo } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT DISTINCT
        c.id as cliente_id,
        c.dni,
        c.nombres,
        c.direccion,
        cu.id as cuenta_id,
        cu.numero_cuenta,
        cu.capital,
        cu.deuda_total,
        cu.producto,
        cu.sub_cartera,
        cu.campana,
        cu.fecha_castigo,
        ca.id as cartera_id,
        ca.nombre as cartera_nombre,
        ca.tipo as cartera_tipo
      FROM cliente c
      INNER JOIN cuenta cu ON c.id = cu.id_cliente
      INNER JOIN cartera ca ON cu.id_cartera = ca.id
      WHERE 1=1
    `;
    const params = [];
    
    if (tipo === 'dni' && dni) {
      query += ' AND c.dni = @dni';
      params.push({ name: 'dni', type: sql.VarChar(8), value: dni });
    } else if (tipo === 'nombres' && nombres) {
      query += ' AND c.nombres LIKE @nombres';
      params.push({ name: 'nombres', type: sql.VarChar, value: `%${nombres}%` });
    }
    
    query += ' ORDER BY cu.numero_cuenta';
    
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    
    const result = await request.query(query);
    
    // Agrupar por cliente y sus cuentas
    const clientesMap = {};
    result.recordset.forEach(row => {
      if (!clientesMap[row.cliente_id]) {
        clientesMap[row.cliente_id] = {
          id: row.cliente_id,
          dni: row.dni,
          nombres: row.nombres,
          direccion: row.direccion,
          cuentas: []
        };
      }
      clientesMap[row.cliente_id].cuentas.push({
        id: row.cuenta_id,
        numero_cuenta: row.numero_cuenta,
        capital: row.capital,
        deuda_total: row.deuda_total,
        producto: row.producto,
        sub_cartera: row.sub_cartera,
        campana: row.campana,
        fecha_castigo: row.fecha_castigo,
        cartera: {
          id: row.cartera_id,
          nombre: row.cartera_nombre,
          tipo: row.cartera_tipo
        }
      });
    });
    
    res.json(Object.values(clientesMap));
  } catch (error) {
    console.error('Error al buscar cliente:', error);
    res.status(500).json({ error: 'Error al buscar cliente', message: error.message });
  }
});

// Obtener cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM cliente WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente', message: error.message });
  }
});

// Obtener todas las carteras
router.get('/carteras/lista', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT id, nombre, tipo FROM cartera ORDER BY nombre');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener carteras:', error);
    res.status(500).json({ error: 'Error al obtener carteras', message: error.message });
  }
});

// Obtener todas las campañas únicas
router.get('/campanas/lista', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT DISTINCT campana FROM cuenta WHERE campana IS NOT NULL ORDER BY campana');
    res.json(result.recordset.map(r => r.campana));
  } catch (error) {
    console.error('Error al obtener campañas:', error);
    res.status(500).json({ error: 'Error al obtener campañas', message: error.message });
  }
});

// Obtener carteras de un cliente (únicas)
router.get('/:id_cliente/carteras', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_cliente', sql.Int, req.params.id_cliente)
      .query(`
        SELECT DISTINCT
          ca.id,
          ca.nombre,
          ca.tipo
        FROM cuenta cu
        INNER JOIN cartera ca ON cu.id_cartera = ca.id
        WHERE cu.id_cliente = @id_cliente
        ORDER BY ca.nombre
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener carteras del cliente:', error);
    res.status(500).json({ error: 'Error al obtener carteras', message: error.message });
  }
});

// Obtener cuentas de un cliente (opcionalmente filtradas por cartera)
router.get('/:id_cliente/cuentas', async (req, res) => {
  try {
    const { id_cartera } = req.query;
    const pool = await getPool();
    let query = `
      SELECT 
        cu.id,
        cu.numero_cuenta,
        cu.capital,
        cu.deuda_total,
        cu.producto,
        cu.sub_cartera,
        cu.campana,
        cu.fecha_castigo,
        cu.id_cartera,
        ca.nombre as cartera_nombre,
        ca.tipo as cartera_tipo
      FROM cuenta cu
      INNER JOIN cartera ca ON cu.id_cartera = ca.id
      WHERE cu.id_cliente = @id_cliente
    `;
    
    const request = pool.request()
      .input('id_cliente', sql.Int, req.params.id_cliente);
    
    if (id_cartera) {
      query += ' AND cu.id_cartera = @id_cartera';
      request.input('id_cartera', sql.Int, id_cartera);
    }
    
    query += ' ORDER BY cu.numero_cuenta';
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener cuentas:', error);
    res.status(500).json({ error: 'Error al obtener cuentas', message: error.message });
  }
});

module.exports = router;


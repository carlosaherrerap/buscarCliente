const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');

// Buscar cliente por DNI o nombre
router.get('/buscar', async (req, res) => {
  try {
    const { dni, nombres, tipo } = req.query;
    const pool = await getPool();
    
    let query = 'SELECT * FROM cliente WHERE 1=1';
    const params = [];
    
    if (tipo === 'dni' && dni) {
      query += ' AND dni = @dni';
      params.push({ name: 'dni', type: sql.VarChar(8), value: dni });
    } else if (tipo === 'nombres' && nombres) {
      query += ' AND nombres LIKE @nombres';
      params.push({ name: 'nombres', type: sql.VarChar, value: `%${nombres}%` });
    }
    
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    
    const result = await request.query(query);
    res.json(result.recordset);
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

// Obtener todas las carteras únicas
router.get('/carteras/lista', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT DISTINCT cartera FROM cliente WHERE cartera IS NOT NULL ORDER BY cartera');
    res.json(result.recordset.map(r => r.cartera));
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
      .query('SELECT DISTINCT campana FROM cliente WHERE campana IS NOT NULL ORDER BY campana');
    res.json(result.recordset.map(r => r.campana));
  } catch (error) {
    console.error('Error al obtener campañas:', error);
    res.status(500).json({ error: 'Error al obtener campañas', message: error.message });
  }
});

module.exports = router;


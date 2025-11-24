const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/database');

// Buscar asesor por DNI o nombre
router.get('/buscar', async (req, res) => {
  try {
    const { dni, nombres, tipo } = req.query;
    const pool = await getPool();
    
    let query = 'SELECT * FROM asesor WHERE 1=1';
    const params = [];
    
    if (tipo === 'dni' && dni) {
      query += ' AND dni = @dni';
      params.push({ name: 'dni', type: sql.VarChar(8), value: dni });
    } else if (tipo === 'nombres' && nombres) {
      query += ' AND nombre LIKE @nombre';
      params.push({ name: 'nombre', type: sql.VarChar, value: `%${nombres}%` });
    }
    
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al buscar asesor:', error);
    res.status(500).json({ error: 'Error al buscar asesor', message: error.message });
  }
});

// Obtener todos los asesores
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM asesor ORDER BY nombre');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener asesores:', error);
    res.status(500).json({ error: 'Error al obtener asesores', message: error.message });
  }
});

// Obtener asesor por ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM asesor WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Asesor no encontrado' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error al obtener asesor:', error);
    res.status(500).json({ error: 'Error al obtener asesor', message: error.message });
  }
});

module.exports = router;


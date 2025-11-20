const sql = require('mssql');

// Configuración de conexión a SQL Server
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'CallCenterDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || true,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
    enableArithAbort: true,
    // Configuraciones adicionales para mejorar la conexión
    instanceName: process.env.DB_INSTANCE || undefined,
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Log de configuración (sin mostrar la contraseña)
console.log('Configuración de conexión:');
console.log('  Server:', config.server);
console.log('  Database:', config.database);
console.log('  User:', config.user);
console.log('  Encrypt:', config.options.encrypt);
console.log('  Trust Certificate:', config.options.trustServerCertificate);

let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('Conexión a SQL Server establecida correctamente');
    } catch (err) {
      console.error('Error al conectar con SQL Server:', err);
      throw err;
    }
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

module.exports = {
  getPool,
  closePool,
  sql
};


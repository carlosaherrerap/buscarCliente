// Cargar variables de entorno PRIMERO (antes de cualquier otra cosa)
const path = require('path');
const fs = require('fs');

// Intentar cargar desde diferentes ubicaciones posibles
const envPaths = [
  path.join(__dirname, '../../.env'),      // Desde backend/config/ -> raíz
  path.join(__dirname, '../.env'),        // Desde backend/config/ -> backend/
  path.join(process.cwd(), '.env')       // Desde el directorio actual de trabajo
];

let envLoaded = false;
console.log('Buscando archivo .env...');
console.log('Directorio actual de trabajo:', process.cwd());
console.log('__dirname:', __dirname);

for (const envPath of envPaths) {
  console.log('  Probando:', envPath, '- Existe:', fs.existsSync(envPath));
  if (fs.existsSync(envPath)) {
    const result = require('dotenv').config({ path: envPath });
    if (!result.error) {
      console.log('✓ Archivo .env cargado desde:', envPath);
      envLoaded = true;
      break;
    } else {
      console.log('  Error al cargar:', result.error.message);
    }
  }
}

if (!envLoaded) {
  console.warn('⚠️  No se encontró archivo .env. Usando valores por defecto o variables de sistema.');
  console.warn('  Buscado en:', envPaths);
}

const sql = require('mssql');

// Detectar si estamos en Docker
const isDocker = process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');

// Función para procesar el servidor SQL
function processServerName(serverName) {
  if (!serverName) return 'localhost';
  
  // Si estamos en Docker y el servidor es un nombre de Windows, usar host.docker.internal
  if (isDocker) {
    // Detectar si es un nombre de servidor Windows (contiene \ o es un nombre de máquina)
    const windowsServerPattern = /^[A-Z0-9_-]+(\\[A-Z0-9_-]+)?$/i;
    if (windowsServerPattern.test(serverName) && !serverName.includes('host.docker.internal')) {
      // Reemplazar el nombre del servidor con host.docker.internal pero mantener la instancia
      const parts = serverName.split('\\');
      if (parts.length > 1) {
        return `host.docker.internal\\${parts[1]}`;
      } else {
        return 'host.docker.internal';
      }
    }
  }
  
  return serverName;
}

// Configuración de conexión a SQL Server
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: processServerName(process.env.DB_SERVER) || 'localhost',
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

// Log de configuración (sin mostrar la contraseña completa)
console.log('');
console.log('='.repeat(60));
console.log('CONFIGURACIÓN DE CONEXIÓN A SQL SERVER');
console.log('='.repeat(60));
console.log('Variables de entorno RAW (del .env):');
console.log('  process.env.DB_SERVER:', process.env.DB_SERVER || 'NO DEFINIDA');
console.log('  process.env.DB_USER:', process.env.DB_USER || 'NO DEFINIDA');
console.log('  process.env.DB_NAME:', process.env.DB_NAME || 'NO DEFINIDA');
console.log('  process.env.DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) + ' (length: ' + process.env.DB_PASSWORD.length + ')' : 'NO DEFINIDA');
console.log('');
console.log('Configuración final que se usará:');
console.log('  Entorno Docker detectado:', isDocker ? 'SÍ' : 'NO');
console.log('  Server original:', process.env.DB_SERVER || 'NO DEFINIDA');
console.log('  Server procesado:', config.server);
console.log('  Database:', config.database);
console.log('  User:', config.user);
console.log('  Password:', config.password ? '***' + config.password.slice(-2) + ' (length: ' + config.password.length + ')' : 'NO DEFINIDA');
console.log('  Encrypt:', config.options.encrypt);
console.log('  Trust Certificate:', config.options.trustServerCertificate);
console.log('='.repeat(60));
console.log('');

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


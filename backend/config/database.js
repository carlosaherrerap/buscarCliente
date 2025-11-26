// Cargar variables de entorno PRIMERO (antes de cualquier otra cosa)
const path = require('path');
const fs = require('fs');

// Detectar si estamos en Docker
const isDocker = process.env.DOCKER === 'true' || fs.existsSync('/.dockerenv');

let envLoaded = false;

// En Docker, las variables de entorno ya están disponibles desde docker-compose.yml
// No necesitamos cargar el archivo .env
if (!isDocker) {
  // Solo intentar cargar .env si NO estamos en Docker
  console.log('Buscando archivo .env...');
  console.log('Directorio actual de trabajo:', process.cwd());
  console.log('__dirname:', __dirname);
  
  const envPaths = [
    path.join(__dirname, '../../.env'),      // Desde backend/config/ -> raíz
    path.join(__dirname, '../.env'),        // Desde backend/config/ -> backend/
    path.join(process.cwd(), '.env')       // Desde el directorio actual de trabajo
  ];

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
} else {
  console.log('✓ Entorno Docker detectado. Usando variables de entorno del contenedor.');
}

const sql = require('mssql');

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

// Validar variables de entorno críticas en Docker
if (isDocker) {
  const requiredEnvVars = ['DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ ERROR: Variables de entorno faltantes');
    console.error('='.repeat(60));
    console.error('Las siguientes variables son requeridas pero no están definidas:');
    missingVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('');
    console.error('Asegúrate de definir estas variables en docker-compose.yml o en el archivo .env');
    console.error('='.repeat(60));
    console.error('');
  }
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
const passwordLength = process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0;
const passwordLast2 = process.env.DB_PASSWORD ? process.env.DB_PASSWORD.slice(-2) : '';
const passwordFirst2 = process.env.DB_PASSWORD ? process.env.DB_PASSWORD.slice(0, 2) : '';
console.log('  process.env.DB_PASSWORD:', process.env.DB_PASSWORD ? `${passwordFirst2}***${passwordLast2} (length: ${passwordLength})` : 'NO DEFINIDA');
// Log temporal para debug (mostrar caracteres de la contraseña sin mostrar el contenido completo)
if (process.env.DB_PASSWORD) {
  const pwd = process.env.DB_PASSWORD;
  console.log('  DB_PASSWORD debug - Caracteres:', pwd.split('').map((c, i) => i < 2 || i >= pwd.length - 2 ? c : '*').join(''));
  console.log('  DB_PASSWORD debug - Últimos 4 chars:', pwd.slice(-4));
}
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
let connectionAttempted = false;

async function getPool() {
  if (!pool) {
    if (!connectionAttempted) {
      connectionAttempted = true;
      console.log('');
      console.log('='.repeat(60));
      console.log('INTENTANDO CONECTAR A SQL SERVER...');
      console.log('='.repeat(60));
    }
    
    try {
      console.log('Conectando con los siguientes parámetros:');
      console.log(`  - Servidor: ${config.server}`);
      console.log(`  - Base de datos: ${config.database}`);
      console.log(`  - Usuario: ${config.user}`);
      const pwdLength = config.password ? config.password.length : 0;
      const pwdLast2 = config.password ? config.password.slice(-2) : '';
      const pwdFirst2 = config.password ? config.password.slice(0, 2) : '';
      console.log(`  - Contraseña: ${config.password ? `${pwdFirst2}***${pwdLast2} (length: ${pwdLength})` : 'NO DEFINIDA'}`);
      // Debug temporal: mostrar estructura de la contraseña
      if (config.password) {
        const pwd = config.password;
        console.log(`  - Contraseña debug - Primeros 3: "${pwd.slice(0, 3)}", Últimos 3: "${pwd.slice(-3)}"`);
        console.log(`  - Contraseña debug - Caracteres especiales: ${pwd.includes('$') ? 'SÍ (contiene $)' : 'NO'}`);
      }
      console.log(`  - Encrypt: ${config.options.encrypt}`);
      console.log(`  - Trust Certificate: ${config.options.trustServerCertificate}`);
      console.log('');
      
      pool = await sql.connect(config);
      
      // Verificar que la conexión esté activa
      const testRequest = pool.request();
      const testResult = await testRequest.query('SELECT @@VERSION as version, DB_NAME() as currentDB');
      
      console.log('='.repeat(60));
      console.log('✅ CONEXIÓN A SQL SERVER EXITOSA');
      console.log('='.repeat(60));
      console.log(`  - Versión SQL Server: ${testResult.recordset[0].version.split('\n')[0]}`);
      console.log(`  - Base de datos actual: ${testResult.recordset[0].currentDB}`);
      console.log('='.repeat(60));
      console.log('');
      
    } catch (err) {
      console.log('='.repeat(60));
      console.log('❌ ERROR AL CONECTAR CON SQL SERVER');
      console.log('='.repeat(60));
      console.error('Detalles del error:', err.message);
      console.error('Código del error:', err.code);
      
      if (err.code === 'ELOGIN') {
        console.error('');
        console.error('⚠️  ERROR DE AUTENTICACIÓN');
        console.error('   El usuario o contraseña son incorrectos.');
        console.error('   Verifica las variables de entorno:');
        console.error('   - DB_USER:', process.env.DB_USER || 'NO DEFINIDA');
        console.error('   - DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) + ' (length: ' + process.env.DB_PASSWORD.length + ')' : 'NO DEFINIDA');
      } else if (err.code === 'EINSTLOOKUP' || err.code === 'ENOTFOUND') {
        console.error('');
        console.error('⚠️  ERROR DE RESOLUCIÓN DE NOMBRE');
        console.error('   No se pudo resolver el nombre del servidor.');
        console.error('   En Docker, asegúrate de usar: host.docker.internal');
        console.error('   - DB_SERVER:', process.env.DB_SERVER || 'NO DEFINIDA');
      }
      
      console.log('='.repeat(60));
      console.log('');
      
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


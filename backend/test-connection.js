// Script de prueba de conexión a SQL Server
// Uso: node test-connection.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');

// Build config with support for HOST\\INSTANCE and HOST,PORT formats
const rawServer = process.env.DB_SERVER || 'localhost';
let server = rawServer;
let instance = process.env.DB_INSTANCE || undefined;
let port = undefined;

// allow explicit DB_PORT env var to override
if (process.env.DB_PORT) {
  port = parseInt(process.env.DB_PORT, 10) || undefined;
}

if (rawServer.includes('\\')) {
  const parts = rawServer.split('\\');
  server = parts[0];
  instance = instance || parts.slice(1).join('\\');
  // If the host part contains a comma, use the part after comma as port
  if (server.includes(',')) {
    const [h, p] = server.split(',');
    server = h;
    port = parseInt(p, 10) || undefined;
  }
} else if (rawServer.includes(',')) {
  const [h, p] = rawServer.split(',');
  server = h;
  port = parseInt(p, 10) || undefined;
}

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server,
  database: process.env.DB_NAME || 'CallCenterDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || true,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
    enableArithAbort: true,
    instanceName: instance || undefined,
    port: port || undefined,
    requestTimeout: 30000,
    connectionTimeout: 30000
  }
};

console.log('='.repeat(50));
console.log('PRUEBA DE CONEXIÓN A SQL SERVER');
console.log('='.repeat(50));
console.log('');
console.log('Configuración detectada:');
console.log('  Server:', config.server);
console.log('  Instance (options.instanceName):', config.options.instanceName || 'NO DEFINIDA');
console.log('  Port (options.port):', config.options.port || 'NO DEFINIDA');
console.log('  Database:', config.database);
console.log('  User:', config.user);
console.log('  Password:', config.password ? '***' + config.password.slice(-2) : 'NO DEFINIDA');
console.log('  Encrypt:', config.options.encrypt);
console.log('  Trust Certificate:', config.options.trustServerCertificate);
console.log('');

// Verificar que las variables estén definidas
if (!process.env.DB_SERVER) {
  console.error('❌ ERROR: DB_SERVER no está definido en .env');
  console.error('   Asegúrate de que el archivo .env existe en la raíz del proyecto');
  process.exit(1);
}

if (!process.env.DB_PASSWORD) {
  console.error('❌ ERROR: DB_PASSWORD no está definido en .env');
  process.exit(1);
}

console.log('Intentando conectar...');
console.log('');

sql.connect(config)
  .then(async () => {
    console.log('✅ ¡Conexión exitosa!');
    console.log('');
    
    // Probar una consulta simple
    try {
      const result = await sql.query`SELECT @@VERSION as version, DB_NAME() as database_name`;
      console.log('Información del servidor:');
      console.log('  Base de datos actual:', result.recordset[0].database_name);
      console.log('  Versión SQL Server:', result.recordset[0].version.split('\n')[0]);
      console.log('');
      
      // Verificar que las tablas existan
      const tables = await sql.query`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `;
      
      console.log('Tablas encontradas:');
      if (tables.recordset.length === 0) {
        console.log('  ⚠️  No se encontraron tablas. Ejecuta el script create_tables.sql');
      } else {
        tables.recordset.forEach(table => {
          console.log('  ✓', table.TABLE_NAME);
        });
      }
      
    } catch (queryError) {
      console.error('⚠️  Conexión OK pero error en consulta:', queryError.message);
    }
    
    await sql.close();
    console.log('');
    console.log('✅ Prueba completada exitosamente');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error de conexión:');
    console.error('');
    console.error('Código:', err.code || 'N/A');
    console.error('Mensaje:', err.message);
    console.error('');
    
    if (err.code === 'ELOGIN') {
      console.error('🔍 DIAGNÓSTICO: Error de autenticación');
      console.error('');
      console.error('Posibles causas:');
      console.error('  1. Usuario o contraseña incorrectos');
      console.error('  2. Usuario "sa" deshabilitado en SQL Server');
      console.error('  3. Autenticación SQL deshabilitada');
      console.error('  4. Caracteres especiales en contraseña mal escapados');
      console.error('');
      console.error('Soluciones:');
      console.error('  - Verifica las credenciales en SQL Server Management Studio');
      console.error('  - Ejecuta: ALTER LOGIN sa ENABLE;');
      console.error('  - Habilita "SQL Server and Windows Authentication mode"');
    } else if (err.code === 'ESOCKET' || err.code === 'ETIMEOUT') {
      console.error('🔍 DIAGNÓSTICO: Error de red/conectividad');
      console.error('');
      console.error('Posibles causas:');
      console.error('  1. SQL Server no está corriendo');
      console.error('  2. Nombre del servidor incorrecto');
      console.error('  3. Firewall bloqueando la conexión');
      console.error('  4. TCP/IP deshabilitado en SQL Server');
      console.error('');
      console.error('Soluciones:');
      console.error('  - Verifica que SQL Server esté corriendo');
      console.error('  - Prueba con: sqlcmd -S "WIN-1SLFD3AC22A\\DATACENTERSERVER" -U sa -P "..."');
      console.error('  - Habilita TCP/IP en SQL Server Configuration Manager');
    } else {
      console.error('🔍 Revisa el archivo SOLUCION_ERROR_CONEXION.md para más ayuda');
    }
    
    console.error('');
    process.exit(1);
  });


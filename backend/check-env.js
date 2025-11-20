// Script para verificar la ubicación del archivo .env
const path = require('path');
const fs = require('fs');

console.log('='.repeat(60));
console.log('VERIFICACIÓN DE ARCHIVO .env');
console.log('='.repeat(60));
console.log('');
console.log('Directorio actual de trabajo:', process.cwd());
console.log('__dirname:', __dirname);
console.log('');

const envPaths = [
  { name: 'Raíz del proyecto (desde backend/config/)', path: path.join(__dirname, '../../.env') },
  { name: 'Carpeta backend', path: path.join(__dirname, '../.env') },
  { name: 'Directorio actual', path: path.join(process.cwd(), '.env') }
];

let found = false;
for (const envPath of envPaths) {
  const exists = fs.existsSync(envPath.path);
  console.log(`${exists ? '✓' : '✗'} ${envPath.name}:`);
  console.log(`  ${envPath.path}`);
  console.log(`  Existe: ${exists}`);
  
  if (exists) {
    found = true;
    console.log('');
    console.log('Contenido del archivo .env:');
    console.log('-'.repeat(60));
    try {
      const content = fs.readFileSync(envPath.path, 'utf8');
      // Ocultar contraseña en el output
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.includes('PASSWORD')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          console.log(`${key.trim()}=***${value.trim().slice(-2)}`);
        } else {
          console.log(line);
        }
      });
    } catch (err) {
      console.error('Error al leer:', err.message);
    }
    console.log('-'.repeat(60));
  }
  console.log('');
}

if (!found) {
  console.log('⚠️  No se encontró ningún archivo .env');
  console.log('');
  console.log('Para crear el archivo .env, ejecuta en PowerShell:');
  console.log('');
  console.log('@');
  console.log('DB_SERVER=WIN-1SLFD3AC22A\\DATACENTERSERVER');
  console.log('DB_USER=sa');
  console.log('DB_PASSWORD=Administrador2025$$');
  console.log('DB_NAME=clientManager');
  console.log('DB_ENCRYPT=true');
  console.log('DB_TRUST_CERT=true');
  console.log('PORT=5000');
  console.log('"@ | Out-File -FilePath .env -Encoding utf8');
  console.log('');
  console.log('O crea el archivo manualmente en la raíz del proyecto con ese contenido.');
}

console.log('='.repeat(60));


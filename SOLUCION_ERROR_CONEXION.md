# Solución: Error de Conexión a SQL Server

## Error: "Login failed for user 'sa'"

Este error puede tener varias causas. Sigue estos pasos para solucionarlo:

### 1. Verificar el archivo `.env`

Asegúrate de que el archivo `.env` esté en la raíz del proyecto (mismo nivel que `docker-compose.yml`) y tenga el formato correcto:

```env
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER
DB_USER=sa
DB_PASSWORD=Administrador2025$$
DB_NAME=CallCenterDB
DB_ENCRYPT=true
DB_TRUST_CERT=true
PORT=5000
```

**Importante**: 
- No dejes espacios alrededor del `=`
- No uses comillas a menos que sea necesario
- Si la contraseña tiene caracteres especiales, puede que necesites escapar el `$`

### 2. Probar con formato alternativo del servidor

Si el formato con `\` no funciona, prueba estas alternativas en el `.env`:

**Opción A - Con corchetes:**
```env
DB_SERVER=[WIN-1SLFD3AC22A\DATACENTERSERVER]
```

**Opción B - Con comillas (si es necesario):**
```env
DB_SERVER="WIN-1SLFD3AC22A\DATACENTERSERVER"
```

**Opción C - Separar servidor e instancia:**
```env
DB_SERVER=WIN-1SLFD3AC22A
DB_INSTANCE=DATACENTERSERVER
```

### 3. Verificar credenciales en SQL Server

Abre SQL Server Management Studio y verifica:

1. **Que el usuario 'sa' esté habilitado:**
   ```sql
   -- Ejecutar en SQL Server
   ALTER LOGIN sa ENABLE;
   ALTER LOGIN sa WITH PASSWORD = 'Administrador2025$$';
   ```

2. **Que la autenticación SQL esté habilitada:**
   - Click derecho en el servidor → Properties
   - Security → Seleccionar "SQL Server and Windows Authentication mode"
   - Reiniciar SQL Server

3. **Verificar que puedas conectarte manualmente:**
   - Intenta conectarte con SSMS usando las mismas credenciales
   - Si funciona en SSMS pero no en la app, es un problema de configuración

### 4. Verificar conectividad de red

**Si SQL Server está en otra máquina:**

1. **Verificar que SQL Server acepte conexiones remotas:**
   - SQL Server Configuration Manager
   - SQL Server Network Configuration → Protocols for [INSTANCE]
   - Habilitar TCP/IP
   - Reiniciar SQL Server

2. **Verificar firewall:**
   - Asegúrate de que el puerto 1433 (o el puerto de tu instancia) esté abierto
   - Windows Firewall → Inbound Rules → Permitir puerto 1433

3. **Probar con IP en lugar de nombre:**
   ```env
   DB_SERVER=192.168.1.100\DATACENTERSERVER
   # o solo la IP si es la instancia por defecto
   DB_SERVER=192.168.1.100
   ```

### 5. Probar conexión desde Node.js

Crea un archivo de prueba `test-connection.js` en la carpeta `backend`:

```javascript
require('dotenv').config({ path: '../.env' });
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

console.log('Intentando conectar...');
console.log('Server:', config.server);
console.log('User:', config.user);
console.log('Database:', config.database);

sql.connect(config)
  .then(() => {
    console.log('✅ Conexión exitosa!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error de conexión:', err.message);
    console.error('Código:', err.code);
    process.exit(1);
  });
```

Ejecuta:
```powershell
cd backend
node test-connection.js
```

### 6. Soluciones específicas por problema

#### Problema: Caracteres especiales en contraseña
Si tu contraseña tiene `$$`, prueba escapar:
```env
DB_PASSWORD=Administrador2025$$
# o si no funciona, prueba:
DB_PASSWORD="Administrador2025$$"
```

#### Problema: Instancia nombrada
Si usas una instancia nombrada, el formato debe ser exacto:
```env
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER
```

#### Problema: Puerto personalizado
Si SQL Server usa un puerto diferente a 1433:
```env
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER,1433
# o el puerto que uses
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER,50000
```

### 7. Verificar que el archivo .env se esté leyendo

Agrega esto temporalmente en `backend/config/database.js` para verificar:

```javascript
console.log('Variables de entorno:');
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NO DEFINIDA');
console.log('DB_NAME:', process.env.DB_NAME);
```

### 8. Reiniciar el servidor

Después de cambiar el `.env`:
```powershell
# Si usas Docker
docker-compose restart

# Si usas desarrollo local
# Detén el servidor (Ctrl+C) y vuelve a iniciarlo
npm start
```

## Checklist de Verificación

- [ ] Archivo `.env` existe en la raíz del proyecto
- [ ] Archivo `.env` tiene el formato correcto (sin espacios extra)
- [ ] Puedes conectarte con SSMS usando las mismas credenciales
- [ ] SQL Server acepta autenticación SQL (no solo Windows)
- [ ] Usuario 'sa' está habilitado
- [ ] TCP/IP está habilitado en SQL Server Configuration Manager
- [ ] Firewall permite conexiones al puerto de SQL Server
- [ ] El servidor Node.js puede alcanzar el servidor SQL Server (misma red/VPN)

## Si nada funciona

Prueba con una conexión de prueba usando `sqlcmd`:

```powershell
sqlcmd -S "WIN-1SLFD3AC22A\DATACENTERSERVER" -U sa -P "Administrador2025$$" -Q "SELECT @@VERSION"
```

Si esto funciona, el problema está en la configuración de Node.js.
Si no funciona, el problema está en SQL Server o la red.


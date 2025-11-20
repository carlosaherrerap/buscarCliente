# Guía de Instalación - Sistema Call Center

## 🚀 OPCIÓN 1: Con Docker (RECOMENDADO - Más Fácil)

**Ventaja**: No necesitas instalar Node.js ni npm en tu computadora. Docker lo hace todo.

### Requisitos Previos:
- ✅ Docker Desktop instalado ([Descargar aquí](https://www.docker.com/products/docker-desktop))
- ✅ Docker Compose (viene con Docker Desktop)

### Pasos:

#### 1. Verificar que Docker esté funcionando
```powershell
docker --version
docker-compose --version
```

#### 2. Crear el archivo `.env`
Crea un archivo `.env` en la raíz del proyecto con:
```env
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER
DB_USER=sa
DB_PASSWORD=Administrador2025$$
DB_NAME=CallCenterDB
DB_ENCRYPT=true
DB_TRUST_CERT=true
PORT=5000
```

**En PowerShell puedes hacerlo así:**
```powershell
@"
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER
DB_USER=sa
DB_PASSWORD=Administrador2025$$
DB_NAME=CallCenterDB
DB_ENCRYPT=true
DB_TRUST_CERT=true
PORT=5000
"@ | Out-File -FilePath .env -Encoding utf8
```

#### 3. Crear las tablas en SQL Server
Ejecuta el script SQL en tu base de datos:
- Abre SQL Server Management Studio
- Conéctate a: `WIN-1SLFD3AC22A\DATACENTERSERVER`
- Abre el archivo `scripts/create_tables.sql`
- Ejecuta el script completo

#### 4. Construir y levantar el sistema
```powershell
# Construir la imagen Docker (solo la primera vez o cuando cambies código)
docker-compose build

# Levantar el sistema
docker-compose up -d

# Ver los logs (opcional)
docker-compose logs -f
```

#### 5. Acceder al sistema
Abre tu navegador en: **http://localhost:5000**

#### Comandos útiles:
```powershell
# Detener el sistema
docker-compose down

# Reiniciar el sistema
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Reconstruir desde cero (si hay problemas)
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 💻 OPCIÓN 2: Sin Docker (Desarrollo Local)

**Ventaja**: Más rápido para desarrollo, cambios se reflejan inmediatamente.

### Requisitos Previos:
- ✅ Node.js 18 o superior ([Descargar aquí](https://nodejs.org/))
- ✅ npm (viene con Node.js)

### Pasos:

#### 1. Verificar instalación de Node.js
```powershell
node --version
npm --version
```

#### 2. Crear el archivo `.env`
Igual que en la Opción 1, crea el archivo `.env` en la raíz del proyecto.

#### 3. Crear las tablas en SQL Server
Igual que en la Opción 1.

#### 4. Instalar dependencias del backend
```powershell
cd backend
npm install
```

**Nota**: El frontend no necesita instalación, solo archivos estáticos (HTML, CSS, JS).

#### 5. Levantar el servidor
```powershell
# Desde la carpeta backend
npm start

# O para desarrollo con auto-reload (recomendado)
npm run dev
```

#### 6. Acceder al sistema
Abre tu navegador en: **http://localhost:5000**

---

## 🔧 Solución de Problemas

### Error: "Cannot connect to SQL Server"
- Verifica que SQL Server esté corriendo
- Verifica las credenciales en `.env`
- Si SQL Server está en otra máquina, usa la IP en lugar del nombre
- Verifica que el firewall permita conexiones en el puerto de SQL Server (1433)

### Error: "Port 5000 is already in use"
Cambia el puerto en `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"  # Usa 8080 en lugar de 5000
```

### Error: "Cannot find module"
Si usas Docker:
```powershell
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

Si usas desarrollo local:
```powershell
cd backend
rm -rf node_modules
npm install
```

### Error al importar Excel
- Verifica que el Excel tenga las columnas: `DNI` y `NOMBRE Y APELLIDOS`
- Verifica que no haya filas vacías al inicio
- Verifica el formato de los datos

---

## 📋 Resumen Rápido (Docker)

```powershell
# 1. Crear .env (ver arriba)
# 2. Crear tablas en SQL Server
# 3. Ejecutar estos comandos:

docker-compose build
docker-compose up -d

# Listo! Abre http://localhost:5000
```

---

## 📋 Resumen Rápido (Sin Docker)

```powershell
# 1. Crear .env (ver arriba)
# 2. Crear tablas en SQL Server
# 3. Ejecutar estos comandos:

cd backend
npm install
npm start

# Listo! Abre http://localhost:5000
```

---

## ✅ Verificación

Una vez levantado el sistema, deberías ver:
- En la consola: "Servidor corriendo en el puerto 5000"
- En el navegador: La página principal con el formulario de búsqueda

Si todo funciona correctamente, ¡el sistema está listo para usar! 🎉


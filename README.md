# Sistema de Call Center - Gestión de Clientes y Asesores

Sistema web profesional para la gestión de clientes, asesores y asignaciones de pagos en un call center.

## Características

- 🔍 Búsqueda de clientes por DNI o nombres
- 📊 Importación de datos desde archivos Excel
- 💰 Gestión de pagos y asignaciones
- 📈 Reportes y rankings de asesores
- 📥 Descarga de reportes en formato Excel
- 🎨 Diseño moderno y profesional

## Requisitos Previos

- Docker y Docker Compose instalados
- SQL Server (base de datos externa)
- Node.js 18+ (para desarrollo local)

## Estructura de Base de Datos

### Tabla: cliente
- `id` (int, PK, auto increment)
- `dni` (char(8))
- `nombres` (varchar)
- `campaña` (varchar)
- `cartera` (varchar)
- `sub_cartera` (varchar)
- `producto` (varchar)
- `capital` (float)
- `fecha_castigo` (date)
- `direccion` (varchar)

### Tabla: asesor
- `id` (int, PK, auto increment)
- `dni` (char(8))
- `nombres` (varchar)

### Tabla: asignacion_cliente
- `id` (int, PK, auto increment)
- `id_cliente` (int, FK)
- `id_asesor` (int, FK)
- `importe` (float)
- `fecha_pago` (date)
- `tipo_pago` (varchar)
- `voucher` (varchar)

## Instalación y Configuración

### 1. Clonar o descargar el proyecto

### 2. Configurar variables de entorno

Crear un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de SQL Server:

```env
DB_SERVER=tu_servidor_sql
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=CallCenterDB
DB_ENCRYPT=true
DB_TRUST_CERT=true
PORT=5000
```

### 3. Crear las tablas en SQL Server

Ejecutar el siguiente script SQL en tu base de datos:

```sql
-- Crear base de datos (si no existe)
CREATE DATABASE CallCenterDB;
GO

USE CallCenterDB;
GO

-- Tabla cliente
CREATE TABLE cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    campaña VARCHAR(255),
    cartera VARCHAR(255),
    sub_cartera VARCHAR(255),
    producto VARCHAR(255),
    capital FLOAT,
    fecha_castigo DATE,
    direccion VARCHAR(500)
);
GO

-- Tabla asesor
CREATE TABLE asesor (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL
);
GO

-- Tabla asignacion_cliente
CREATE TABLE asignacion_cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_asesor INT NOT NULL,
    importe FLOAT NOT NULL,
    fecha_pago DATE NOT NULL,
    tipo_pago VARCHAR(50),
    voucher VARCHAR(255),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id),
    FOREIGN KEY (id_asesor) REFERENCES asesor(id)
);
GO
```

### 4. Construir y ejecutar con Docker

```bash
# Construir la imagen
docker-compose build

# Iniciar el contenedor
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 5. Acceder a la aplicación

Abrir el navegador en: `http://localhost:8080`

**Nota:** El puerto externo es 8080, pero el puerto interno del contenedor sigue siendo 5000. Si necesitas cambiar el puerto externo, edita `docker-compose.yml`.

## Desarrollo Local

Si prefieres ejecutar sin Docker:

```bash
# Instalar dependencias
cd backend
npm install

# Configurar variables de entorno
cp ../.env.example ../.env
# Editar .env con tus credenciales

# Iniciar servidor
npm start
# o para desarrollo con auto-reload
npm run dev
```

## Uso del Sistema

### Página Principal
- Buscar clientes por DNI o nombres
- Acceder a opciones de importación, reportes y rankings

### Importar Datos
- Seleccionar archivo Excel con clientes o asesores
- El botón cambia a "GUARDAR" al seleccionar archivo
- Validación automática de campos requeridos

### Descargar Pagos
- Filtrar por rango de fechas o día específico
- Seleccionar cartera, campaña y asesor
- Activar/desactivar filtros con checkboxes
- Descargar resultados en Excel

### Ranking de Asesores
- Buscar asesor por DNI o nombres
- Ver estadísticas: total pagos, metas, clientes y rate%
- Descargar reporte completo

### Vista de Cliente
- Ver información completa del cliente
- Asignar nuevos pagos
- Descargar datos en Excel

## Formato de Archivos Excel

### Para Clientes
El archivo Excel debe contener las siguientes columnas (los nombres son case insensitive):
- `DNI` (requerido)
- `NOMBRE Y APELLIDOS` (requerido)
- `CARTERA` (opcional)
- `SUB CARTERA` (opcional)
- `PRODUCTO` (opcional)
- `CAPITAL` (opcional)
- `CAMPAÑA` o `CAMPANA` (opcional)
- `DIRECCION COMPLETA` o `DIRECCIÓN COMPLETA` (opcional)

**Nota**: El sistema busca los campos de forma flexible, aceptando variaciones en mayúsculas/minúsculas y espacios.

### Para Asesores
El archivo Excel debe contener:
- `dni` (requerido)
- `nombres` (requerido)

## Solución de Problemas

### Error de conexión a SQL Server
- Verificar que SQL Server esté accesible desde el contenedor
- Revisar credenciales en `.env`
- Asegurar que `DB_TRUST_CERT=true` si usas certificados autofirmados

### Error al importar Excel
- Verificar que el archivo tenga las columnas requeridas
- Revisar formato de fechas
- Comprobar que no haya caracteres especiales problemáticos

### Puerto en uso
El puerto externo por defecto es **8080**. Si necesitas cambiarlo, edita `docker-compose.yml`:
```yaml
ports:
  - "3001:5000"  # Cambiar 3001 por el puerto externo deseado (5000 es el interno)
```

## Tecnologías Utilizadas

- **Backend**: Node.js, Express
- **Base de Datos**: SQL Server
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Contenedor**: Docker
- **Librerías**: mssql, xlsx, multer

## Licencia

Este proyecto es de uso interno.

## Soporte

Para reportar problemas o sugerencias, usar el botón de WhatsApp en la aplicación o contactar al equipo de desarrollo.


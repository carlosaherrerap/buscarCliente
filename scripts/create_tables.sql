-- Script para crear las tablas en SQL Server
-- Ejecutar este script completo en SQL Server Management Studio

USE clientManager;
GO

-- Eliminar tablas si existen (en orden correcto por dependencias)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asignacion_cliente]') AND type in (N'U'))
    DROP TABLE asignacion_cliente;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cuenta]') AND type in (N'U'))
    DROP TABLE cuenta;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cliente]') AND type in (N'U'))
    DROP TABLE cliente;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cartera]') AND type in (N'U'))
    DROP TABLE cartera;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asesor]') AND type in (N'U'))
    DROP TABLE asesor;
GO

-- Crear tabla cartera
CREATE TABLE cartera (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('castigada', 'preventiva'))
);
GO

CREATE INDEX IX_cartera_nombre ON cartera(nombre);
GO

PRINT 'Tabla cartera creada exitosamente';
GO

-- Crear tabla cliente (solo datos personales)
CREATE TABLE cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    direccion VARCHAR(500) NULL
);
GO

CREATE INDEX IX_cliente_dni ON cliente(dni);
GO

CREATE INDEX IX_cliente_nombres ON cliente(nombres);
GO

PRINT 'Tabla cliente creada exitosamente';
GO

-- Crear tabla cuenta (relaciona cliente con cartera, un cliente puede tener múltiples cuentas)
CREATE TABLE cuenta (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_cliente INT NOT NULL,
    numero_cuenta VARCHAR(100) NOT NULL,
    id_cartera INT NOT NULL,
    capital FLOAT NULL,
    deuda_total FLOAT NULL,
    producto VARCHAR(255) NULL,
    sub_cartera VARCHAR(255) NULL,
    campana VARCHAR(255) NULL,
    fecha_castigo DATE NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id) ON DELETE CASCADE,
    FOREIGN KEY (id_cartera) REFERENCES cartera(id)
);
GO

CREATE INDEX IX_cuenta_cliente ON cuenta(id_cliente);
GO

CREATE INDEX IX_cuenta_cartera ON cuenta(id_cartera);
GO

CREATE INDEX IX_cuenta_numero ON cuenta(numero_cuenta);
GO

-- Índice único para evitar duplicados de número de cuenta por cliente
CREATE UNIQUE INDEX IX_cuenta_cliente_numero ON cuenta(id_cliente, numero_cuenta);
GO

PRINT 'Tabla cuenta creada exitosamente';
GO

-- Crear tabla asesor
CREATE TABLE asesor (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL
);
GO

CREATE INDEX IX_asesor_dni ON asesor(dni);
GO

CREATE INDEX IX_asesor_nombres ON asesor(nombres);
GO

PRINT 'Tabla asesor creada exitosamente';
GO

-- Crear tabla asignacion_cliente (ahora relaciona cuenta con asesor)
CREATE TABLE asignacion_cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_cuenta INT NOT NULL,
    id_asesor INT NOT NULL,
    importe FLOAT NOT NULL,
    fecha_pago DATE NOT NULL,
    tipo_pago VARCHAR(50) NULL,
    voucher VARCHAR(255) NULL,
    FOREIGN KEY (id_cuenta) REFERENCES cuenta(id) ON DELETE CASCADE,
    FOREIGN KEY (id_asesor) REFERENCES asesor(id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_asignacion_cuenta ON asignacion_cliente(id_cuenta);
GO

CREATE INDEX IX_asignacion_asesor ON asignacion_cliente(id_asesor);
GO

CREATE INDEX IX_asignacion_fecha ON asignacion_cliente(fecha_pago);
GO

PRINT 'Tabla asignacion_cliente creada exitosamente';
GO

PRINT '';
PRINT '============================================================';
PRINT 'Todas las tablas han sido creadas exitosamente';
PRINT '============================================================';
PRINT 'Tablas creadas:';
PRINT '  - cartera (id, nombre, tipo)';
PRINT '  - cliente (id, dni, nombres, direccion)';
PRINT '  - cuenta (id, id_cliente, numero_cuenta, id_cartera, capital, deuda_total, producto, sub_cartera, campana, fecha_castigo)';
PRINT '  - asesor (id, dni, nombres)';
PRINT '  - asignacion_cliente (id, id_cuenta, id_asesor, importe, fecha_pago, tipo_pago, voucher)';
PRINT '============================================================';
GO

-- Script para crear las tablas en SQL Server
-- Ejecutar este script completo en SQL Server Management Studio

USE gestioncliente;
GO

-- Eliminar tablas si existen (en orden correcto por dependencias)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asignacion_cliente]') AND type in (N'U'))
    DROP TABLE asignacion_cliente;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cliente]') AND type in (N'U'))
    DROP TABLE cliente;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asesor]') AND type in (N'U'))
    DROP TABLE asesor;
GO

-- Crear tabla cliente
CREATE TABLE cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    campana VARCHAR(255) NULL,
    cartera VARCHAR(255) NULL,
    sub_cartera VARCHAR(255) NULL,
    producto VARCHAR(255) NULL,
    capital FLOAT NULL,
    fecha_castigo DATE NULL,
    direccion VARCHAR(500) NULL
);
GO

CREATE INDEX IX_cliente_dni ON cliente(dni);
GO

CREATE INDEX IX_cliente_nombres ON cliente(nombres);
GO

PRINT 'Tabla cliente creada exitosamente';
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

-- Crear tabla asignacion_cliente
CREATE TABLE asignacion_cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_asesor INT NOT NULL,
    importe FLOAT NOT NULL,
    fecha_pago DATE NOT NULL,
    tipo_pago VARCHAR(50) NULL,
    voucher VARCHAR(255) NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id) ON DELETE CASCADE,
    FOREIGN KEY (id_asesor) REFERENCES asesor(id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_asignacion_cliente ON asignacion_cliente(id_cliente);
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
PRINT '  - cliente (con campo campana)';
PRINT '  - asesor';
PRINT '  - asignacion_cliente';
PRINT '============================================================';
GO

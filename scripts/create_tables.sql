-- Script para crear las tablas en SQL Server
-- Ejecutar este script en tu base de datos SQL Server

USE CallCenterDB;
GO

-- Tabla cliente
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cliente]') AND type in (N'U'))
BEGIN
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
    
    -- Índice para búsquedas por DNI
    CREATE INDEX IX_cliente_dni ON cliente(dni);
    
    -- Índice para búsquedas por nombres
    CREATE INDEX IX_cliente_nombres ON cliente(nombres);
END
GO

-- Tabla asesor
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asesor]') AND type in (N'U'))
BEGIN
    CREATE TABLE asesor (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dni CHAR(8) NOT NULL,
        nombres VARCHAR(255) NOT NULL
    );
    
    -- Índice para búsquedas por DNI
    CREATE INDEX IX_asesor_dni ON asesor(dni);
    
    -- Índice para búsquedas por nombres
    CREATE INDEX IX_asesor_nombres ON asesor(nombres);
END
GO

-- Tabla asignacion_cliente
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asignacion_cliente]') AND type in (N'U'))
BEGIN
    CREATE TABLE asignacion_cliente (
        id INT IDENTITY(1,1) PRIMARY KEY,
        id_cliente INT NOT NULL,
        id_asesor INT NOT NULL,
        importe FLOAT NOT NULL,
        fecha_pago DATE NOT NULL,
        tipo_pago VARCHAR(50),
        voucher VARCHAR(255),
        FOREIGN KEY (id_cliente) REFERENCES cliente(id) ON DELETE CASCADE,
        FOREIGN KEY (id_asesor) REFERENCES asesor(id) ON DELETE CASCADE
    );
    
    -- Índices para mejorar rendimiento
    CREATE INDEX IX_asignacion_cliente ON asignacion_cliente(id_cliente);
    CREATE INDEX IX_asignacion_asesor ON asignacion_cliente(id_asesor);
    CREATE INDEX IX_asignacion_fecha ON asignacion_cliente(fecha_pago);
END
GO

PRINT 'Tablas creadas exitosamente';
GO


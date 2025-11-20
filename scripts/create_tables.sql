-- ============================================================
-- Script para crear las tablas del sistema Call Center
-- ============================================================
-- Ejecutar este script completo en SQL Server Management Studio
-- IMPORTANTE: Cambia 'gestioncliente' por el nombre de tu base de datos si es diferente

USE gestioncliente;
GO

-- ============================================================
-- Tabla: cliente
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cliente]') AND type in (N'U'))
BEGIN
    DROP TABLE cliente;
    PRINT 'Tabla cliente eliminada (se recreará)';
END
GO

CREATE TABLE cliente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    campaña VARCHAR(255) NULL,
    cartera VARCHAR(255) NULL,
    sub_cartera VARCHAR(255) NULL,
    producto VARCHAR(255) NULL,
    capital FLOAT NULL,
    fecha_castigo DATE NULL,
    direccion VARCHAR(500) NULL
);
GO

-- Índices para mejorar el rendimiento de búsquedas
CREATE INDEX IX_cliente_dni ON cliente(dni);
CREATE INDEX IX_cliente_nombres ON cliente(nombres);
CREATE INDEX IX_cliente_cartera ON cliente(cartera);
CREATE INDEX IX_cliente_campana ON cliente(campaña);
GO

PRINT 'Tabla cliente creada exitosamente';
GO

-- ============================================================
-- Tabla: asesor
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asesor]') AND type in (N'U'))
BEGIN
    DROP TABLE asesor;
    PRINT 'Tabla asesor eliminada (se recreará)';
END
GO

CREATE TABLE asesor (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL
);
GO

-- Índices para mejorar el rendimiento de búsquedas
CREATE INDEX IX_asesor_dni ON asesor(dni);
CREATE INDEX IX_asesor_nombres ON asesor(nombres);
GO

PRINT 'Tabla asesor creada exitosamente';
GO

-- ============================================================
-- Tabla: asignacion_cliente
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[asignacion_cliente]') AND type in (N'U'))
BEGIN
    DROP TABLE asignacion_cliente;
    PRINT 'Tabla asignacion_cliente eliminada (se recreará)';
END
GO

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

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IX_asignacion_cliente ON asignacion_cliente(id_cliente);
CREATE INDEX IX_asignacion_asesor ON asignacion_cliente(id_asesor);
CREATE INDEX IX_asignacion_fecha ON asignacion_cliente(fecha_pago);
GO

PRINT 'Tabla asignacion_cliente creada exitosamente';
GO

-- ============================================================
-- Resumen
-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT 'Todas las tablas han sido creadas exitosamente';
PRINT '============================================================';
PRINT 'Tablas creadas:';
PRINT '  - cliente';
PRINT '  - asesor';
PRINT '  - asignacion_cliente';
PRINT '============================================================';
GO


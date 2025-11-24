-- Script para crear las tablas en SQL Server
-- Ejecutar este script completo en SQL Server Management Studio

USE clientManager;
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

CREATE UNIQUE INDEX IX_cuenta_cliente_numero ON cuenta(id_cliente, numero_cuenta);
GO

-- Crear tabla asesor
CREATE TABLE asesor (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dni CHAR(8) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    cargo VARCHAR(255) NULL,
    meta FLOAT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    fecha_ingreso DATE NULL,
    fecha_salida DATE NULL
);
GO

CREATE INDEX IX_asesor_dni ON asesor(dni);
GO

CREATE INDEX IX_asesor_nombre ON asesor(nombre);
GO

CREATE INDEX IX_asesor_estado ON asesor(estado);
GO

-- Trigger para validar que si estado='ACTIVO', fecha_salida debe ser NULL
CREATE TRIGGER trg_asesor_validar_fecha_salida
ON asesor
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM inserted 
        WHERE estado = 'ACTIVO' AND fecha_salida IS NOT NULL
    )
    BEGIN
        RAISERROR('Si el estado es ACTIVO, la fecha de salida debe ser NULL', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
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

PRINT 'Todas las tablas han sido creadas exitosamente';
GO

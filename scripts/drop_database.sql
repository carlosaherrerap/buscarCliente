-- ============================================================
-- Script para ELIMINAR la base de datos completa
-- ============================================================
-- ADVERTENCIA: Este script eliminará TODA la base de datos y sus datos
-- Ejecutar SOLO si estás seguro de que quieres eliminar todo
-- ============================================================

-- Cambiar el nombre de la base de datos según corresponda
DECLARE @dbname NVARCHAR(128) = 'gestioncliente';

-- Cerrar todas las conexiones activas a la base de datos
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql = @sql + 'KILL ' + CAST(session_id AS NVARCHAR(10)) + ';'
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID(@dbname)
AND session_id <> @@SPID;

IF @sql <> ''
BEGIN
    EXEC sp_executesql @sql;
    PRINT 'Conexiones activas cerradas';
END
ELSE
BEGIN
    PRINT 'No hay conexiones activas';
END
GO

-- Cambiar a base de datos master para poder eliminar la base de datos
USE master;
GO

-- Poner la base de datos en modo SINGLE_USER para poder eliminarla
ALTER DATABASE gestioncliente SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Eliminar la base de datos
DROP DATABASE gestioncliente;
GO

PRINT 'Base de datos gestioncliente eliminada exitosamente';
PRINT 'Ahora puedes ejecutar create_tables.sql para crear las tablas nuevamente';
GO


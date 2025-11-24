-- Query para encontrar clientes con 2 o más cuentas
-- Muestra cuántos clientes tienen múltiples cuentas y cuáles son

USE clientManager;
GO

-- 1. Contar cuántos clientes tienen 2 o más cuentas
SELECT 
    COUNT(*) as total_clientes_multiple_cuentas
FROM (
    SELECT 
        id_cliente,
        COUNT(*) as cantidad_cuentas
    FROM cuenta
    GROUP BY id_cliente
    HAVING COUNT(*) >= 2
) as clientes_multiple;
GO

-- 2. Listar todos los clientes con 2 o más cuentas y sus detalles
SELECT 
    c.id as cliente_id,
    c.dni,
    c.nombres,
    c.direccion,
    COUNT(cu.id) as cantidad_cuentas,
    STRING_AGG(cu.numero_cuenta, ', ') as numeros_cuenta
FROM cliente c
INNER JOIN cuenta cu ON c.id = cu.id_cliente
GROUP BY c.id, c.dni, c.nombres, c.direccion
HAVING COUNT(cu.id) >= 2
ORDER BY cantidad_cuentas DESC, c.nombres;
GO

-- 3. Versión detallada: Mostrar cada cuenta del cliente con múltiples cuentas
SELECT 
    c.id as cliente_id,
    c.dni,
    c.nombres,
    cu.numero_cuenta,
    ca.nombre as cartera,
    cu.capital,
    cu.deuda_total,
    cu.producto,
    cu.campana
FROM cliente c
INNER JOIN cuenta cu ON c.id = cu.id_cliente
INNER JOIN cartera ca ON cu.id_cartera = ca.id
WHERE c.id IN (
    SELECT id_cliente
    FROM cuenta
    GROUP BY id_cliente
    HAVING COUNT(*) >= 2
)
ORDER BY c.nombres, cu.numero_cuenta;
GO


-- Query para encontrar clientes que pertenecen a más de 1 cartera
-- Un cliente puede tener múltiples cuentas, y cada cuenta pertenece a una cartera

USE clientManager;
GO

-- 1. Contar cuántos clientes tienen más de 1 cartera
SELECT 
    COUNT(*) as total_clientes_multiple_carteras
FROM (
    SELECT 
        c.id as cliente_id,
        COUNT(DISTINCT cu.id_cartera) as cantidad_carteras
    FROM cliente c
    INNER JOIN cuenta cu ON c.id = cu.id_cliente
    GROUP BY c.id
    HAVING COUNT(DISTINCT cu.id_cartera) > 1
) as clientes_multiple;
GO

-- 2. Listar todos los clientes con más de 1 cartera y sus detalles
SELECT 
    c.id as cliente_id,
    c.dni,
    c.nombres,
    c.direccion,
    COUNT(DISTINCT cu.id_cartera) as cantidad_carteras,
    COUNT(cu.id) as cantidad_cuentas,
    STRING_AGG(ca.nombre, ', ') WITHIN GROUP (ORDER BY ca.nombre) as carteras
FROM cliente c
INNER JOIN cuenta cu ON c.id = cu.id_cliente
INNER JOIN cartera ca ON cu.id_cartera = ca.id
GROUP BY c.id, c.dni, c.nombres, c.direccion
HAVING COUNT(DISTINCT cu.id_cartera) > 1
ORDER BY cantidad_carteras DESC, c.nombres;
GO

-- 3. Versión detallada: Mostrar cada cuenta del cliente con su cartera
SELECT 
    c.id as cliente_id,
    c.dni,
    c.nombres,
    cu.id as cuenta_id,
    cu.numero_cuenta,
    ca.id as cartera_id,
    ca.nombre as cartera_nombre,
    ca.tipo as cartera_tipo,
    cu.capital,
    cu.deuda_total,
    cu.producto,
    cu.sub_cartera,
    cu.campana
FROM cliente c
INNER JOIN cuenta cu ON c.id = cu.id_cliente
INNER JOIN cartera ca ON cu.id_cartera = ca.id
WHERE c.id IN (
    SELECT id_cliente
    FROM cuenta
    GROUP BY id_cliente
    HAVING COUNT(DISTINCT id_cartera) > 1
)
ORDER BY c.nombres, ca.nombre, cu.numero_cuenta;
GO

-- 4. Versión resumida con estadísticas por cliente
SELECT 
    c.id as cliente_id,
    c.dni,
    c.nombres,
    COUNT(DISTINCT cu.id_cartera) as cantidad_carteras,
    COUNT(cu.id) as total_cuentas,
    STRING_AGG(DISTINCT ca.nombre, ' | ') WITHIN GROUP (ORDER BY ca.nombre) as lista_carteras,
    STRING_AGG(DISTINCT ca.tipo, ', ') as tipos_cartera,
    SUM(cu.capital) as capital_total,
    SUM(cu.deuda_total) as deuda_total
FROM cliente c
INNER JOIN cuenta cu ON c.id = cu.id_cliente
INNER JOIN cartera ca ON cu.id_cartera = ca.id
GROUP BY c.id, c.dni, c.nombres
HAVING COUNT(DISTINCT cu.id_cartera) > 1
ORDER BY cantidad_carteras DESC, c.nombres;
GO


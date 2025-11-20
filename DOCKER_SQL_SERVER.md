# Configuración de Docker con SQL Server

## Problema: No se puede conectar a SQL Server desde Docker

El error `getaddrinfo ENOTFOUND win-1slfd3ac22a` significa que Docker no puede resolver el nombre del servidor SQL Server.

## Solución RECOMENDADA: Usar la IP del servidor

### Paso 1: Obtener la IP del servidor SQL Server

Ejecuta en PowerShell (en la máquina donde está SQL Server):
```powershell
ipconfig
```

Busca la dirección IPv4, por ejemplo: `192.168.1.100` o `10.0.0.5`

### Paso 2: Actualizar el archivo `.env`

Edita tu archivo `.env` y cambia `DB_SERVER`:

```env
# Si SQL Server está en la misma máquina, usa:
DB_SERVER=host.docker.internal\DATACENTERSERVER

# O mejor aún, usa la IP directamente:
DB_SERVER=192.168.1.100\DATACENTERSERVER

# Si es la instancia por defecto (sin nombre de instancia):
DB_SERVER=192.168.1.100
```

### Paso 3: Reiniciar Docker

```powershell
docker-compose down
docker-compose up -d
```

## Alternativa: Si SQL Server está en la misma máquina

Si SQL Server está en la misma máquina que Docker, puedes usar:

```env
DB_SERVER=host.docker.internal\DATACENTERSERVER
```

O si está en otra máquina de la red local, usa su IP:

```env
DB_SERVER=192.168.1.100\DATACENTERSERVER
```

## Verificar conexión

```powershell
# Ver logs del contenedor
docker logs callcenter-web

# Deberías ver: "Conexión a SQL Server establecida correctamente"
```


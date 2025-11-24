# Solución para conexión SQL Server desde Docker

## Problema
Docker no puede resolver nombres de servidor Windows como `WIN-1SLFD3AC22A\DATACENTERSERVER`.

## Solución

### Opción 1: Actualizar tu archivo `.env` (RECOMENDADO)

Cuando corras en Docker, cambia tu `.env` para usar `host.docker.internal`:

```env
# Para Docker (cuando corras docker-compose)
DB_SERVER=host.docker.internal\DATACENTERSERVER
DB_USER=sa
DB_PASSWORD=Administrador2025$$
DB_NAME=clientManager
DB_ENCRYPT=true
DB_TRUST_CERT=true
```

### Opción 2: Usar la IP del host

Si `host.docker.internal` no funciona, usa la IP de tu máquina:

1. Obtén la IP de tu máquina Windows:
   ```powershell
   ipconfig
   ```
   Busca la IP de tu adaptador de red (ej: `192.168.1.100`)

2. Actualiza tu `.env`:
   ```env
   DB_SERVER=192.168.1.100\DATACENTERSERVER
   ```

### Opción 3: Configurar extra_hosts en docker-compose.yml

Si prefieres mantener el nombre del servidor, descomenta y configura en `docker-compose.yml`:

```yaml
extra_hosts:
  - "win-1slfd3ac22a:IP_DE_TU_MAQUINA"
```

## Nota importante

El código ahora detecta automáticamente si está corriendo en Docker y convierte nombres de servidor Windows a `host.docker.internal`, pero es mejor configurar tu `.env` correctamente.

## Verificar conexión

Después de actualizar, reinicia el contenedor:

```bash
docker-compose down
docker-compose up -d
docker logs -f callcenter-web
```

Deberías ver: `Conexión a SQL Server establecida correctamente`


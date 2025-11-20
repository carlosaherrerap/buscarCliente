# Configuración del archivo .env

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Configuración de Base de Datos SQL Server
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER
DB_USER=sa
DB_PASSWORD=Administrador2025$$
DB_NAME=CallCenterDB
DB_ENCRYPT=true
DB_TRUST_CERT=true

# Puerto de la aplicación
PORT=5000
```

## Notas importantes:

1. **DB_SERVER**: Usa el nombre exacto del servidor con la instancia: `WIN-1SLFD3AC22A\DATACENTERSERVER`
2. **DB_PASSWORD**: La contraseña contiene caracteres especiales (`$$`), asegúrate de que esté entre comillas si es necesario
3. Si tienes problemas de conexión, prueba también con la IP del servidor en lugar del nombre

## Crear el archivo:

En Windows (PowerShell):
```powershell
@"
DB_SERVER=WIN-1SLFD3AC22A\DATACENTERSERVER
DB_USER=sa
DB_PASSWORD=Administrador2025$$
DB_NAME=CallCenterDB
DB_ENCRYPT=true
DB_TRUST_CERT=true
PORT=5000
"@ | Out-File -FilePath .env -Encoding utf8
```

O simplemente crea el archivo manualmente con un editor de texto.


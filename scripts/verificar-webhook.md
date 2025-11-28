# Guía de Configuración de Webhook GitHub + Jenkins

## Problema: Error 404 en el Webhook

El webhook está recibiendo un 404 porque la URL no incluye la ruta específica de Jenkins.

## Solución Paso a Paso

### 1. Verificar que ngrok está corriendo

Asegúrate de que ngrok esté corriendo y apuntando al puerto de Jenkins:

```bash
ngrok http 8080
```

(Reemplaza 8080 con el puerto donde corre tu Jenkins)

### 2. Obtener la URL pública de ngrok

Cuando inicies ngrok, verás algo como:
```
Forwarding  https://uncontinued-enduring-shin.ngrok-free.dev -> http://localhost:8080
```

### 3. Configurar el Webhook en GitHub

1. Ve a tu repositorio en GitHub
2. Settings > Webhooks > Add webhook (o edita el existente)
3. **Payload URL**: `https://uncontinued-enduring-shin.ngrok-free.dev/github-webhook/`
   - ⚠️ **IMPORTANTE**: Debe terminar en `/github-webhook/`
4. **Content type**: `application/json`
5. **Events**: Selecciona "Just the push event" o "Let me select individual events" y marca "Push"
6. Guarda el webhook

### 4. Configurar Jenkins

#### Opción A: Usando GitHub Webhook Plugin (Recomendado)

1. **Instalar plugin**: 
   - Manage Jenkins > Manage Plugins
   - Busca "GitHub plugin" e instálalo
   - Reinicia Jenkins

2. **Configurar Jenkins URL**:
   - Manage Jenkins > Configure System
   - En "Jenkins Location", configura:
     - Jenkins URL: `https://uncontinued-enduring-shin.ngrok-free.dev`

3. **Configurar el Job**:
   - Ve a tu job de Jenkins
   - Configure
   - En "Build Triggers", marca:
     - ☑️ "GitHub hook trigger for GITScm polling"

4. **Configurar seguridad** (si es necesario):
   - Manage Jenkins > Configure Global Security
   - En "Authorization", permite que el usuario anónimo tenga:
     - Overall: Read
     - Job: Build

#### Opción B: Usando Build Token

1. En tu Job de Jenkins:
   - Configure > Build Triggers
   - Marca "Trigger builds remotely (e.g., from scripts)"
   - Ingresa un token secreto (ej: `mi-token-secreto-123`)

2. URL del webhook en GitHub:
   ```
   https://uncontinued-enduring-shin.ngrok-free.dev/job/buscarCliente/build?token=mi-token-secreto-123
   ```
   (Reemplaza `buscarCliente` con el nombre de tu job)

### 5. Prueba el Webhook

1. Ve a tu webhook en GitHub
2. Haz clic en "Recent Deliveries"
3. Haz clic en el último delivery
4. Verifica que la respuesta sea 200 OK (no 404)

### 6. Prueba con un push

Haz un pequeño cambio y haz push:

```bash
git commit --allow-empty -m "Test webhook"
git push origin master
```

Verifica que Jenkins inicie automáticamente el build.

## Troubleshooting

### Error 404 persiste
- Verifica que la URL termine en `/github-webhook/`
- Verifica que ngrok esté corriendo
- Verifica que Jenkins esté corriendo en el puerto correcto

### Error 403 Forbidden
- Verifica la configuración de seguridad de Jenkins
- Permite que el usuario anónimo tenga permisos de lectura

### Webhook no dispara el build
- Verifica que el job tenga "GitHub hook trigger" habilitado
- Verifica los logs de Jenkins: Manage Jenkins > System Log
- Verifica que el webhook esté configurado para el evento "push"

## Nota sobre ngrok

⚠️ **IMPORTANTE**: Si reinicias ngrok, la URL cambiará y tendrás que actualizarla en GitHub. Considera usar una cuenta de ngrok para URLs estables.


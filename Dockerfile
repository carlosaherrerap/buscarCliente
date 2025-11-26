FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY backend/package.json backend/package-lock.json* ./

# Instalar dependencias
RUN npm install --production

# Copiar código del backend
COPY backend/ ./

# Copiar frontend al directorio correcto
COPY frontend/ ./frontend/

# Crear directorio para uploads
RUN mkdir -p uploads/temp

# Exponer puerto
EXPOSE 4000

# Variables de entorno por defecto
ENV PORT=4000
ENV NODE_ENV=production

# Comando para iniciar
CMD ["node", "server.js"]


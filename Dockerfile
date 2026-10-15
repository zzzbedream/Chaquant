# Dockerfile para despliegue productivo de Chaquant en Render / Cloud
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY test-relay/ ./test-relay/

# Exponer puerto por defecto
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Iniciar servidor Zero-Knowledge
CMD ["node", "test-relay/server.js"]

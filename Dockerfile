# Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
ARG VITE_API_URL=""
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN VITE_API_URL=$VITE_API_URL npm run build

# Production
FROM node:18-alpine
ENV NODE_ENV=production
RUN npm install -g firebase-tools
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-builder /app/dist ../frontend/dist

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["node", "server.js"]

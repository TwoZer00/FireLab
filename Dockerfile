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
RUN apk add --no-cache openjdk17-jre bash nano expect && npm install -g firebase-tools
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# Create firebase-projects directory for volume mount
RUN mkdir -p /app/firebase-projects && chmod 755 /app/firebase-projects

# Copy frontend build
COPY --from=frontend-builder /app/dist /frontend/dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

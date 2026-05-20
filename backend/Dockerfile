FROM node:18-alpine

ENV NODE_ENV=production

# Install Java, bash, and Firebase CLI globally
RUN apk add --no-cache openjdk17-jre bash nano && npm install -g firebase-tools

# Set working directory
WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

# Expose backend port
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/api/emulator/status || exit 1

# Start backend server
CMD ["node", "server.js"]

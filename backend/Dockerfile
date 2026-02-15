FROM node:18-alpine

# Install Firebase CLI globally
RUN npm install -g firebase-tools

# Set working directory
WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

# Expose backend port
EXPOSE 3001

# Start backend server
CMD ["npm", "run", "dev"]

FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Build frontend
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

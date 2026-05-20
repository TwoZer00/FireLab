# Docker Deployment Guide

Deploy FireLab as a single containerized application using Docker.

## Prerequisites

- Docker (v20+)
- Docker Compose (v2+) *(optional, for docker-compose method)*

## Quick Start

### Option 1: Docker Hub (Recommended)

```bash
# Pull and run the latest image
docker run -d \
  -p 3001:3001 \
  -p 4000-4010:4000-4010 \
  -p 5000-5010:5000-5010 \
  -p 8080-8090:8080-8090 \
  -p 9000-9010:9000-9010 \
  -p 9099-9109:9099-9109 \
  -p 9199-9209:9199-9209 \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

**What this does:**
- Downloads the pre-built FireLab image from Docker Hub
- Creates a persistent volume for your Firebase projects
- Runs both frontend and backend in a single container on port 3001
- Includes a built-in healthcheck

### Option 2: Docker Compose

```bash
# Clone the repository
git clone https://github.com/TwoZer00/FireLab.git
cd FireLab

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Build Locally

```bash
# Clone repository
git clone https://github.com/TwoZer00/FireLab.git
cd FireLab

# Build and start
docker-compose up -d
```

## Access URLs

| Service | URL |
|---------|-----|
| FireLab UI | http://localhost:3001 |
| Backend API | http://localhost:3001/api |
| Firebase Emulator UI | http://localhost:4000 (when emulator is running) |

## Authentication

FireLab uses JWT-based authentication. After starting the container, you need to generate an access token.

**Generate Token:**
```bash
# Interactive method (while container is running)
docker exec -it firelab node /app/backend/generate-token.js

# Or attach to the running server and type "token"
docker attach firelab
```

Use the generated token when prompted in the FireLab UI.

## Docker Management

```bash
# Stop the container
docker stop firelab

# Start existing container
docker start firelab

# View logs
docker logs firelab

# Remove container (keeps volume with projects)
docker rm firelab

# Remove volume (deletes all project data)
docker volume rm firelab-projects
```

## Ports Exposed

The container exposes **port ranges** to support multiple projects with different configurations:

| Service | Port Range | Default |
|---------|------------|---------|
| FireLab (UI + API) | 3001 | 3001 |
| Emulator UI | 4000-4010 | 4000 |
| Hosting | 5000-5010 | 5000 |
| Firestore | 8080-8090 | 8080 |
| Database | 9000-9010 | 9000 |
| Auth | 9099-9109 | 9099 |
| Storage | 9199-9209 | 9199 |

### Configuring Ports

**Option 1: Use FireLab UI (Recommended)**

Configure ports within the ranges above directly in FireLab:
1. Select your project
2. Edit Config
3. Change port numbers (must be within exposed ranges)
4. Save and restart emulator

**Option 2: Custom port mapping at runtime**

```bash
docker run -d \
  -p 8080:3001 \
  -p 4000-4020:4000-4020 \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

**Option 3: Host Network (Linux Only)**

```bash
docker run -d \
  --network host \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `FIREBASE_TOKEN` | - | Firebase CI token (optional, for deploying rules) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3001` | Comma-separated allowed CORS origins |

**Example with environment variables:**
```bash
docker run -d \
  -p 3001:3001 \
  -p 4000-4010:4000-4010 \
  -p 5000-5010:5000-5010 \
  -p 8080-8090:8080-8090 \
  -p 9000-9010:9000-9010 \
  -p 9099-9109:9099-9109 \
  -p 9199-9209:9199-9209 \
  -e FIREBASE_TOKEN=1//abc123def456... \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

## Firebase Authentication (Optional)

Firebase login is **only required** for deploying rules to production. For local emulator development, no login needed.

**Generate Firebase Token (on a machine with browser access):**
```bash
firebase login:ci
```

Then pass the token via `FIREBASE_TOKEN` environment variable when running the container.

## Data Persistence

Firebase projects are stored in the `firelab-projects` Docker volume, which persists across container restarts and removals.

To back up your data:
```bash
docker cp firelab:/app/firebase-projects ./backup-projects
```

## Updating

```bash
# Pull latest image
docker pull leobardo21/firelab:latest

# Remove old container
docker stop firelab && docker rm firelab

# Start with new image (volume persists)
docker run -d \
  -p 3001:3001 \
  -p 4000-4010:4000-4010 \
  -p 5000-5010:5000-5010 \
  -p 8080-8090:8080-8090 \
  -p 9000-9010:9000-9010 \
  -p 9099-9109:9099-9109 \
  -p 9199-9209:9199-9209 \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

## Cloud Deployment

### AWS EC2
```bash
# Install Docker
sudo yum install docker -y
sudo service docker start

# Pull and run
sudo docker run -d \
  -p 3001:3001 \
  -p 4000-4010:4000-4010 \
  -p 5000-5010:5000-5010 \
  -p 8080-8090:8080-8090 \
  -p 9000-9010:9000-9010 \
  -p 9099-9109:9099-9109 \
  -p 9199-9209:9199-9209 \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

### GCP Compute Engine / Azure VM
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Pull and run
sudo docker run -d \
  -p 3001:3001 \
  -p 4000-4010:4000-4010 \
  -p 5000-5010:5000-5010 \
  -p 8080-8090:8080-8090 \
  -p 9000-9010:9000-9010 \
  -p 9099-9109:9099-9109 \
  -p 9199-9209:9199-9209 \
  -v firelab-projects:/app/firebase-projects \
  --name firelab leobardo21/firelab:latest
```

## Monitoring

```bash
# Container stats
docker stats firelab

# Health check
curl http://localhost:3001/api/emulator/status

# View real-time logs
docker logs -f firelab
```

## Troubleshooting

**Port conflicts:**
```bash
# Check what's using ports
docker ps
netstat -tulpn | grep :3001

# Use different host port
docker run -d -p 8080:3001 ... leobardo21/firelab:latest
```

**Container won't start:**
```bash
# Check logs
docker logs firelab

# Verify image pulled correctly
docker images | grep firelab
```

**Can't access UI:**
- Verify container is running: `docker ps`
- Check firewall allows port 3001
- Try `http://localhost:3001` in browser

## Security Notes

For production:
1. Use a reverse proxy (Nginx/Traefik) with HTTPS
2. Set strong firewall rules
3. Use environment variables for secrets
4. Restrict network access to trusted IPs
5. Keep the access token secure

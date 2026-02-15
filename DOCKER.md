# Docker Deployment Guide

Deploy FireLab as a containerized application using Docker.

## Prerequisites

- Docker (v20+)
- Docker Compose (v2+)

## Quick Start

### Option 1: Using Pre-built Images (Recommended)

```bash
# Download docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/TwoZer00/FireLab/master/docker-compose.prod.yml

# Start with pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

This pulls pre-built images from Docker Hub - no build time needed!

### Option 2: Build Locally

```bash
# Clone repository
git clone <repo-url>
cd firelab

# Build and start
docker-compose up -d
```

This will:
- Pull/build backend and frontend images
- Start both containers
- Expose ports for all services
- Create persistent volume for Firebase projects

### 2. Access

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **Emulator UI**: http://localhost:4000

### 3. Stop

```bash
# Using pre-built images
docker-compose -f docker-compose.prod.yml down

# Using local build
docker-compose down
```

## Docker Hub Images

Pre-built images are available on Docker Hub:

- **Backend**: `docker pull leobardo21/firelab-backend:latest`
- **Frontend**: `docker pull leobardo21/firelab-frontend:latest`

Images are automatically built and published on every release.

## Production Deployment

### Environment Variables

Create `.env` file in root:

```env
# Backend
NODE_ENV=production

# Frontend (build-time)
VITE_API_URL=http://your-server-ip:3001
```

### Build for Production

```bash
# Build images
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### Remote Access

Update `docker-compose.yml` to use your server IP:

```yaml
frontend:
  environment:
    - VITE_API_URL=http://YOUR_SERVER_IP:3001
```

Or use environment variable:

```bash
VITE_API_URL=http://192.168.1.100:3001 docker-compose up -d
```

## Ports Exposed

Backend exposes **port ranges** to support multiple projects with different configurations:

| Service | Port Range | Default | Configurable in FireLab |
|---------|------------|---------|-------------------------|
| Frontend | 80 | 80 | No (change in docker-compose.yml) |
| Backend | 3001 | 3001 | No |
| Emulator UI | 4000-4010 | 4000 | Yes |
| Hosting | 5000-5010 | 5000 | Yes |
| Firestore | 8080-8090 | 8080 | Yes |
| Database | 9000-9010 | 9000 | Yes |
| Auth | 9099-9109 | 9099 | Yes |
| Storage | 9199-9209 | 9199 | Yes |

### Configuring Ports

**Option 1: Use FireLab UI (Recommended)**

Configure ports within the ranges above directly in FireLab:
1. Select your project
2. Edit Config
3. Change port numbers (must be within ranges)
4. Save and restart emulator

**Option 2: Manually Edit docker-compose.yml**

If you need ports outside the default ranges:

```yaml
backend:
  ports:
    - "3001:3001"
    - "4000-4020:4000-4020"  # Expand range to 20 ports
    - "8080:8080"            # Single port only
    - "10000-10100:9000-9100" # Map to different host ports
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

**Option 3: Use Host Network (Linux Only)**

For unlimited port flexibility on Linux:

```yaml
backend:
  network_mode: host
  # Remove 'ports' section
  # Remove 'networks' section
```

Note: This only works on Linux and reduces isolation.

## Data Persistence

Firebase projects are stored in `./firebase-projects` volume, which persists across container restarts.

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

**Port conflicts:**
```bash
# Check what's using ports
docker ps
netstat -tulpn | grep :3001

# Change ports in docker-compose.yml
ports:
  - "8001:3001"  # Map to different host port
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Restart services:**
```bash
docker-compose restart backend
docker-compose restart frontend
```

**Clean rebuild:**
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Security Notes

For production:
1. Use HTTPS (add SSL certificates to Nginx)
2. Set strong firewall rules
3. Use environment variables for secrets
4. Enable authentication if needed
5. Restrict network access

## Cloud Deployment

### AWS EC2
```bash
# Install Docker
sudo yum install docker -y
sudo service docker start

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone and run
git clone <repo-url>
cd firelab
docker-compose up -d
```

### GCP Compute Engine
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Clone and run
git clone <repo-url>
cd firelab
docker compose up -d
```

### Azure VM
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone and run
git clone <repo-url>
cd firelab
docker-compose up -d
```

## Monitoring

```bash
# Container stats
docker stats

# Health check
curl http://localhost:3001/api/emulator/status
```

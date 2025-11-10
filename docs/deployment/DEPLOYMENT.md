# CatalAIst Deployment Guide

## Overview

CatalAIst is deployed as Docker containers using Docker Compose for local development and testing. The application consists of two main services:
- **Backend**: Node.js/Express API server
- **Frontend**: React application served by nginx

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose V2 or later
- At least 2GB of available disk space
- OpenAI API key (required for classification features)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CatalAIst
```

### 2. Build and Start Services

```bash
docker-compose up --build
```

This command will:
- Build both backend and frontend Docker images
- Create a persistent data volume
- Start both services
- Initialize data directories and default prompts
- Make the application available at:
  - Frontend: http://localhost:80
  - Backend API: http://localhost:8080

### 3. Verify Deployment

Check the health status:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "checks": {
    "fileSystem": "ok",
    "dataDirectories": "ok"
  }
}
```

### 4. Stop Services

```bash
docker-compose down
```

To also remove the data volume:

```bash
docker-compose down -v
```

## Environment Variables

### Backend Service

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment mode |
| `PORT` | `8080` | Backend server port |
| `DEFAULT_MODEL` | `gpt-4` | Default OpenAI model for classification |
| `DEFAULT_VOICE` | `alloy` | Default OpenAI TTS voice |
| `DATA_DIR` | `/data` | Path to data directory inside container |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `PII_ENCRYPTION_KEY` | (auto-generated) | Encryption key for PII mappings (set in production) |

### Frontend Service

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8080` | Backend API URL |

### Customizing Environment Variables

Create a `.env` file in the project root:

```bash
# Backend Configuration
DEFAULT_MODEL=gpt-3.5-turbo
DEFAULT_VOICE=nova
LOG_LEVEL=debug
PII_ENCRYPTION_KEY=your-secure-key-here

# Frontend Configuration
REACT_APP_API_URL=http://your-backend-url:8080
```

Then start with:

```bash
docker-compose --env-file .env up
```

## Data Volume Structure

The application uses a Docker volume (`catalai-data`) mounted at `/data` in the backend container. The following directory structure is automatically created on first startup:

```
/data/
├── sessions/           # User session data (JSON files)
├── audit-logs/         # Audit logs (JSONL files, daily rotation)
├── prompts/            # Prompt templates (versioned text files)
├── audio/              # Temporary audio files
│   └── cache/          # Cached TTS audio files
├── analytics/          # Analytics metrics (JSON files)
├── pii-mappings/       # PII anonymization mappings (encrypted JSON)
├── decision-matrix/    # Decision matrix versions (JSON files)
└── learning/           # AI learning analysis and suggestions (JSON files)
```

### Data Persistence

- Data persists across container restarts
- Data is stored in Docker volume `catalai-data`
- Volume location: `/var/lib/docker/volumes/catalaist_catalai-data/_data` (Linux/Mac)

## Backup and Restore

### Backup Data Volume

```bash
# Create backup directory
mkdir -p backups

# Backup the data volume
docker run --rm \
  -v catalaist_catalai-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/catalai-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Restore Data Volume

```bash
# Stop services
docker-compose down

# Restore from backup
docker run --rm \
  -v catalaist_catalai-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/catalai-backup-YYYYMMDD-HHMMSS.tar.gz"

# Start services
docker-compose up
```

### Backup Individual Components

```bash
# Backup audit logs only
docker run --rm \
  -v catalaist_catalai-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/audit-logs-$(date +%Y%m%d).tar.gz -C /data audit-logs

# Backup decision matrix versions
docker run --rm \
  -v catalaist_catalai-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/decision-matrix-$(date +%Y%m%d).tar.gz -C /data decision-matrix
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns system health status and checks.

### Session Management

```bash
POST /api/sessions
GET /api/sessions/:id
POST /api/sessions/:id/conversations
DELETE /api/sessions/:id
```

### Process Classification

```bash
POST /api/process/submit
```

### Feedback

```bash
POST /api/feedback/classification
POST /api/feedback/rating
```

### Decision Matrix

```bash
GET /api/decision-matrix
GET /api/decision-matrix/versions
GET /api/decision-matrix/:version
PUT /api/decision-matrix
```

### AI Learning

```bash
POST /api/learning/analyze
GET /api/learning/suggestions
POST /api/learning/suggestions/:id/approve
POST /api/learning/suggestions/:id/reject
```

### Voice Services

```bash
POST /api/voice/transcribe
POST /api/voice/synthesize
```

### Analytics

```bash
GET /api/analytics/dashboard
```

### Prompt Management

```bash
GET /api/prompts
GET /api/prompts/:id
PUT /api/prompts/:id
```

For detailed API documentation, see [backend/API-ENDPOINTS.md](backend/API-ENDPOINTS.md).

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Health Check Fails

1. Check if data directories exist:
```bash
docker exec catalai-backend ls -la /data
```

2. Verify initialization completed:
```bash
docker logs catalai-backend | grep "Initialization Complete"
```

### Frontend Can't Connect to Backend

1. Verify backend is running:
```bash
curl http://localhost:8080/health
```

2. Check frontend environment variable:
```bash
docker exec catalai-frontend env | grep REACT_APP_API_URL
```

### Data Volume Issues

1. List volumes:
```bash
docker volume ls
```

2. Inspect volume:
```bash
docker volume inspect catalaist_catalai-data
```

3. Remove and recreate volume:
```bash
docker-compose down -v
docker-compose up
```

### Port Conflicts

If ports 80 or 8080 are already in use, modify `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8081:8080"  # Change host port
  
  frontend:
    ports:
      - "8000:80"    # Change host port
```

### Memory Issues

Increase Docker memory allocation:
- Docker Desktop: Settings → Resources → Memory (recommend 4GB minimum)

## Production Deployment Considerations

### Security

1. **Set PII Encryption Key**:
```bash
export PII_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

2. **Use HTTPS**: Deploy behind a reverse proxy (nginx, Traefik) with SSL/TLS

3. **Restrict Network Access**: Use Docker networks and firewall rules

4. **Secure API Keys**: Never commit API keys to version control

### Monitoring

1. **Health Checks**: Monitor `/health` endpoint

2. **Container Logs**: Use log aggregation (ELK, Splunk, CloudWatch)

3. **Metrics**: Monitor container resource usage

### Scaling

For production workloads:
- Deploy to AWS ECS/EKS (Phase 2)
- Use managed databases (DynamoDB, RDS)
- Use S3 for file storage
- Implement load balancing
- Add auto-scaling policies

### Backup Strategy

1. **Automated Backups**: Schedule daily backups using cron

2. **Retention Policy**: Keep 30 days of daily backups, 12 months of monthly backups

3. **Off-site Storage**: Copy backups to S3 or other cloud storage

4. **Test Restores**: Regularly test backup restoration

## Development Workflow

### Local Development

1. **Backend Development**:
```bash
cd backend
npm install
npm run dev
```

2. **Frontend Development**:
```bash
cd frontend
npm install
npm start
```

3. **Build for Production**:
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Rebuild Containers

After code changes:

```bash
docker-compose up --build
```

Or rebuild specific service:

```bash
docker-compose build backend
docker-compose up backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Review health check: `curl http://localhost:8080/health`
- Verify data volume: `docker volume inspect catalaist_catalai-data`
- Check container status: `docker ps -a`

## Version Information

- Docker Compose File Version: 3.8 (deprecated, removed in current version)
- Node.js Version: 20 Alpine
- React Version: 18.2.0
- nginx Version: Latest Alpine

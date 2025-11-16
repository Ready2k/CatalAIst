# Port Reference Guide

Quick reference for all ports used in CatalAIst across different environments.

## Local Development (npm run dev)

**Configuration Files:** `.env` and `frontend/.env.local`

| Service  | Port | URL                        | Config File            |
|----------|------|----------------------------|------------------------|
| Backend  | 4000 | http://localhost:4000      | `.env` → `PORT=4000`   |
| Frontend | 4001 | http://localhost:4001      | `frontend/.env.local`  |

**Why these ports?**
- Avoids conflicts with common services
- Clear separation between backend and frontend
- Easy to remember (4000, 4001)

## Docker Development (docker-compose.yml)

**Configuration File:** `docker-compose.yml`

| Service  | Internal Port | External Port | URL                   |
|----------|---------------|---------------|-----------------------|
| Backend  | 8080          | 8080          | http://localhost:8080 |
| Frontend | 8080          | 80            | http://localhost      |

**Why these ports?**
- Standard HTTP port (80) for frontend
- Backend on 8080 (common alternative HTTP port)
- Matches production-like setup

## Docker Production (docker-compose.prod.yml)

**Configuration File:** `docker-compose.prod.yml`

| Service  | Internal Port | External Port | URL                    |
|----------|---------------|---------------|------------------------|
| nginx    | 80/443        | 80/443        | http(s)://domain.com   |
| Backend  | 8080          | (internal)    | (proxied via nginx)    |
| Frontend | 8080          | (internal)    | (proxied via nginx)    |

**Why these ports?**
- nginx handles all external traffic on 80/443
- Backend and frontend are internal only
- nginx proxies `/api/*` to backend
- nginx serves frontend static files

## Port Defaults in Code

### Backend (backend/src/index.ts)

```typescript
const PORT = parseInt(process.env.PORT || '4000', 10);
```

**Default:** 4000 (local development)

**Fallback CORS origins:**
```typescript
['http://localhost:4001', 'http://localhost:3000', 'http://localhost:80']
```

### Frontend (frontend/.env.local)

```bash
PORT=4001
REACT_APP_API_URL=http://localhost:4000
```

**Default:** 4001 (local development)  
**API URL:** http://localhost:4000

### Frontend Proxy (frontend/package.json)

```json
"proxy": "http://localhost:4000"
```

**Fallback:** If `REACT_APP_API_URL` is not set, uses proxy

## Environment-Specific Configuration

### Local Development

```bash
# .env
PORT=4000
ALLOWED_ORIGINS=http://localhost:4001,http://localhost:3000

# frontend/.env.local
PORT=4001
REACT_APP_API_URL=http://localhost:4000
```

### Docker Development

```bash
# .env (or docker-compose.yml)
PORT=8080
ALLOWED_ORIGINS=http://localhost:80,http://localhost

# Frontend (built into image)
REACT_APP_API_URL=http://localhost:8080
```

### Docker Production

```bash
# .env (or docker-compose.prod.yml)
PORT=8080
ALLOWED_ORIGINS=https://your-domain.com

# Frontend (built into image)
REACT_APP_API_URL=  # Empty - uses relative URLs via nginx
```

## Port Conflicts

### If Port 4000 is in Use

**Option 1: Kill the process**
```bash
# Mac/Linux
lsof -ti:4000 | xargs kill

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

**Option 2: Use different port**
```bash
# .env
PORT=4002

# frontend/.env.local
REACT_APP_API_URL=http://localhost:4002
```

### If Port 4001 is in Use

**Option 1: Kill the process**
```bash
# Mac/Linux
lsof -ti:4001 | xargs kill

# Windows
netstat -ano | findstr :4001
taskkill /PID <PID> /F
```

**Option 2: Use different port**
```bash
# frontend/.env.local
PORT=4002

# Update CORS in .env
ALLOWED_ORIGINS=http://localhost:4002
```

## Common Port Combinations

### Standard (Recommended)
- Backend: 4000
- Frontend: 4001

### Alternative 1
- Backend: 8080
- Frontend: 3000

### Alternative 2
- Backend: 5000
- Frontend: 5001

### Docker
- Backend: 8080 (internal)
- Frontend: 80 (external)

## Checking Active Ports

### Mac/Linux
```bash
# Check specific port
lsof -i :4000

# Check all Node processes
lsof -i -P | grep node

# Check all listening ports
netstat -an | grep LISTEN
```

### Windows
```bash
# Check specific port
netstat -ano | findstr :4000

# Check all listening ports
netstat -ano | findstr LISTENING

# Find process by PID
tasklist | findstr <PID>
```

## Port Security

### Local Development
- Ports only accessible from localhost
- No external access by default
- Safe for development

### Production
- Only ports 80 and 443 exposed
- Backend and frontend internal only
- Firewall configured to block other ports

## Troubleshooting

### "Port already in use"
See "Port Conflicts" section above

### "CORS error"
Check `ALLOWED_ORIGINS` includes your frontend port

### "404 on API calls"
Check `REACT_APP_API_URL` points to correct backend port

### "Connection refused"
Check backend is running on expected port

## Quick Reference

| Environment       | Backend | Frontend | Access                |
|-------------------|---------|----------|-----------------------|
| Local Dev         | 4000    | 4001     | http://localhost:4001 |
| Docker Dev        | 8080    | 80       | http://localhost      |
| Docker Prod       | 8080*   | 80/443*  | https://domain.com    |

*Internal ports, proxied via nginx

---

**Last Updated:** November 10, 2025  
**Version:** 2.1.1

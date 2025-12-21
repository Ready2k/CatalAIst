# CatalAIst Quick Start Guide

## Choose Your Development Mode

CatalAIst supports two development modes:

- **Docker Mode** (Recommended for production): Uses Docker containers, ports 80/8080
- **Local Mode** (Recommended for development): Uses npm scripts, ports 4001/4000

## First Time Setup

### Docker Mode (Recommended)

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd CatalAIst

# 2. Run setup (creates .env, builds images, starts services)
./catalai.sh setup

# 3. Access the application
# Frontend: http://localhost:80
# Backend:  http://localhost:8080
```

### Local Development Mode

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd CatalAIst

# 2. Run local setup (installs dependencies, creates configs)
./catalai.sh setup --local

# 3. Create admin user
./catalai.sh admin --local

# 4. Start services
./catalai.sh start --local

# 5. Access the application
# Frontend: http://localhost:4001
# Backend:  http://localhost:4000
```

## Daily Operations

### Docker Mode

```bash
# Start services
./catalai.sh start

# Stop services  
./catalai.sh stop

# Restart services
./catalai.sh restart

# Check status
./catalai.sh status

# View logs (follow mode)
./catalai.sh logs -f

# Check health
./catalai.sh health
```

### Local Development Mode

```bash
# Start services (runs in foreground)
./catalai.sh start --local

# Stop services (from another terminal)
./catalai.sh stop --local

# Restart services
./catalai.sh restart --local

# Check status
./catalai.sh status --local

# Check health
./catalai.sh health --local

# View logs (shown in service terminals)
./catalai.sh logs --local
```

## Maintenance

### Docker Mode

```bash
# Create admin user
./catalai.sh admin

# Backup data
./catalai.sh backup

# Rebuild images
./catalai.sh build

# Update to latest version
./catalai.sh update

# Clean up everything
./catalai.sh clean
```

### Local Development Mode

```bash
# Create admin user
./catalai.sh admin --local

# Build application
./catalai.sh build --local

# Clean build artifacts
./catalai.sh clean --local

# Update to latest version
./catalai.sh update
```

## Troubleshooting

### Docker Mode

```bash
# View specific service logs
./catalai.sh logs backend
./catalai.sh logs frontend

# Check what's running
./catalai.sh status

# Health check
./catalai.sh health

# Restart if issues
./catalai.sh restart
```

### Local Development Mode

```bash
# Check process status
./catalai.sh status --local

# Health check
./catalai.sh health --local

# Restart if issues
./catalai.sh restart --local

# Check individual terminals for detailed logs
```

## Service URLs

### Docker Mode
- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:8080  
- **Health Check:** http://localhost:8080/health

### Local Development Mode
- **Frontend:** http://localhost:4001
- **Backend API:** http://localhost:4000  
- **Health Check:** http://localhost:4000/health

## Help

```bash
# Show all commands
./catalai.sh --help

# Or just
./catalai.sh
```

## Mode Selection

You can specify the mode with each command:

```bash
./catalai.sh start --docker    # Docker mode (default)
./catalai.sh start --local     # Local development mode
```

That's it! The `catalai.sh` script handles everything for both modes. 🚀
# Scripts Directory

This directory contains utility scripts for CatalAIst development and maintenance.

## Main Management Script

**`../catalai.sh`** - Primary management script for CatalAIst operations:
- `./catalai.sh start` - Start services
- `./catalai.sh stop` - Stop services  
- `./catalai.sh restart` - Restart services
- `./catalai.sh status` - Check status
- `./catalai.sh logs -f` - Follow logs
- `./catalai.sh health` - Health check
- `./catalai.sh setup` - Initial setup
- `./catalai.sh build` - Rebuild images
- `./catalai.sh backup` - Backup data
- `./catalai.sh admin` - Create admin user
- `./catalai.sh update` - Update application
- `./catalai.sh clean` - Clean up everything

## Structure

- **setup/** - Setup and installation scripts
  - `create-frontend-env.sh` - Creates frontend environment file
  - `setup-local-dev.sh` - Local development setup (Linux/macOS)
  - `setup-local-dev.ps1` - Local development setup (Windows)
  - `setup-https.sh` - HTTPS configuration
  - `install-service.sh` - Install as systemd service
  - `catalai.service` - Systemd service template

- **tests/** - Test scripts
  - `test-import.js` - Import functionality tests
  - `test-regional-inference.js` - Regional inference tests
  - `test-users-endpoint.sh` - User endpoint tests

- **debug/** - Debug utilities
  - `debug-regional-inference.js` - Regional inference debugging

- **Root scripts** - General utilities
  - `CLEANUP_DATA_DIRECTORIES.sh` - Clean up data directories
  - `fix-cors.sh` - Fix CORS configuration
  - `fix-docker-admin.sh` - Fix Docker admin issues
  - `release-v2.0.sh` - Release script for v2.0
  - `update-frontend.sh` - Update frontend
  - `update-v2.1.sh` - Update to v2.1

## Usage

Most scripts should be run from the project root directory:

```bash
# From CatalAIst root - use the main management script
./catalai.sh start
./catalai.sh logs -f

# Or run specific utility scripts
./scripts/fix-cors.sh
./scripts/setup/setup-local-dev.sh
```

## System Service Installation

To run CatalAIst as a system service:

```bash
# Install service (requires sudo)
sudo ./scripts/setup/install-service.sh

# Control service
sudo systemctl start catalai
sudo systemctl stop catalai
sudo systemctl status catalai
```

See individual script files for specific usage instructions.
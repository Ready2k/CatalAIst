# CatalAIst Management Script for Windows (PowerShell)
# Provides easy start, stop, restart, and status management for both Docker and local development

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Green ([string]$Message) { Write-Host $Message -ForegroundColor Green }
function Write-Yellow ([string]$Message) { Write-Host $Message -ForegroundColor Yellow }
function Write-Red ([string]$Message) { Write-Host $Message -ForegroundColor Red }
function Write-Blue ([string]$Message) { Write-Host $Message -ForegroundColor Blue }

# Script directory
$SCRIPT_DIR = $PSScriptRoot

# Default mode
$MODE = "docker"

# Function to print usage
function Show-Usage {
    Write-Host "CatalAIst Management Script (Windows)"
    Write-Host ""
    Write-Host "Usage: .\catalai.ps1 [COMMAND] [OPTIONS]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start           Start CatalAIst services"
    Write-Host "  stop            Stop CatalAIst services"
    Write-Host "  restart         Restart CatalAIst services"
    Write-Host "  status          Show service status"
    Write-Host "  logs            Show service logs"
    Write-Host "  health          Check service health"
    Write-Host "  setup           Run initial setup (first time only)"
    Write-Host "  build           Build/rebuild application"
    Write-Host "  clean           Stop and remove containers/volumes (Docker) or clean build (Local)"
    Write-Host "  admin           Create admin user"
    Write-Host "  password-reset  Reset a user's password"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  --docker        Use Docker mode (default)"
    Write-Host "  --local         Use local development mode"
    Write-Host "  -h, --help      Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\catalai.ps1 start              # Start services (Docker mode)"
    Write-Host "  .\catalai.ps1 start --local      # Start services (Local dev mode)"
    Write-Host "  .\catalai.ps1 status             # Check status"
    Write-Host ""
}

# Function to check requirements
function Check-Requirements {
    if ($MODE -eq "docker") {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Red "Error: Docker is not installed"
            Write-Host "Please install Docker first: https://docs.docker.com/get-docker/"
            exit 1
        }
    } else {
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            Write-Red "Error: Node.js is not installed"
            Write-Host "Please install Node.js first: https://nodejs.org/"
            exit 1
        }
        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
            Write-Red "Error: npm is not installed"
            exit 1
        }
    }
}

# Function to start services
function Start-Services {
    if ($MODE -eq "docker") {
        Write-Blue "Starting CatalAIst services (Docker mode)..."
        Set-Location $SCRIPT_DIR
        docker-compose up -d
        Write-Green "✓ Services started in background"
        Show-Status
    } else {
        Write-Blue "Starting CatalAIst services (Local development mode)..."
        if (-not (Test-Path "$SCRIPT_DIR/backend/node_modules")) {
            Write-Yellow "Warning: Backend dependencies not installed. Run .\catalai.ps1 setup --local"
            exit 1
        }
        
        if (Test-Path "$SCRIPT_DIR/.env") {
            Copy-Item "$SCRIPT_DIR/.env" "$SCRIPT_DIR/backend/.env" -Force
        }

        Write-Host "Starting services in separate windows..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start" -WindowStyle Normal
        
        Write-Host ""
        Write-Green "✓ Services starting in separate windows"
        Write-Host "Backend: http://localhost:4000"
        Write-Host "Frontend: http://localhost:4001"
    }
}

# Function to stop services
function Stop-Services {
    if ($MODE -eq "docker") {
        Write-Blue "Stopping CatalAIst services (Docker mode)..."
        Set-Location $SCRIPT_DIR
        docker-compose down
        Write-Green "✓ Services stopped"
    } else {
        Write-Blue "Stopping CatalAIst services (Local development mode)..."
        Write-Yellow "Note: Please close the terminal windows running the services manually."
    }
}

# Function to show status
function Show-Status {
    if ($MODE -eq "docker") {
        Write-Blue "CatalAIst Service Status (Docker mode):"
        docker-compose ps
    } else {
        Write-Blue "CatalAIst Service Status (Local development mode):"
        # Simple port check
        $backend = Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet
        $frontend = Test-NetConnection -ComputerName localhost -Port 4001 -InformationLevel Quiet
        
        if ($backend) { Write-Green "✓ Backend: Running (4000)" } else { Write-Red "✗ Backend: Not running" }
        if ($frontend) { Write-Green "✓ Frontend: Running (4001)" } else { Write-Red "✗ Frontend: Not running" }
    }
}

# Function to run setup
function Run-Setup {
    if ($MODE -eq "docker") {
        Write-Blue "Running CatalAIst setup (Docker mode)..."
        & "$SCRIPT_DIR/setup-docker.sh"
    } else {
        Write-Blue "Running CatalAIst setup (Local development mode)..."
        Set-Location "$SCRIPT_DIR/backend"
        npm install
        Set-Location "$SCRIPT_DIR/frontend"
        npm install
        Set-Location "$SCRIPT_DIR/shared"
        npm install
        Write-Green "✓ Local development setup complete"
    }
}

# Function to check health
function Check-Health {
    $port = if ($MODE -eq "docker") { 8080 } else { 4000 }
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing
        Write-Green "✓ System is healthy: $($resp.StatusCode)"
    } catch {
        Write-Red "✗ Health check failed: $($_.Exception.Message)"
    }
}

# Main Command Parsing
$COMMAND = $args[0]
foreach ($arg in $args) {
    if ($arg -eq "--local") { $MODE = "local" }
    if ($arg -eq "--docker") { $MODE = "docker" }
    if ($arg -eq "-h" -or $arg -eq "--help") { Show-Usage; exit 0 }
}

Check-Requirements

switch ($COMMAND) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Stop-Services; Start-Services }
    "status" { Show-Status }
    "health" { Check-Health }
    "setup" { Run-Setup }
    "admin" {
        if ($MODE -eq "docker") {
            docker-compose exec backend npm run create-admin
        } else {
            Set-Location "$SCRIPT_DIR/backend"
            npm run create-admin:dev
        }
    }
    "password-reset" {
        if ($MODE -eq "docker") {
            docker-compose exec backend npm run reset-password
        } else {
            Set-Location "$SCRIPT_DIR/backend"
            npm run reset-password:dev
        }
    }
    default {
        if ($COMMAND) { Write-Red "Unknown command: $COMMAND" }
        Show-Usage
    }
}

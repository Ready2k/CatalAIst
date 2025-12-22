#!/bin/bash
# CatalAIst Management Script
# Provides easy start, stop, restart, and status management for both Docker and local development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default mode
MODE="docker"

# Function to print usage
usage() {
    echo "CatalAIst Management Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start       Start CatalAIst services"
    echo "  stop        Stop CatalAIst services"
    echo "  restart     Restart CatalAIst services"
    echo "  status      Show service status"
    echo "  logs        Show service logs"
    echo "  health      Check service health"
    echo "  setup       Run initial setup (first time only)"
    echo "  build       Build/rebuild application"
    echo "  clean       Stop and remove containers/volumes (Docker) or clean build (Local)"
    echo "  backup      Backup application data"
    echo "  restore     Restore application data"
    echo "  admin       Create admin user"
    echo "  update      Update to latest version"
    echo ""
    echo "Options:"
    echo "  --docker    Use Docker mode (default)"
    echo "  --local     Use local development mode"
    echo "  -f, --follow    Follow logs (for logs command)"
    echo "  -d, --detach    Run in background (for start command, Docker only)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start              # Start services (Docker mode)"
    echo "  $0 start --local      # Start services (Local dev mode)"
    echo "  $0 logs -f            # Follow logs"
    echo "  $0 restart --local    # Restart in local mode"
    echo "  $0 status             # Check status"
    echo ""
    echo "Modes:"
    echo "  Docker mode:  Uses docker-compose, ports 80/8080"
    echo "  Local mode:   Uses npm scripts, ports 4001/4000"
    echo ""
}

# Function to check if Docker is available
check_docker() {
    if [ "$MODE" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}Error: Docker is not installed${NC}"
            echo "Please install Docker first: https://docs.docker.com/get-docker/"
            exit 1
        fi

        if ! command -v docker-compose &> /dev/null; then
            echo -e "${RED}Error: docker-compose is not installed${NC}"
            echo "Please install docker-compose first: https://docs.docker.com/compose/install/"
            exit 1
        fi
    fi
}

# Function to check if Node.js is available (for local mode)
check_node() {
    if [ "$MODE" = "local" ]; then
        if ! command -v node &> /dev/null; then
            echo -e "${RED}Error: Node.js is not installed${NC}"
            echo "Please install Node.js first: https://nodejs.org/"
            exit 1
        fi

        if ! command -v npm &> /dev/null; then
            echo -e "${RED}Error: npm is not installed${NC}"
            echo "Please install npm first (usually comes with Node.js)"
            exit 1
        fi
    fi
}

# Function to check if .env exists
check_env() {
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        echo -e "${YELLOW}Warning: .env file not found${NC}"
        echo "Run '$0 setup' first to create the environment configuration"
        return 1
    fi
    return 0
}

# Function to check if local dev is set up
check_local_setup() {
    if [ "$MODE" = "local" ]; then
        if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
            echo -e "${YELLOW}Warning: Backend dependencies not installed${NC}"
            echo "Run '$0 setup --local' first to set up local development"
            return 1
        fi
        
        if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
            echo -e "${YELLOW}Warning: Frontend dependencies not installed${NC}"
            echo "Run '$0 setup --local' first to set up local development"
            return 1
        fi
        
        if [ ! -f "$SCRIPT_DIR/frontend/.env.local" ]; then
            echo -e "${YELLOW}Warning: Frontend .env.local not found${NC}"
            echo "Run '$0 setup --local' first to set up local development"
            return 1
        fi
    fi
    return 0
}

# Function to start services
start_services() {
    local detach_flag=""
    
    if [ "$1" = "-d" ] || [ "$1" = "--detach" ]; then
        detach_flag="-d"
    fi
    
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Starting CatalAIst services (Docker mode)...${NC}"
        
        if ! check_env; then
            exit 1
        fi
        
        cd "$SCRIPT_DIR"
        docker-compose up $detach_flag
        
        if [ -n "$detach_flag" ]; then
            echo -e "${GREEN}✓ Services started in background${NC}"
            echo ""
            show_status
        fi
    else
        echo -e "${BLUE}Starting CatalAIst services (Local development mode)...${NC}"
        
        if ! check_env || ! check_local_setup; then
            exit 1
        fi
        
        if [ -n "$detach_flag" ]; then
            echo -e "${YELLOW}Note: Detach mode not supported in local development${NC}"
            echo "Services will run in foreground. Use Ctrl+C to stop."
            echo ""
        fi
        
        # Check if services are already running
        if pgrep -f "ts-node-dev.*src/index.ts" > /dev/null; then
            echo -e "${YELLOW}Backend appears to be already running${NC}"
        fi
        
        if pgrep -f "react-scripts start" > /dev/null; then
            echo -e "${YELLOW}Frontend appears to be already running${NC}"
        fi
        
        echo "Starting backend and frontend..."
        echo "Backend will run on: http://localhost:4000"
        echo "Frontend will run on: http://localhost:4001"
        echo ""
        
        # Ensure .env is available to services
        if [ -f "$SCRIPT_DIR/.env" ]; then
            echo "Syncing .env to backend..."
            cp "$SCRIPT_DIR/.env" "$SCRIPT_DIR/backend/.env"
        fi

        echo "Press Ctrl+C to stop both services"
        echo ""
        
        # Start backend in background
        cd "$SCRIPT_DIR/backend"
        npm run dev &
        BACKEND_PID=$!
        
        # Wait a moment for backend to start
        sleep 3
        
        # Start frontend in background
        cd "$SCRIPT_DIR/frontend"
        npm start &
        FRONTEND_PID=$!
        
        # Function to cleanup on exit
        cleanup() {
            echo ""
            echo -e "${BLUE}Stopping services...${NC}"
            kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
            wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
            echo -e "${GREEN}✓ Services stopped${NC}"
            exit 0
        }
        
        # Set trap to cleanup on Ctrl+C
        trap cleanup SIGINT SIGTERM
        
        # Wait for both processes
        wait $BACKEND_PID $FRONTEND_PID
    fi
}

# Function to stop services
stop_services() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Stopping CatalAIst services (Docker mode)...${NC}"
        
        cd "$SCRIPT_DIR"
        docker-compose down
        
        echo -e "${GREEN}✓ Services stopped${NC}"
    else
        echo -e "${BLUE}Stopping CatalAIst services (Local development mode)...${NC}"
        
        # Kill backend processes
        # Kill backend processes
        if pgrep -f "ts-node-dev.*src/index.ts" > /dev/null; then
            pkill -f "ts-node-dev.*src/index.ts"
            
            # Wait for process to exit
            for i in {1..5}; do
                if ! pgrep -f "ts-node-dev.*src/index.ts" > /dev/null; then
                    break
                fi
                sleep 0.5
            done
            
            # Force kill if still running
            if pgrep -f "ts-node-dev.*src/index.ts" > /dev/null; then
                pkill -9 -f "ts-node-dev.*src/index.ts"
                echo -e "${YELLOW}Backend force killed${NC}"
            else
                echo -e "${GREEN}✓ Backend stopped${NC}"
            fi
        else
            echo -e "${YELLOW}Backend not running${NC}"
        fi
        
        # Kill frontend processes
        if pgrep -f "react-scripts start" > /dev/null; then
            pkill -f "react-scripts start"
            
            # Wait for process to exit
            for i in {1..5}; do
                if ! pgrep -f "react-scripts start" > /dev/null; then
                    break
                fi
                sleep 0.5
            done
            
            if pgrep -f "react-scripts start" > /dev/null; then
                pkill -9 -f "react-scripts start"
                echo -e "${YELLOW}Frontend force killed${NC}"
            else
                echo -e "${GREEN}✓ Frontend stopped${NC}"
            fi
        else
            echo -e "${YELLOW}Frontend not running${NC}"
        fi
        
        # Also kill any node processes that might be related
        pkill -f "node.*react-scripts" 2>/dev/null || true
        
        echo -e "${GREEN}✓ All services stopped${NC}"
    fi
}

# Function to restart services
restart_services() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Restarting CatalAIst services (Docker mode)...${NC}"
        
        cd "$SCRIPT_DIR"
        docker-compose restart
        
        echo -e "${GREEN}✓ Services restarted${NC}"
    else
        echo -e "${BLUE}Restarting CatalAIst services (Local development mode)...${NC}"
        
        stop_services
        sleep 2
        start_services
    fi
    
    echo ""
    show_status
}

# Function to show service status
show_status() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}CatalAIst Service Status (Docker mode):${NC}"
        echo ""
        
        cd "$SCRIPT_DIR"
        docker-compose ps
        
        echo ""
        echo -e "${BLUE}Service URLs:${NC}"
        echo "  Frontend: http://localhost:80"
        echo "  Backend:  http://localhost:8080"
        echo "  Health:   http://localhost:8080/health"
    else
        echo -e "${BLUE}CatalAIst Service Status (Local development mode):${NC}"
        echo ""
        
        # Check backend
        if pgrep -f "ts-node-dev.*src/index.ts" > /dev/null; then
            echo -e "${GREEN}✓ Backend: Running${NC}"
        else
            echo -e "${RED}✗ Backend: Not running${NC}"
        fi
        
        # Check frontend
        if pgrep -f "react-scripts start" > /dev/null; then
            echo -e "${GREEN}✓ Frontend: Running${NC}"
        else
            echo -e "${RED}✗ Frontend: Not running${NC}"
        fi
        
        echo ""
        echo -e "${BLUE}Service URLs:${NC}"
        echo "  Frontend: http://localhost:4001"
        echo "  Backend:  http://localhost:4000"
        echo "  Health:   http://localhost:4000/health"
    fi
    echo ""
}

# Function to show logs
show_logs() {
    local follow_flag=""
    local service=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow_flag="-f"
                shift
                ;;
            backend|frontend)
                service="$1"
                shift
                ;;
            *)
                service="$1"
                shift
                ;;
        esac
    done
    
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Showing logs for CatalAIst services (Docker mode)...${NC}"
        
        cd "$SCRIPT_DIR"
        docker-compose logs $follow_flag $service
    else
        echo -e "${BLUE}Showing logs for CatalAIst services (Local development mode)...${NC}"
        echo -e "${YELLOW}Note: Local development logs are shown in the terminal where services are running${NC}"
        echo ""
        
        if [ -n "$service" ]; then
            case $service in
                backend)
                    echo "Backend logs: Check the terminal where 'npm run dev' is running in backend/"
                    ;;
                frontend)
                    echo "Frontend logs: Check the terminal where 'npm start' is running in frontend/"
                    ;;
                *)
                    echo "Unknown service: $service"
                    echo "Available services: backend, frontend"
                    ;;
            esac
        else
            echo "Local development logs are shown in the terminals where services are running:"
            echo "  Backend:  Terminal running 'npm run dev' in backend/"
            echo "  Frontend: Terminal running 'npm start' in frontend/"
        fi
    fi
}

# Function to check health
check_health() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Checking CatalAIst health (Docker mode)...${NC}"
        echo ""
        
        # Check backend health
        if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend: Healthy (http://localhost:8080)${NC}"
        else
            echo -e "${RED}✗ Backend: Unhealthy (http://localhost:8080)${NC}"
        fi
        
        # Check frontend
        if curl -s -f http://localhost:80 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend: Healthy (http://localhost:80)${NC}"
        else
            echo -e "${RED}✗ Frontend: Unhealthy (http://localhost:80)${NC}"
        fi
        
        echo ""
        echo -e "${BLUE}Container Status:${NC}"
        cd "$SCRIPT_DIR"
        docker-compose ps
    else
        echo -e "${BLUE}Checking CatalAIst health (Local development mode)...${NC}"
        echo ""
        
        # Check backend health
        if curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend: Healthy (http://localhost:4000)${NC}"
        else
            echo -e "${RED}✗ Backend: Unhealthy (http://localhost:4000)${NC}"
        fi
        
        # Check frontend
        if curl -s -f http://localhost:4001 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend: Healthy (http://localhost:4001)${NC}"
        else
            echo -e "${RED}✗ Frontend: Unhealthy (http://localhost:4001)${NC}"
        fi
        
        echo ""
        echo -e "${BLUE}Process Status:${NC}"
        if pgrep -f "ts-node-dev.*src/index.ts" > /dev/null; then
            echo -e "${GREEN}✓ Backend process: Running${NC}"
        else
            echo -e "${RED}✗ Backend process: Not running${NC}"
        fi
        
        if pgrep -f "react-scripts start" > /dev/null; then
            echo -e "${GREEN}✓ Frontend process: Running${NC}"
        else
            echo -e "${RED}✗ Frontend process: Not running${NC}"
        fi
    fi
}

# Function to run setup
run_setup() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Running CatalAIst setup (Docker mode)...${NC}"
        
        cd "$SCRIPT_DIR"
        ./setup-docker.sh
    else
        echo -e "${BLUE}Running CatalAIst setup (Local development mode)...${NC}"
        
        cd "$SCRIPT_DIR"
        ./scripts/setup/setup-local-dev.sh
        
        echo ""
        echo -e "${GREEN}✓ Local development setup complete${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Create admin user: $0 admin --local"
        echo "2. Start services: $0 start --local"
    fi
}

# Function to build images/application
build_images() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Building CatalAIst Docker images...${NC}"

        # Compile backend if npm is available to ensure fresh code
        if command -v npm &> /dev/null; then
            echo "Compiling backend TypeScript..."
            cd "$SCRIPT_DIR/backend"
            # Ensure dependencies are installed if missing
            if [ ! -d "node_modules" ]; then
                npm ci
            fi
            npm run build
        else
             echo -e "${YELLOW}Warning: npm not found. Docker image will use existing 'backend/dist'.${NC}"
             echo "If you have changed backend code, please install Node/npm or compile manually."
        fi
        
        cd "$SCRIPT_DIR"
        docker-compose build --no-cache
        
        echo -e "${GREEN}✓ Docker images built successfully${NC}"
    else
        echo -e "${BLUE}Building CatalAIst application (Local development mode)...${NC}"
        
        # Build backend
        echo "Building backend..."
        cd "$SCRIPT_DIR/backend"
        npm run build
        
        # Build frontend
        echo "Building frontend..."
        cd "$SCRIPT_DIR/frontend"
        npm run build
        
        echo -e "${GREEN}✓ Application built successfully${NC}"
    fi
}

# Function to clean up
clean_up() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${YELLOW}This will stop and remove all containers and volumes${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Cleaning up CatalAIst (Docker mode)...${NC}"
            
            cd "$SCRIPT_DIR"
            docker-compose down -v --remove-orphans
            docker system prune -f
            
            echo -e "${GREEN}✓ Docker cleanup complete${NC}"
        else
            echo "Cleanup cancelled"
        fi
    else
        echo -e "${YELLOW}This will clean build artifacts and stop all processes${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Cleaning up CatalAIst (Local development mode)...${NC}"
            
            # Stop services first
            stop_services
            
            # Clean build artifacts
            echo "Cleaning build artifacts..."
            rm -rf "$SCRIPT_DIR/backend/dist" 2>/dev/null || true
            rm -rf "$SCRIPT_DIR/frontend/build" 2>/dev/null || true
            
            # Clean node_modules if requested
            read -p "Also remove node_modules? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Removing node_modules..."
                rm -rf "$SCRIPT_DIR/backend/node_modules" 2>/dev/null || true
                rm -rf "$SCRIPT_DIR/frontend/node_modules" 2>/dev/null || true
                rm -rf "$SCRIPT_DIR/shared/node_modules" 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✓ Local cleanup complete${NC}"
        else
            echo "Cleanup cancelled"
        fi
    fi
}

# Function to backup data
backup_data() {
    local backup_file="catalai-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    echo -e "${BLUE}Creating backup: $backup_file${NC}"
    
    cd "$SCRIPT_DIR"
    docker run --rm \
        -v catalai_catalai-data:/data \
        -v "$(pwd):/backup" \
        alpine tar czf "/backup/$backup_file" /data
    
    echo -e "${GREEN}✓ Backup created: $backup_file${NC}"
}

# Function to restore data
restore_data() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please specify backup file${NC}"
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        echo -e "${RED}Error: Backup file not found: $1${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}This will overwrite existing data${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Restoring from: $1${NC}"
        
        cd "$SCRIPT_DIR"
        docker run --rm \
            -v catalai_catalai-data:/data \
            -v "$(pwd):/backup" \
            alpine tar xzf "/backup/$1" -C /
        
        echo -e "${GREEN}✓ Data restored from: $1${NC}"
    else
        echo "Restore cancelled"
    fi
}

# Function to create admin user
create_admin() {
    if [ "$MODE" = "docker" ]; then
        echo -e "${BLUE}Creating admin user (Docker mode)...${NC}"
        
        cd "$SCRIPT_DIR"
        docker-compose exec backend npm run create-admin
    else
        echo -e "${BLUE}Creating admin user (Local development mode)...${NC}"
        
        cd "$SCRIPT_DIR/backend"
        npm run create-admin:dev
    fi
}

# Function to update application
update_app() {
    echo -e "${BLUE}Updating CatalAIst...${NC}"
    
    # Backup first
    echo "Creating backup before update..."
    backup_data
    
    # Pull latest code
    echo "Pulling latest code..."
    git pull
    
    # Rebuild and restart
    echo "Rebuilding images..."
    build_images
    
    echo "Restarting services..."
    restart_services
    
    echo -e "${GREEN}✓ Update complete${NC}"
}

# Main script logic
main() {
    # Parse mode flags first
    local args=()
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                MODE="docker"
                shift
                ;;
            --local)
                MODE="local"
                shift
                ;;
            -h|--help|help)
                usage
                exit 0
                ;;
            *)
                args+=("$1")
                shift
                ;;
        esac
    done
    
    # Restore arguments
    set -- "${args[@]}"
    
    # Check requirements based on mode
    if [ "$MODE" = "docker" ]; then
        check_docker
    else
        check_node
    fi
    
    # Parse command
    case "${1:-}" in
        start)
            shift
            start_services "$@"
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            shift
            show_logs "$@"
            ;;
        health)
            check_health
            ;;
        setup)
            run_setup
            ;;
        build)
            build_images
            ;;
        clean)
            clean_up
            ;;
        backup)
            if [ "$MODE" = "local" ]; then
                echo -e "${YELLOW}Backup is only available in Docker mode${NC}"
                echo "In local mode, your data is in the 'data/' directory"
                exit 1
            fi
            backup_data
            ;;
        restore)
            if [ "$MODE" = "local" ]; then
                echo -e "${YELLOW}Restore is only available in Docker mode${NC}"
                echo "In local mode, your data is in the 'data/' directory"
                exit 1
            fi
            shift
            restore_data "$@"
            ;;
        admin)
            create_admin
            ;;
        update)
            update_app
            ;;
        "")
            echo -e "${YELLOW}No command specified${NC}"
            echo ""
            usage
            exit 1
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
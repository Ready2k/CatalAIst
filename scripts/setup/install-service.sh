#!/bin/bash
# Install CatalAIst as a systemd service

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get the absolute path to CatalAIst directory
CATALAI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Installing CatalAIst as a systemd service..."
echo "CatalAIst directory: $CATALAI_DIR"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Use: sudo $0"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Create service file
SERVICE_FILE="/etc/systemd/system/catalai.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=CatalAIst AI-Powered Process Classification System
Requires=docker.service
After=docker.service
StartLimitIntervalSec=0

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$CATALAI_DIR
ExecStart=$CATALAI_DIR/catalai.sh start -d
ExecStop=$CATALAI_DIR/catalai.sh stop
ExecReload=$CATALAI_DIR/catalai.sh restart
TimeoutStartSec=300
TimeoutStopSec=120
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable catalai.service

echo -e "${GREEN}✓ CatalAIst service installed successfully${NC}"
echo ""
echo "Service commands:"
echo "  sudo systemctl start catalai     # Start service"
echo "  sudo systemctl stop catalai      # Stop service"
echo "  sudo systemctl restart catalai   # Restart service"
echo "  sudo systemctl status catalai    # Check status"
echo "  sudo systemctl enable catalai    # Enable auto-start"
echo "  sudo systemctl disable catalai   # Disable auto-start"
echo ""
echo "Logs:"
echo "  sudo journalctl -u catalai -f    # Follow service logs"
echo ""
echo -e "${YELLOW}Note: Make sure to run './catalai.sh setup' first if you haven't already${NC}"
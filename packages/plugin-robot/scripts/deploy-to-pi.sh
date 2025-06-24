#!/bin/bash

# ElizaOS Robot Plugin Deployment Script for Raspberry Pi 5
# This script deploys the robot control system to a Raspberry Pi 5

set -e

# Configuration
PI_HOST="${PI_HOST:-raspberrypi.local}"
PI_USER="${PI_USER:-pi}"
PI_PORT="${PI_PORT:-22}"
DEPLOY_DIR="/home/$PI_USER/eliza-robot"
SERVICE_NAME="eliza-robot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}ElizaOS Robot Deployment Script${NC}"
echo "========================================"
echo "Target: $PI_USER@$PI_HOST:$PI_PORT"
echo "Deploy directory: $DEPLOY_DIR"
echo ""

# Check if we can connect to Pi
echo -e "${YELLOW}Checking connection to Raspberry Pi...${NC}"
if ! ssh -p "$PI_PORT" -o ConnectTimeout=5 "$PI_USER@$PI_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to Raspberry Pi at $PI_HOST${NC}"
    echo "Please ensure:"
    echo "  1. The Pi is powered on and connected to the network"
    echo "  2. SSH is enabled on the Pi"
    echo "  3. The hostname/IP is correct"
    exit 1
fi
echo -e "${GREEN}✓ Connection successful${NC}"

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build complete${NC}"

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
TEMP_DIR=$(mktemp -d)
DEPLOY_PACKAGE="$TEMP_DIR/eliza-robot-deploy.tar.gz"

# Copy necessary files
mkdir -p "$TEMP_DIR/deploy"
cp -r dist "$TEMP_DIR/deploy/"
cp package.json "$TEMP_DIR/deploy/"
cp -r scripts "$TEMP_DIR/deploy/"
cp -r urdf "$TEMP_DIR/deploy/" 2>/dev/null || true
cp -r config "$TEMP_DIR/deploy/" 2>/dev/null || true

# Create minimal package.json for production
cat > "$TEMP_DIR/deploy/package.json" << EOF
{
  "name": "@elizaos/plugin-robot",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@elizaos/core": "workspace:*",
    "serialport": "^12.0.0",
    "ws": "^8.16.0",
    "roslibjs": "^1.3.0"
  }
}
EOF

# Create systemd service file
cat > "$TEMP_DIR/deploy/$SERVICE_NAME.service" << EOF
[Unit]
Description=ElizaOS Robot Control Service
After=network.target

[Service]
Type=simple
User=$PI_USER
WorkingDirectory=$DEPLOY_DIR
Environment="NODE_ENV=production"
Environment="USE_SIMULATION=false"
Environment="ROBOT_SERIAL_PORT=/dev/ttyUSB0"
Environment="ROBOT_BAUD_RATE=115200"
Environment="ROS_WEBSOCKET_URL=ws://localhost:9090"
ExecStart=/usr/bin/node $DEPLOY_DIR/dist/index.js
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Create setup script for Pi
cat > "$TEMP_DIR/deploy/setup-pi.sh" << 'EOF'
#!/bin/bash

echo "Setting up ElizaOS Robot on Raspberry Pi..."

# Update system
sudo apt-get update

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    python3-pip \
    git \
    libudev-dev \
    libusb-1.0-0-dev

# Install Python dependencies for serial communication
pip3 install pyserial

# Add user to dialout group for serial port access
sudo usermod -a -G dialout $USER

# Set up serial port permissions
if [ -e /dev/ttyUSB0 ]; then
    sudo chmod 666 /dev/ttyUSB0
fi

# Create udev rule for consistent serial port naming
sudo tee /etc/udev/rules.d/99-robot-serial.rules > /dev/null << 'UDEV'
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", SYMLINK+="robot_serial", MODE="0666"
UDEV

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "Setup complete! Please log out and back in for group changes to take effect."
EOF

# Create startup script
cat > "$TEMP_DIR/deploy/start-robot.sh" << EOF
#!/bin/bash

# Start the robot control system
cd $DEPLOY_DIR

# Check serial port
if [ ! -e /dev/ttyUSB0 ]; then
    echo "Warning: Serial port /dev/ttyUSB0 not found"
    echo "Robot will start in simulation mode"
    export USE_SIMULATION=true
fi

# Start the service
npm start
EOF

chmod +x "$TEMP_DIR/deploy/setup-pi.sh"
chmod +x "$TEMP_DIR/deploy/start-robot.sh"

# Create archive
tar -czf "$DEPLOY_PACKAGE" -C "$TEMP_DIR/deploy" .
echo -e "${GREEN}✓ Deployment package created${NC}"

# Copy to Pi
echo -e "${YELLOW}Copying files to Raspberry Pi...${NC}"
ssh -p "$PI_PORT" "$PI_USER@$PI_HOST" "mkdir -p $DEPLOY_DIR"
scp -P "$PI_PORT" "$DEPLOY_PACKAGE" "$PI_USER@$PI_HOST:$DEPLOY_DIR/deploy.tar.gz"
echo -e "${GREEN}✓ Files copied${NC}"

# Extract and setup on Pi
echo -e "${YELLOW}Setting up on Raspberry Pi...${NC}"
ssh -p "$PI_PORT" "$PI_USER@$PI_HOST" << REMOTE_COMMANDS
cd $DEPLOY_DIR
tar -xzf deploy.tar.gz
rm deploy.tar.gz

# Install npm dependencies
echo "Installing dependencies..."
npm install --production

# Run setup script
bash setup-pi.sh

# Install systemd service
sudo cp $SERVICE_NAME.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

echo "Deployment complete!"
REMOTE_COMMANDS

echo -e "${GREEN}✓ Setup complete${NC}"

# Clean up
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}Deployment successful!${NC}"
echo ""
echo "To start the robot service:"
echo "  ssh $PI_USER@$PI_HOST"
echo "  sudo systemctl start $SERVICE_NAME"
echo ""
echo "To view logs:"
echo "  ssh $PI_USER@$PI_HOST"
echo "  sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "To check status:"
echo "  ssh $PI_USER@$PI_HOST"
echo "  sudo systemctl status $SERVICE_NAME"
echo ""

# Optional: Start the service immediately
read -p "Start the service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting robot service...${NC}"
    ssh -p "$PI_PORT" "$PI_USER@$PI_HOST" "sudo systemctl start $SERVICE_NAME"
    echo -e "${GREEN}✓ Service started${NC}"
    
    # Show initial logs
    echo ""
    echo "Initial logs:"
    ssh -p "$PI_PORT" "$PI_USER@$PI_HOST" "sudo journalctl -u $SERVICE_NAME -n 20"
fi 
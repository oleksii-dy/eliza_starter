#!/bin/bash

# AiNex Robot Setup Script
# This script sets up the environment for the AiNex humanoid robot

set -e

echo "==================================="
echo "AiNex Robot Environment Setup"
echo "==================================="

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Detected OS: $OS"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install system dependencies
echo ""
echo "Installing system dependencies..."

if [ "$OS" == "linux" ]; then
    # Update package list
    sudo apt-get update
    
    # Install serial port tools
    sudo apt-get install -y \
        minicom \
        picocom \
        python3-serial
    
    # Install camera tools
    sudo apt-get install -y \
        fswebcam \
        v4l-utils
    
    # Install ROS 2 dependencies (if not already installed)
    if ! command_exists ros2; then
        echo "ROS 2 not found. Please install ROS 2 Humble or later."
        echo "Visit: https://docs.ros.org/en/humble/Installation.html"
    else
        # Install ROS 2 packages
        sudo apt-get install -y \
            ros-$ROS_DISTRO-rosbridge-server \
            ros-$ROS_DISTRO-gazebo-ros \
            ros-$ROS_DISTRO-ros2-control \
            ros-$ROS_DISTRO-ros2-controllers
    fi
    
elif [ "$OS" == "macos" ]; then
    # Check if Homebrew is installed
    if ! command_exists brew; then
        echo "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install serial port tools
    brew install minicom
    
    # Install camera tools
    brew install imagesnap
    
    echo "Note: ROS 2 is not natively supported on macOS."
    echo "Consider using Docker or a Linux VM for simulation."
fi

# Set up serial port permissions (Linux only)
if [ "$OS" == "linux" ]; then
    echo ""
    echo "Setting up serial port permissions..."
    
    # Add user to dialout group for serial port access
    sudo usermod -a -G dialout $USER
    
    # Create udev rule for consistent serial port naming
    echo 'SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", SYMLINK+="ainex_robot"' | \
        sudo tee /etc/udev/rules.d/99-ainex-robot.rules
    
    # Reload udev rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    
    echo "Note: You may need to log out and back in for group changes to take effect."
fi

# Install Node.js dependencies
echo ""
echo "Installing Node.js dependencies..."
npm install

# Create default configuration
echo ""
echo "Creating default configuration..."

if [ ! -f .env ]; then
    cat > .env << EOL
# Robot Hardware Configuration
ROBOT_SERIAL_PORT=/dev/ttyUSB0
ROBOT_BAUD_RATE=115200

# ROS 2 Configuration
ROS_WEBSOCKET_URL=ws://localhost:9090
USE_SIMULATION=false

# Vision Configuration
VISION_CAMERA_NAME=USB Camera
VISION_MODE=BOTH
ENABLE_FACE_RECOGNITION=true

# Safety Configuration
MAX_JOINT_VELOCITY=2.0
MAX_JOINT_ACCELERATION=5.0

# ElizaOS Configuration
ELIZAOS_ENV=development
EOL
    echo "Created .env file with default configuration"
else
    echo ".env file already exists, skipping..."
fi

# Create directories
echo ""
echo "Creating project directories..."
mkdir -p urdf/meshes
mkdir -p config
mkdir -p logs
mkdir -p models/pretrained
mkdir -p models/checkpoints

# Download face detection models (if enabled)
if [ -f scripts/download-face-models.js ]; then
    echo ""
    echo "Downloading face detection models..."
    node scripts/download-face-models.js
fi

# Test serial port connection
echo ""
echo "Testing serial port connection..."
if [ "$OS" == "linux" ]; then
    SERIAL_PORT=${ROBOT_SERIAL_PORT:-/dev/ttyUSB0}
    if [ -e "$SERIAL_PORT" ]; then
        echo "Serial port $SERIAL_PORT found"
        # Test if we can access it
        if [ -r "$SERIAL_PORT" ] && [ -w "$SERIAL_PORT" ]; then
            echo "Serial port is accessible"
        else
            echo "Warning: Serial port exists but is not accessible"
            echo "You may need to run: sudo chmod 666 $SERIAL_PORT"
        fi
    else
        echo "Warning: Serial port $SERIAL_PORT not found"
        echo "Make sure the robot is connected"
    fi
fi

# Build the project
echo ""
echo "Building the project..."
npm run build

echo ""
echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Connect your AiNex robot to the serial port"
echo "2. If using simulation, start ROS 2 and Gazebo"
echo "3. Configure your .env file with correct settings"
echo "4. Run 'npm start' to start the robot control system"

if [ "$OS" == "linux" ]; then
    echo "Note: If this is your first time setting up, you may need to:"
    echo "- Log out and back in for serial port permissions"
    echo "- Run 'sudo chmod 666 /dev/ttyUSB0' if you get permission errors"
fi

echo ""
echo "For simulation mode:"
echo "1. ros2 launch ainex_gazebo ainex_world.launch.py"
echo "2. ros2 launch rosbridge_server rosbridge_websocket_launch.xml"
echo "3. USE_SIMULATION=true npm start" 
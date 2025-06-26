#!/bin/bash

# Eliza Agent Startup Script for Sandbox Environment
# Configures and starts an Eliza agent with specified role and configuration

set -e

# Environment variables with defaults
AGENT_ROLE=${AGENT_ROLE:-"general"}
WORKSPACE=${WORKSPACE:-"/workspace"}
CONFIG_PATH=${CONFIG_PATH:-"/config"}
HOST_URL=${HOST_URL:-"http://localhost:3000"}
WEBSOCKET_PORT=${WEBSOCKET_PORT:-"8081"}
AGENT_PORT=${AGENT_PORT:-"3001"}

# Logging setup
LOG_FILE="/logs/${AGENT_ROLE}.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "Starting Eliza agent: $AGENT_ROLE" | tee -a "$LOG_FILE"
echo "Workspace: $WORKSPACE" | tee -a "$LOG_FILE"
echo "Config path: $CONFIG_PATH" | tee -a "$LOG_FILE"
echo "Host URL: $HOST_URL" | tee -a "$LOG_FILE"

# Wait for workspace to be ready
if [ ! -d "$WORKSPACE" ]; then
    echo "Creating workspace directory: $WORKSPACE" | tee -a "$LOG_FILE"
    mkdir -p "$WORKSPACE"
fi

# Change to workspace
cd "$WORKSPACE"

# Check for character configuration
CHARACTER_FILE="$CONFIG_PATH/${AGENT_ROLE}-agent.json"
if [ ! -f "$CHARACTER_FILE" ]; then
    echo "Warning: Character file not found: $CHARACTER_FILE" | tee -a "$LOG_FILE"
    echo "Creating default character configuration..." | tee -a "$LOG_FILE"
    
    # Create default character based on role
    case "$AGENT_ROLE" in
        "backend")
            cat > "$CHARACTER_FILE" << EOF
{
  "name": "DevBot Backend",
  "bio": [
    "I'm a specialized backend developer agent.",
    "I excel at Node.js, Express, SQLite, APIs, and server architecture.",
    "I write clean, efficient backend code with proper error handling."
  ],
  "system": "You are an expert backend developer. Focus on server-side logic, databases, APIs, and backend architecture. Always write production-ready code with proper error handling and validation.",
  "plugins": [
    "elizaos-services",
    "autocoder",
    "websocket-bridge"
  ],
  "settings": {
    "specialty": "backend",
    "preferred_stack": ["node", "express", "sqlite", "typescript"],
    "workspace": "$WORKSPACE"
  }
}
EOF
            ;;
        "frontend")
            cat > "$CHARACTER_FILE" << EOF
{
  "name": "DevBot Frontend",
  "bio": [
    "I'm a specialized frontend developer agent.",
    "I create beautiful, responsive UIs with React, Vite, and modern CSS.",
    "I focus on user experience and component architecture."
  ],
  "system": "You are an expert frontend developer. Focus on React components, UI/UX, responsive design, and modern JavaScript. Always create clean, maintainable component architecture.",
  "plugins": [
    "elizaos-services",
    "autocoder", 
    "websocket-bridge"
  ],
  "settings": {
    "specialty": "frontend",
    "preferred_stack": ["react", "vite", "typescript", "tailwind"],
    "workspace": "$WORKSPACE"
  }
}
EOF
            ;;
        "devops")
            cat > "$CHARACTER_FILE" << EOF
{
  "name": "DevBot DevOps",
  "bio": [
    "I'm a specialized DevOps and infrastructure agent.",
    "I handle deployment, containerization, CI/CD, and project setup.",
    "I ensure projects are production-ready and well-configured."
  ],
  "system": "You are an expert DevOps engineer. Focus on project setup, build systems, deployment, and infrastructure. Ensure all projects are production-ready with proper configuration.",
  "plugins": [
    "elizaos-services",
    "autocoder",
    "websocket-bridge"
  ],
  "settings": {
    "specialty": "devops",
    "preferred_tools": ["docker", "vite", "npm", "github-actions"],
    "workspace": "$WORKSPACE"
  }
}
EOF
            ;;
        *)
            echo "Unknown agent role: $AGENT_ROLE" | tee -a "$LOG_FILE"
            echo "Creating generic character..." | tee -a "$LOG_FILE"
            cat > "$CHARACTER_FILE" << EOF
{
  "name": "DevBot General",
  "bio": ["I'm a general purpose development agent."],
  "system": "You are a helpful development assistant.",
  "plugins": ["elizaos-services", "autocoder"],
  "settings": {
    "workspace": "$WORKSPACE"
  }
}
EOF
            ;;
    esac
fi

# Set up WebSocket bridge configuration if available
BRIDGE_CONFIG="$CONFIG_PATH/websocket-bridge.json"
if [ -f "$BRIDGE_CONFIG" ]; then
    echo "WebSocket bridge configuration found" | tee -a "$LOG_FILE"
    export WEBSOCKET_BRIDGE_CONFIG="$BRIDGE_CONFIG"
fi

# Set agent-specific port to avoid conflicts
export PORT=$((AGENT_PORT + $(echo "$AGENT_ROLE" | wc -c)))

# Create health check endpoint
cat > health-check.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'healthy',
      agent: process.env.AGENT_ROLE || 'unknown',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Health check server running on port ${port}`);
});
EOF

# Start health check server in background
node health-check.js &
HEALTH_PID=$!
echo "Health check server started with PID: $HEALTH_PID" | tee -a "$LOG_FILE"

# Wait a moment for any dependencies
sleep 2

# Start the Eliza agent
echo "Starting Eliza agent on port $PORT..." | tee -a "$LOG_FILE"

# Use exec to replace shell process, ensuring proper signal handling
exec elizaos start \
    --character "$CHARACTER_FILE" \
    --port "$PORT" \
    2>&1 | tee -a "$LOG_FILE"
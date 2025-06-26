#!/bin/bash

# WebSocket Bridge Startup Script
# Connects sandbox agents to host server for real-time collaboration

set -e

# Environment variables
BRIDGE_CONFIG=${BRIDGE_CONFIG:-"/config/websocket-bridge.json"}
AGENT_ROLE=${AGENT_ROLE:-"general"}
LOG_FILE="/logs/websocket-bridge-${AGENT_ROLE}.log"

echo "Starting WebSocket bridge for agent: $AGENT_ROLE" | tee -a "$LOG_FILE"

# Check for bridge configuration
if [ ! -f "$BRIDGE_CONFIG" ]; then
    echo "Error: WebSocket bridge configuration not found: $BRIDGE_CONFIG" | tee -a "$LOG_FILE"
    echo "Creating default bridge configuration..." | tee -a "$LOG_FILE"
    
    # Create default bridge config
    mkdir -p "$(dirname "$BRIDGE_CONFIG")"
    cat > "$BRIDGE_CONFIG" << EOF
{
  "hostUrl": "${HOST_URL:-http://localhost:3000}",
  "roomId": "${ROOM_ID:-default-room}",
  "sandboxId": "${SANDBOX_ID:-sandbox-$(date +%s)}",
  "agentId": "${AGENT_ID:-${AGENT_ROLE}-$(date +%s)}",
  "role": "$AGENT_ROLE",
  "reconnectInterval": 5000,
  "heartbeatInterval": 30000
}
EOF
fi

echo "Bridge configuration loaded from: $BRIDGE_CONFIG" | tee -a "$LOG_FILE"

# Read configuration
HOST_URL=$(node -p "JSON.parse(require('fs').readFileSync('$BRIDGE_CONFIG', 'utf8')).hostUrl")
ROOM_ID=$(node -p "JSON.parse(require('fs').readFileSync('$BRIDGE_CONFIG', 'utf8')).roomId")
AGENT_ID=$(node -p "JSON.parse(require('fs').readFileSync('$BRIDGE_CONFIG', 'utf8')).agentId")

echo "Connecting to host: $HOST_URL" | tee -a "$LOG_FILE"
echo "Room ID: $ROOM_ID" | tee -a "$LOG_FILE"
echo "Agent ID: $AGENT_ID" | tee -a "$LOG_FILE"

# Create WebSocket bridge client
cat > websocket-bridge-client.js << 'EOF'
const WebSocket = require('ws');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync(process.env.BRIDGE_CONFIG || '/config/websocket-bridge.json', 'utf8'));

class SandboxBridge {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.isConnected = false;
    this.messageQueue = [];
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
  }

  async connect() {
    const wsUrl = this.config.hostUrl.replace(/^http/, 'ws') + '/ws/sandbox';
    
    console.log(`Connecting to: ${wsUrl}`);
    
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'X-Sandbox-Id': this.config.sandboxId,
        'X-Agent-Id': this.config.agentId,
        'X-Room-Id': this.config.roomId,
        'X-Agent-Role': this.config.role
      }
    });

    this.ws.on('open', () => {
      console.log('WebSocket connected successfully');
      this.isConnected = true;
      this.startHeartbeat();
      this.flushMessageQueue();
      
      // Send initial status
      this.sendMessage({
        type: 'status',
        agent: this.config.agentId,
        role: this.config.role,
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`WebSocket closed: ${code} ${reason}`);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
    });

    this.ws.on('ping', () => {
      if (this.ws) {
        this.ws.pong();
      }
    });
  }

  handleMessage(message) {
    console.log(`Received ${message.type} message:`, message);
    
    // Skip messages from self
    if (message.agentId === this.config.agentId) {
      return;
    }

    // Handle different message types
    switch (message.type) {
      case 'task_assignment':
        if (message.task && message.task.assignedTo === this.config.role) {
          console.log('New task assigned:', message.task.title);
          this.acknowledgeTask(message.task);
        }
        break;
      
      case 'file_sync':
        if (message.content.syncedBy !== this.config.agentId) {
          console.log('File sync received from:', message.content.syncedBy);
          this.handleFileSync(message.content.files);
        }
        break;
      
      case 'message':
        if (message.content.text && !message.content.text.includes(`@${this.config.role}`)) {
          // General room message, log it
          console.log(`Room message from ${message.agentId}: ${message.content.text.substring(0, 100)}...`);
        }
        break;
    }
  }

  acknowledgeTask(task) {
    this.sendMessage({
      type: 'task_acknowledgment',
      taskId: task.id,
      agent: this.config.agentId,
      role: this.config.role,
      status: 'acknowledged',
      estimatedStart: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
      timestamp: new Date().toISOString()
    });
  }

  handleFileSync(files) {
    // Sync files to local workspace
    files.forEach(file => {
      if (file.action === 'create' || file.action === 'update') {
        const fullPath = `/workspace/${file.path}`;
        const dir = require('path').dirname(fullPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, file.content);
        console.log(`File synced: ${file.path}`);
      } else if (file.action === 'delete') {
        const fullPath = `/workspace/${file.path}`;
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`File deleted: ${file.path}`);
        }
      }
    });
  }

  sendMessage(message) {
    const fullMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId: this.config.roomId,
      agentId: this.config.agentId,
      timestamp: new Date(),
      ...message
    };

    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      this.messageQueue.push(fullMessage);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping();
      }
    }, this.config.heartbeatInterval || 30000);
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, this.config.reconnectInterval || 5000);
  }

  stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Start the bridge
const bridge = new SandboxBridge(config);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  bridge.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  bridge.stop();
  process.exit(0);
});

// Start connection
bridge.connect().catch(error => {
  console.error('Failed to start WebSocket bridge:', error);
  process.exit(1);
});
EOF

# Start the WebSocket bridge
echo "Starting WebSocket bridge client..." | tee -a "$LOG_FILE"
exec node websocket-bridge-client.js 2>&1 | tee -a "$LOG_FILE"
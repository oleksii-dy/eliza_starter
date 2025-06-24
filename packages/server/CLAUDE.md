# ElizaOS Server Package

`@elizaos/server` provides HTTP REST APIs, WebSocket communication, and core services for managing agents, messages, and media.

## Installation & Setup

```bash
# Install server package
bun add @elizaos/server

# Environment configuration
POSTGRES_URL=postgresql://user:pass@localhost:5432/elizaos
ELIZA_SERVER_AUTH_TOKEN=your-secret-key  # Optional API authentication
PORT=3000                                # Server port
```

## Server Architecture

### Core Components
- **AgentServer**: Main server managing HTTP, WebSocket, database, and agents
- **Express**: RESTful API with security headers and middleware
- **Socket.IO**: Real-time bidirectional communication
- **Database**: PostgreSQL/PGLite with automatic migrations
- **Plugin Routes**: Extensible custom endpoints

## Authentication

### API Key Authentication (Optional)
```bash
# Set environment variable
ELIZA_SERVER_AUTH_TOKEN=your-secret-key

# Client requests
headers: { 'X-API-KEY': 'your-secret-key' }
```

### Rate Limiting
| Operation | Window | Limit |
|-----------|--------|-------|
| General API | 15 min | 1000 requests |
| File Operations | 5 min | 100 requests |
| Uploads | 15 min | 50 requests |

## REST API Endpoints

### Agent Management (`/api/agents`)

```typescript
// List agents
GET /api/agents
Response: { success: true, data: { agents: Agent[] } }

// Create agent
POST /api/agents
Body: { characterPath?: string, characterJson?: object }
Response: { success: true, data: { id: UUID, character: Character } }

// Agent lifecycle
POST /api/agents/:agentId/start
POST /api/agents/:agentId/stop
DELETE /api/agents/:agentId

// Agent configuration
GET /api/agents/:agentId
PATCH /api/agents/:agentId
Body: { ...updates }

// Agent logs
GET /api/agents/:agentId/logs?roomId=UUID&type=string&count=50
DELETE /api/agents/:agentId/logs/:logId

// Agent memory
GET /api/agents/:agentId/memories?roomId=UUID&tableName=string
PATCH /api/agents/:agentId/memories/:memoryId
DELETE /api/agents/:agentId/memories/all/:roomId

// Agent worlds
GET /api/agents/worlds
POST /api/agents/:agentId/worlds
Body: { name: string, serverId?: string, metadata?: object }
```

### Media Management (`/api/media`)

```typescript
// Upload agent media
POST /api/media/agents/:agentId/upload-media
Content-Type: multipart/form-data
Body: { file: MediaFile }
Response: {
  url: string,          // /media/uploads/agents/:agentId/:filename
  type: string,         // MIME type
  filename: string,
  originalName: string,
  size: number
}

// Upload channel media
POST /api/media/channels/:channelId/upload-media
Content-Type: multipart/form-data
Body: { file: MediaFile }
```

**Media Constraints:**
- Max file size: 50MB
- Audio: mp3, wav, ogg, webm, mp4, aac, flac
- Media: Audio + jpeg, png, gif, webp, mp4, webm, pdf, txt

### Audio Processing (`/api/audio`)

```typescript
// Transcribe audio
POST /api/audio/:agentId/transcriptions
Content-Type: multipart/form-data
Body: { file: AudioFile }
Response: { text: string }

// Text to speech
POST /api/audio/:agentId/speech/generate
Body: { text: string }
Response: Audio buffer (audio/mpeg or audio/wav)

// Interactive speech conversation
POST /api/audio/:agentId/speech/conversation
Body: {
  text: string,
  roomId?: UUID,
  entityId?: UUID,
  userName?: string,
  attachments?: any[]
}
Response: Audio buffer of agent response
```

### Messaging System (`/api/messaging`)

```typescript
// Submit message to agent
POST /api/messaging/submit
Body: {
  channel_id: UUID,
  server_id: UUID,
  author_id: UUID,
  content: string,
  in_reply_to_message_id?: UUID,
  source_type: string,
  raw_message: object,
  metadata?: object
}

// Channel operations
GET /api/messaging/central-channels/:channelId/messages
POST /api/messaging/central-channels/:channelId/messages
Body: {
  author_id: UUID,
  content: string,
  server_id: UUID,
  metadata?: object,
  attachments?: any[]
}

// Channel management
POST /api/messaging/central-channels
Body: {
  name: string,
  server_id: UUID,
  type?: ChannelType,
  participantCentralUserIds: UUID[]
}

GET /api/messaging/central-channels/:channelId/details
PATCH /api/messaging/central-channels/:channelId
DELETE /api/messaging/central-channels/:channelId

// Server management
GET /api/messaging/central-servers
POST /api/messaging/servers
Body: { name: string, sourceType: string, sourceId?: string, metadata?: object }

// Agent-server associations
POST /api/messaging/servers/:serverId/agents
Body: { agentId: UUID }
DELETE /api/messaging/servers/:serverId/agents/:agentId
GET /api/messaging/servers/:serverId/agents
```

### Memory Operations (`/api/memory`)

```typescript
// Room management
POST /api/memory/:agentId/rooms
Body: {
  name: string,
  type?: ChannelType,
  source?: string,
  worldId?: UUID,
  metadata?: object
}

GET /api/memory/:agentId/rooms
GET /api/memory/:agentId/rooms/:roomId

// Group memory spaces
POST /api/memory/groups/:serverId
Body: {
  name?: string,
  worldId?: UUID,
  source?: string,
  metadata?: object,
  agentIds: UUID[]
}

DELETE /api/memory/groups/:serverId
DELETE /api/memory/groups/:serverId/memories
```

### Runtime Management (`/api/runtime`)

```typescript
// Health monitoring
GET /api/runtime/ping
Response: { pong: true, timestamp: number }

GET /api/runtime/health
Response: {
  status: 'OK',
  version: string,
  timestamp: string,
  dependencies: { agents: 'healthy' | 'no_agents' }
}

GET /api/runtime/status
Response: { status: 'ok', agentCount: number, timestamp: string }

// Logging
GET /api/runtime/logs?since=timestamp&level=all&agentName=string&limit=100
POST /api/runtime/logs
DELETE /api/runtime/logs

// Server control
POST /api/runtime/stop
```

### System Configuration (`/api/system`)

```typescript
// Environment management
GET /api/system/env/local
Response: { [key: string]: string }

POST /api/system/env/local
Body: { content: { [key: string]: string } }
```

## WebSocket Communication

### Connection Setup
```javascript
const socket = io('http://localhost:3000', {
  transports: ['websocket']
});

socket.on('connection_established', (data) => {
  console.log('Connected:', data.socketId);
});
```

### Message Operations
```javascript
// Join channel/room
socket.emit('1', {  // ROOM_JOINING
  channelId: UUID,
  agentId?: UUID,
  entityId?: UUID,
  serverId?: UUID,
  metadata?: object
});

// Send message
socket.emit('2', {  // SEND_MESSAGE
  channelId: UUID,
  senderId: UUID,
  senderName: string,
  message: string,
  serverId: UUID,
  source?: string,
  metadata?: object,
  attachments?: any[]
});
```

### Event Handling
```javascript
// Message events
socket.on('messageBroadcast', (data) => {
  // { senderId, senderName, text, channelId, serverId, createdAt, source, id }
});

socket.on('messageAck', (data) => {
  // { clientMessageId, messageId, status, channelId }
});

socket.on('messageComplete', (data) => {
  // { channelId, messageId }
});

socket.on('messageDeleted', (data) => {
  // { channelId, messageId }
});

// Channel events
socket.on('channel_joined', (data) => {
  // { channelId, participantIds }
});

socket.on('channelCleared', (data) => {
  // { channelId }
});

// Control events
socket.on('controlMessage', (data) => {
  // { action: 'enable_input' | 'disable_input', channelId }
});
```

### Log Streaming
```javascript
// Subscribe to real-time logs
socket.emit('subscribe_logs');

// Update log filters
socket.emit('update_log_filters', {
  agentName?: string,
  level?: string
});

// Receive logs
socket.on('log_stream', (data) => {
  // { type: 'log_entry', payload: LogEntry }
});

// Unsubscribe
socket.emit('unsubscribe_logs');
```

## Plugin Routes

Plugins can register custom HTTP endpoints:

```typescript
// In plugin definition
plugin.routes = [{
  path: '/my-route',
  type: 'GET',
  public: true,      // Appears in agent panels
  name: 'My Panel',  // Display name
  handler: (req, res, runtime) => {
    const agentId = req.query.agentId;
    res.json({ 
      message: 'Hello from plugin',
      agent: runtime.character.name 
    });
  }
}];
```

Access patterns:
- Direct: `/my-route?agentId=UUID`
- Agent-specific: `/api/agents/:agentId/plugins/:pluginName/my-route`
- Panel listing: `GET /api/agents/:agentId/panels`

## Error Handling

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Additional information"
  }
}
```

### Common Error Codes
- `INVALID_ID`: Invalid UUID format
- `NOT_FOUND`: Resource not found
- `BAD_REQUEST`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `FILE_TOO_LARGE`: Upload exceeds limit
- `INVALID_FILE_TYPE`: Unsupported file type
- `AGENT_NOT_FOUND`: Specified agent doesn't exist
- `CHANNEL_NOT_FOUND`: Channel doesn't exist

## Client Example

```typescript
// Agent management client
class ElizaClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'X-API-KEY': this.apiKey }),
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  async createAgent(character: Character) {
    return this.request('/api/agents', {
      method: 'POST',
      body: JSON.stringify({ characterJson: character })
    });
  }

  async startAgent(agentId: string) {
    return this.request(`/api/agents/${agentId}/start`, {
      method: 'POST'
    });
  }

  async sendMessage(channelId: string, message: string, authorId: string, serverId: string) {
    return this.request('/api/messaging/submit', {
      method: 'POST',
      body: JSON.stringify({
        channel_id: channelId,
        author_id: authorId,
        server_id: serverId,
        content: message,
        source_type: 'api'
      })
    });
  }
}
```

## Configuration

### Environment Variables
```bash
# Server configuration
PORT=3000
SERVER_HOST=0.0.0.0
NODE_ENV=production

# Authentication
ELIZA_SERVER_AUTH_TOKEN=your-secret-key

# Database
POSTGRES_URL=postgresql://user:pass@localhost:5432/elizaos
PGLITE_DATA_DIR=./.elizadb

# CORS
CORS_ORIGIN=*
API_CORS_ORIGIN=https://yourapp.com

# File uploads
EXPRESS_MAX_PAYLOAD=100kb
```

## Best Practices

1. **UUID Validation**: Always validate UUIDs before API calls
2. **Error Handling**: Implement comprehensive error handling
3. **Rate Limiting**: Monitor and respect rate limits
4. **Authentication**: Use API keys in production
5. **File Uploads**: Use proper multipart/form-data
6. **WebSocket Reconnection**: Handle connection drops gracefully
7. **Logging**: Subscribe to log streams for debugging
8. **Agent State**: Check agent status before operations
9. **Memory Management**: Clean up unused memories periodically
10. **Plugin Routes**: Use public routes for user-facing panels

The ElizaOS server provides a comprehensive API surface for building applications, managing agents, and creating rich interactive experiences.
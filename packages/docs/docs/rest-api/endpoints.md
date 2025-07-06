---
id: endpoints
title: REST API Endpoints
sidebar_label: API Endpoints
sidebar_position: 1
---

# REST API Endpoints

## Overview

The ElizaOS server provides a comprehensive REST API for managing agents, memories, rooms, worlds, and media. All API endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
http://localhost:3000/api
```

## Authentication

If `ELIZA_SERVER_AUTH_TOKEN` is set, all API endpoints require authentication via the `X-API-KEY` header:

```javascript
headers: {
  'X-API-KEY': 'your-server-auth-token'
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

All errors follow a [standardized format](./error-responses.md):

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional additional context"
  }
}
```

## Endpoints

### Health & Status

#### Health Check

```
GET /health
```

Returns system health status. Returns HTTP 503 when no agents are running.

**Response (200 OK):**

```json
{
  "status": "OK",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "agents": "healthy"
  }
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "OK",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "agents": "no_agents"
  }
}
```

#### Ping

```
GET /ping
```

Simple endpoint to check if server is responding.

**Response:**

```json
{
  "pong": true,
  "timestamp": 1705315800000
}
```

#### Hello World

```
GET /hello
```

Test endpoint.

**Response:**

```json
{
  "message": "Hello World!"
}
```

#### System Status

```
GET /status
```

Returns current system status.

**Response:**

```json
{
  "status": "ok",
  "agentCount": 3,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Stop Server

```
POST /stop
```

Gracefully stops the server.

**Response:**

```json
{
  "message": "Server stopping..."
}
```

### Agent Management

#### List All Agents

```
GET /agents
```

Returns all agents with minimal details.

**Response:**

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Assistant",
        "characterName": "Assistant",
        "bio": "A helpful AI assistant",
        "status": "active"
      }
    ]
  }
}
```

#### Get Agent Details

```
GET /agents/:agentId
```

Returns detailed information about a specific agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Assistant",
    "bio": ["A helpful AI assistant"],
    "lore": ["Created to help users"],
    "status": "active"
    // ... other character fields
  }
}
```

#### Create Agent

```
POST /agents
```

Creates a new agent.

**Request Body:**

```json
{
  "name": "NewAssistant",
  "bio": ["A new helpful assistant"],
  "lore": ["Freshly created"],
  "modelProvider": "openai",
  "settings": {
    "secrets": {},
    "voice": {
      "model": "en-US-Neural2-F"
    }
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "character": {
      // Full character object
    }
  }
}
```

#### Update Agent

```
PATCH /agents/:agentId
```

Updates an existing agent's configuration.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

**Request Body:**

```json
{
  "bio": ["Updated bio"],
  "settings": {
    "voice": {
      "model": "en-US-Neural2-M"
    }
  }
}
```

#### Delete Agent

```
DELETE /agents/:agentId
```

Deletes an agent and optionally all associated data.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

**Query Parameters:**

- `deleteAllData` (boolean): If true, deletes all associated memories, relationships, etc.

**Possible Error Codes:**

- `409 CONFLICT`: Agent has active references preventing deletion
- `408 TIMEOUT`: Deletion operation timed out

### Agent Lifecycle

#### Start Agent

```
POST /agents/:agentId/start
```

Starts an inactive agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

#### Stop Agent

```
POST /agents/:agentId/stop
```

Stops an active agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

### Memory Management

#### List Agent Memories

```
GET /agents/:agentId/memories
```

Returns memories for a specific agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

**Query Parameters:**

- `limit` (number): Maximum memories to return (default: 50)
- `offset` (number): Pagination offset
- `type` (string): Filter by memory type
- `room` (UUID): Filter by room ID

**Response:**

```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "memory-id",
        "type": "message",
        "content": {
          "text": "Hello world"
        },
        "roomId": "room-id",
        "createdAt": 1705315800000
      }
    ],
    "total": 100
  }
}
```

#### Get Memory Details

```
GET /agents/:agentId/memories/:memoryId
```

Returns details of a specific memory.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier
- `memoryId` (UUID): Memory's unique identifier

#### Create Memory

```
POST /agents/:agentId/memories
```

Creates a new memory for an agent.

**Request Body:**

```json
{
  "type": "message",
  "content": {
    "text": "Remember this important fact"
  },
  "roomId": "room-id"
}
```

#### Delete Memory

```
DELETE /agents/:agentId/memories/:memoryId
```

Deletes a specific memory.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier
- `memoryId` (UUID): Memory's unique identifier

### Room Management

#### List Rooms

```
GET /agents/:agentId/rooms
```

Returns all rooms associated with an agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

#### Get Room Details

```
GET /agents/:agentId/rooms/:roomId
```

Returns details of a specific room.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier
- `roomId` (UUID): Room's unique identifier

#### Create Room

```
POST /agents/:agentId/rooms
```

Creates a new room for an agent.

**Request Body:**

```json
{
  "name": "General Chat"
}
```

### World Management

#### List Worlds

```
GET /agents/:agentId/worlds
```

Returns all worlds associated with an agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

#### Get World Details

```
GET /agents/:agentId/worlds/:worldId
```

Returns details of a specific world.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier
- `worldId` (UUID): World's unique identifier

#### Create World

```
POST /agents/:agentId/worlds
```

Creates a new world for an agent.

**Request Body:**

```json
{
  "name": "My Discord Server"
}
```

### Media Endpoints

ElizaOS provides comprehensive media handling capabilities for agents and channels.

#### Upload Endpoints

**Agent Media Upload**

```
POST /api/media/agents/:agentId/upload
```

Upload media files (images, videos, audio, documents) for a specific agent.

**Channel Media Upload**

```
POST /api/media/channels/:channelId/upload-media
```

Upload media files to a specific channel. Includes rate limiting (100 requests per 15 minutes).

#### Serving Endpoints

**Get Agent Media**

```
GET /api/media/uploads/agents/:agentId/:filename
```

Retrieve uploaded media files for agents.

**Get Channel Media**

```
GET /api/media/uploads/channels/:channelId/:filename
```

Retrieve uploaded media files from channels.

**Get Generated Media**

```
GET /api/media/generated/:agentId/:filename
```

Retrieve AI-generated media files (e.g., from image generation plugins).

**Media Specifications:**

- **Max file size**: 50MB
- **Allowed types**: Images (JPEG, PNG, GIF, WebP), Videos (MP4, WebM), Audio (MP3, WAV, OGG, etc.), Documents (PDF, TXT)
- **Storage**: Files stored in `.eliza/data/uploads/` directory structure
- **Security**: UUID validation, path traversal protection, filename sanitization

For detailed documentation, see the [Media API Reference](/rest) or [Media Endpoints Guide](/src/api/media-endpoints).

### Audio Processing

#### Speech Synthesis

```
POST /agents/:agentId/speech/synthesize
```

Converts text to speech using the agent's voice settings.

**Request Body:**

```json
{
  "text": "Hello, how can I help you today?"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "audio": "base64-encoded-audio-data",
    "format": "mp3"
  }
}
```

#### Audio Transcription

```
POST /agents/:agentId/speech/transcribe
```

Transcribes audio to text.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Field: `audio` (file)

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "This is the transcribed text"
  }
}
```

#### Audio Conversation

```
POST /agents/:agentId/speech/conversation
```

Processes audio input and returns audio response.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Field: `audio` (file)

**Response:**

```json
{
  "success": true,
  "data": {
    "audio": "base64-encoded-response-audio",
    "text": "Agent's response text",
    "format": "mp3"
  }
}
```

### Agent Logs

#### Get Agent Logs

```
GET /agents/:agentId/logs
```

Returns recent logs for an agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

**Query Parameters:**

- `limit` (number): Maximum logs to return (default: 100)
- `offset` (number): Pagination offset
- `level` (string): Filter by log level (error, warn, info, debug)

#### Get Log Details

```
GET /agents/:agentId/logs/:logId
```

Returns details of a specific log entry.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier
- `logId` (UUID): Log entry's unique identifier

### Agent Panels (Plugin UI)

#### List Agent Panels

```
GET /agents/:agentId/panels
```

Returns available UI panels from plugins for an agent.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier

**Response:**

```json
{
  "success": true,
  "data": {
    "panels": [
      {
        "id": "plugin-panel",
        "name": "Plugin Dashboard",
        "description": "Dashboard for plugin features",
        "url": "/agents/123/panels/plugin-panel"
      }
    ]
  }
}
```

#### Get Panel Content

```
GET /agents/:agentId/panels/:panelId
```

Returns the HTML content for a specific panel.

**Parameters:**

- `agentId` (UUID): Agent's unique identifier
- `panelId` (string): Panel identifier

**Response:**

- Content-Type: `text/html`
- Returns the panel's HTML content

### Group Management

#### List Group Channel Members

```
GET /channels/:channelId/members
```

Returns members of a group channel.

**Parameters:**

- `channelId` (UUID): Channel's unique identifier

**Response:**

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "userId": "user-123",
        "name": "John Doe",
        "role": "member",
        "joinedAt": 1705315800000
      }
    ]
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 1000 requests per 15 minutes per IP
- **File Operations**: 100 requests per 5 minutes per IP
- **Upload Operations**: 50 requests per 15 minutes per IP
- **Channel Validation**: 200 attempts per 10 minutes per IP

Rate limit information is included in response headers:

- `RateLimit-Limit`: Maximum allowed requests
- `RateLimit-Remaining`: Remaining requests in window
- `RateLimit-Reset`: Unix timestamp for rate limit reset

## Error Handling

All endpoints use [standardized error responses](./error-responses.md). Common HTTP status codes:

- **400**: Bad Request - Invalid parameters or request format
- **404**: Not Found - Resource doesn't exist
- **408**: Request Timeout - Operation took too long
- **409**: Conflict - Operation conflicts with current state
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server-side error
- **503**: Service Unavailable - Service temporarily down

## WebSocket Support

For real-time updates, see [Socket.IO Events Documentation](/src/api/socketio-events).

## Related Documentation

- [Error Response Documentation](./error-responses.md) - Detailed error format and codes
- [Media Endpoints Documentation](/src/api/media-endpoints) - File upload and serving
- [Socket.IO Events Documentation](/src/api/socketio-events) - Real-time events
- [Centralized Messaging System](/src/api/centralized-messaging-system) - Message handling
- [Environment Variables](/src/api/environment-variables) - Server configuration

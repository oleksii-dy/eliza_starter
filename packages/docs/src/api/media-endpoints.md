# Media Endpoints Documentation

## Overview

ElizaOS provides media upload and serving capabilities through REST API endpoints. These endpoints allow clients to upload images, videos, audio files, and documents to agent-specific or channel-specific storage locations.

## Media Upload Endpoints

### Agent Media Upload

Upload media files associated with a specific agent.

```
POST /api/media/agents/:agentId/upload
```

#### Request

- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **URL Parameters**:
  - `agentId` (UUID) - The agent's unique identifier

#### Request Body

- **Field Name**: `file`
- **Type**: Binary file data
- **Max Size**: 50MB
- **Allowed MIME Types**:
  - **Images**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - **Videos**: `video/mp4`, `video/webm`
  - **Audio**: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/ogg`, `audio/webm`, `audio/mp4`, `audio/aac`, `audio/flac`, `audio/x-wav`, `audio/wave`
  - **Documents**: `application/pdf`, `text/plain`

#### Response

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "url": "/media/uploads/agents/123e4567-e89b-12d3-a456-426614174000/1234567890-123456789.jpg",
    "type": "image",
    "filename": "1234567890-123456789.jpg",
    "originalName": "profile-photo.jpg",
    "size": 245678
  }
}
```

**Error Responses:**

All error responses follow the [standardized error format](./error-responses.md).

- **400 Bad Request** - Invalid agent ID format or missing file

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ID",
    "message": "Invalid agent ID format"
  }
}
```

- **400 Bad Request** - Unsupported media type

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_MEDIA_TYPE",
    "message": "Unsupported media MIME type: application/zip"
  }
}
```

- **413 Payload Too Large** - File exceeds 50MB limit

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File too large"
  }
}
```

- **500 Internal Server Error** - Upload processing failed

```json
{
  "success": false,
  "error": {
    "code": "UPLOAD_ERROR",
    "message": "Failed to process media upload",
    "details": "Disk write error"
  }
}
```

#### Example Usage

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/media/agents/123e4567-e89b-12d3-a456-426614174000/upload', {
  method: 'POST',
  headers: {
    'X-API-KEY': 'your-api-key', // if authentication is enabled
  },
  body: formData,
});

const result = await response.json();
console.log('Upload successful:', result.data.url);
```

### Channel Media Upload

Upload media files to a specific channel.

```
POST /api/media/channels/:channelId/upload-media
```

#### Request

- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **URL Parameters**:
  - `channelId` (UUID) - The channel's unique identifier

#### Request Body

Same as agent media upload:

- **Field Name**: `file`
- **Type**: Binary file data
- **Max Size**: 50MB
- **Allowed MIME Types**: Same as agent uploads

#### Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Standard rate limit headers included in response

#### Response

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "url": "/media/uploads/channels/550e8400-e29b-41d4-a716-446655440000/1234567890-987654321.png",
    "type": "image/png",
    "filename": "1234567890-987654321.png",
    "originalName": "screenshot.png",
    "size": 1048576
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid channel ID or missing file (see [error format](./error-responses.md))
- **429 Too Many Requests** - Rate limit exceeded

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

- **500 Internal Server Error** - Upload processing failed (see [error format](./error-responses.md))

## Media Serving Endpoints

### Agent Media Files

Serve uploaded media files for agents.

```
GET /api/media/uploads/agents/:agentId/:filename
```

#### Request

- **Method**: `GET`
- **URL Parameters**:
  - `agentId` (UUID) - The agent's unique identifier
  - `filename` (string) - The filename returned from upload

#### Response

- **Success**: Returns the file with appropriate content-type header
- **404 Not Found**: File does not exist
- **400 Bad Request**: Invalid agent ID format
- **403 Forbidden**: Path traversal attempt detected

### Channel Media Files

Serve uploaded media files for channels.

```
GET /api/media/uploads/channels/:channelId/:filename
```

#### Request

- **Method**: `GET`
- **URL Parameters**:
  - `channelId` (UUID) - The channel's unique identifier
  - `filename` (string) - The filename returned from upload

#### Response

Same as agent media files endpoint.

### Generated Media Files

Serve AI-generated media files (e.g., from image generation plugins).

```
GET /api/media/generated/:agentId/:filename
```

#### Request

- **Method**: `GET`
- **URL Parameters**:
  - `agentId` (UUID) - The agent's unique identifier
  - `filename` (string) - The generated filename

#### Response

Same as other media serving endpoints.

## File Storage

### Directory Structure

Files are stored in the following directory structure:

```
.eliza/
└── data/
    ├── uploads/
    │   ├── agents/
    │   │   └── {agentId}/
    │   │       └── {timestamp}-{random}.{ext}
    │   └── channels/
    │       └── {channelId}/
    │           └── {timestamp}-{random}.{ext}
    └── generated/
        └── {agentId}/
            └── {filename}
```

### Filename Generation

Uploaded files are renamed using the pattern: `{timestamp}-{random}.{extension}`

- `timestamp`: Current Unix timestamp in milliseconds
- `random`: Random number (0-1 billion)
- `extension`: Original file extension preserved

## Security Considerations

### Path Traversal Protection

All endpoints validate that:

1. UUIDs match the expected format (preventing directory traversal via IDs)
2. Filenames are sanitized using `path.basename()`
3. Final paths are verified to be within expected directories

### Authentication

If `ELIZA_SERVER_AUTH_TOKEN` is set, all `/api/*` endpoints require the `X-API-KEY` header:

```javascript
headers: {
  'X-API-KEY': 'your-server-auth-token'
}
```

### MIME Type Validation

Only allowed MIME types are accepted. The server validates both:

1. The MIME type reported by the client
2. The file extension matches expected types

## Best Practices

1. **File Size**: Keep uploads under 10MB when possible for better performance
2. **Image Optimization**: Pre-optimize images client-side before upload
3. **Error Handling**: Always handle upload errors gracefully
4. **Progress Tracking**: For large files, implement upload progress tracking
5. **Cleanup**: Implement periodic cleanup of old uploaded files

## Example: Full Upload Flow

```javascript
// 1. Select file
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

// 2. Validate client-side
if (file.size > 50 * 1024 * 1024) {
  alert('File too large! Maximum size is 50MB');
  return;
}

// 3. Create form data
const formData = new FormData();
formData.append('file', file);

// 4. Upload with progress tracking
const xhr = new XMLHttpRequest();

xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    console.log(`Upload progress: ${percentComplete}%`);
  }
});

xhr.addEventListener('load', () => {
  if (xhr.status === 200) {
    const response = JSON.parse(xhr.responseText);
    console.log('Upload successful!', response.data);

    // 5. Use the returned URL
    const mediaUrl = response.data.url;
    // Full URL would be: window.location.origin + mediaUrl
  } else {
    console.error('Upload failed:', xhr.responseText);
  }
});

xhr.open('POST', '/api/media/agents/your-agent-id/upload');
xhr.setRequestHeader('X-API-KEY', 'your-api-key'); // if needed
xhr.send(formData);
```

## Related Documentation

- [Error Response Documentation](./error-responses.md) - Standardized error response format
- [Socket.IO Events Documentation](./socketio-events.md) - For real-time media notifications
- [Centralized Messaging System](./centralized-messaging-system.md) - For sending messages with media attachments
- [Environment Variables](./environment-variables.md) - For server configuration options

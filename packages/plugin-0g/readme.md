# @elizaos/plugin-0g

A plugin for storing data using the 0G protocol within the ElizaOS ecosystem.

## Description
The 0G plugin enables seamless integration with the Zero Gravity (0G) protocol for decentralized file storage. It provides functionality to upload files to the 0G network.

## Installation

```bash
pnpm install @elizaos/plugin-0g
```

## Configuration

The plugin requires the following environment variables to be set:
```typescript
ZEROG_INDEXER_RPC=<0G indexer RPC endpoint>
ZEROG_EVM_RPC=<0G EVM RPC endpoint>
ZEROG_PRIVATE_KEY=<Private key for transactions>
ZEROG_FLOW_ADDRESS=<0G Flow contract address>
```

## Usage

### Basic Integration

```typescript
import { zgPlugin } from '@ai16z/plugin-0g';
```


### File Upload Example

```typescript
// The plugin automatically handles file uploads when triggered
// through natural language commands like:

"Upload my document.pdf"
"Store this image.png on 0G"
"Save my resume.docx to Zero Gravity"
```


## API Reference

### Actions

#### ZG_UPLOAD

Uploads files to the 0G network.

**Aliases:**
- UPLOAD_FILE_TO_ZG
- STORE_FILE_ON_ZG
- SAVE_FILE_TO_ZG
- UPLOAD_TO_ZERO_GRAVITY
- STORE_ON_ZERO_GRAVITY
- SHARE_FILE_ON_ZG
- PUBLISH_FILE_TO_ZG

**Input Content:**
```typescript
interface UploadContent {
filePath: string;
}
```


## Common Issues & Troubleshooting

1. **File Access Errors**
   - Ensure the file exists at the specified path
   - Check file permissions
   - Verify the path is absolute or relative to the execution context

2. **Configuration Issues**
   - Verify all required environment variables are set
   - Ensure RPC endpoints are accessible
   - Confirm private key has sufficient permissions

## Security Best Practices

1. **Environment Variables**
   - Never commit private keys to version control
   - Use secure environment variable management
   - Rotate private keys periodically


## Development Guide

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the plugin:

```bash
pnpm run build
```

4. Run the plugin:

```bash
pnpm run dev
```

## Future Enhancements

- Model service deployment on 0G serving network
- 0G KV store for plugin state persistence
- Upload history and file metadata storage
- 0G as a database option for Eliza state storage
- Enhanced file path and context extraction

## Contributing

Contributions are welcome! Please see our contributing guidelines for more details.

## License

[License information needed]

# plugin-0g Security Guide

## Overview
The `plugin-0g` package implements secure file upload functionality with comprehensive security measures to protect against unauthorized access, malicious file uploads, and potential security vulnerabilities.

## Security Features

### 1. File Type Validation
- Restricts uploads to allowed file types only
- Default allowed types: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.doc`, `.docx`
- Configurable via `ZEROG_ALLOWED_EXTENSIONS` environment variable
- Early validation before file processing
- Prevents upload of sensitive files (e.g., `.env`, `.ssh`)

### 2. Size Restrictions
- Default maximum file size: 10MB
- Configurable via `ZEROG_MAX_FILE_SIZE` environment variable
- Prevents DoS attacks through large file uploads
- Validates file size before upload processing

### 3. Path Security
- Prevents directory traversal attacks
- Restricts uploads to designated directory
- Sanitizes file paths
- Configurable upload directory via `ZEROG_UPLOAD_DIR`
- Special handling for test environments

### 4. Error Handling
- Detailed error messages for troubleshooting
- Structured logging with context
- Security event monitoring
- Upload metrics tracking
- Cleanup operation monitoring

## Configuration

### Environment Variables
```env
# Required Settings
ZEROG_MAX_FILE_SIZE=10485760        # Maximum file size in bytes (default: 10MB)
ZEROG_ALLOWED_EXTENSIONS=".pdf,.png,.jpg,.jpeg,.doc,.docx"  # Allowed file types
ZEROG_UPLOAD_DIR="/path/to/uploads"  # Secure upload directory
ZEROG_ENABLE_VIRUS_SCAN=false        # Enable virus scanning (future feature)

# Optional Settings
ZEROG_CLEANUP_INTERVAL=3600          # Cleanup interval in seconds
```

### Security Best Practices
1. **File Types**
   - Only allow necessary file types
   - Regularly review allowed extensions
   - Consider business requirements

2. **Upload Directory**
   - Use absolute paths
   - Ensure proper permissions
   - Regular cleanup of old files
   - Monitor disk usage

3. **Error Handling**
   - Monitor security events
   - Review logs regularly
   - Set up alerts for suspicious activity

4. **Configuration**
   - Use environment variables
   - Never hardcode sensitive values
   - Regular security audits

## Error Messages

### File Type Validation
```typescript
{
    error: "File type validation failed",
    details: {
        error: "File type not allowed. Allowed types: .pdf, .png, .jpg, .jpeg, .doc, .docx",
        filePath: "/path/to/file"
    }
}
```

### Size Validation
```typescript
{
    error: "File size validation failed",
    details: {
        error: "File size exceeds limit of 10485760 bytes",
        filePath: "/path/to/file"
    }
}
```

### Path Validation
```typescript
{
    error: "File path validation failed",
    details: {
        error: "Invalid file path: Directory traversal detected",
        filePath: "/path/to/file"
    }
}
```

## Monitoring

### Security Events
```typescript
{
    timestamp: number;
    event: string;
    severity: 'low' | 'medium' | 'high';
    details: {
        error?: string;
        filePath?: string;
        // Additional context
    }
}
```

### Upload Metrics
```typescript
{
    filePath: string;
    size: number;
    duration: number;
    success: boolean;
    error?: string;
}
```

## Testing
Run the test suite:
```bash
pnpm test
```

The test suite includes:
- File type validation
- Size limit enforcement
- Path traversal prevention
- Error handling scenarios
- Blockchain upload errors
- Edge cases

## Contributing
1. Follow security best practices
2. Add tests for new features
3. Update documentation
4. Run full test suite before submitting PR

## Security Reporting
Report security vulnerabilities to security@elizaos.com
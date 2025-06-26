# ElizaOS CLI Authentication Implementation Plan

## Overview

Integrate platform API key management into the CLI to provide seamless authentication for users when using elizaos-services plugin.

## Core Features

1. **Login** - Authenticate with email/password
2. **Logout** - Clear stored credentials
3. **Get API Key** - Retrieve current API key
4. **Reset Key** - Regenerate API key
5. **Create Account** - Register new user
6. **Auto-prompt** - During project creation
7. **Preference Storage** - Remember user choices

## Architecture

### 1. Secure Credential Storage

- Use OS keychain for sensitive data (via `keyring` npm package)
- Store non-sensitive preferences in `~/.eliza/auth.json`
- Never store credentials in plain text

### 2. Authentication Flow

```typescript
interface AuthState {
  isAuthenticated: boolean;
  skipAuth?: boolean;
  lastChecked?: string;
  email?: string;
}

interface StoredCredentials {
  accessToken: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
}
```

### 3. API Integration

Base URL: `https://api.elizaos.com/v1` (placeholder)

#### Endpoints:

- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Create new account
- `POST /auth/logout` - Logout (invalidate tokens)
- `POST /auth/refresh` - Refresh access token
- `GET /api-keys` - List API keys
- `POST /api-keys` - Create API key
- `DELETE /api-keys/:id` - Delete API key
- `POST /api-keys/:id/regenerate` - Reset API key

### 4. Command Structure

```bash
elizaos auth login              # Interactive login
elizaos auth logout             # Clear credentials
elizaos auth status             # Check auth status
elizaos auth key                # Get current API key
elizaos auth key --reset        # Regenerate API key
elizaos auth register           # Create new account
```

## Implementation Steps

### Phase 1: Core Auth Infrastructure

1. Set up keyring integration for secure storage
2. Create auth service with token management
3. Implement auth state management
4. Add HTTP client with auth interceptors

### Phase 2: CLI Commands

1. Implement login command with interactive prompts
2. Add logout functionality
3. Create status command
4. Add API key management commands

### Phase 3: Integration

1. Hook into project creation flow
2. Auto-inject API key into elizaos-services config
3. Add preference storage for skip-auth
4. Implement token refresh logic

### Phase 4: Testing

1. Unit tests for auth service
2. E2E tests for auth flow
3. BATS tests for CLI commands
4. Security testing

## Security Considerations

1. **Token Storage**

   - Access tokens in keychain only
   - Never log tokens
   - Clear tokens on logout

2. **CSRF Protection**

   - Use state parameter in OAuth flows
   - Validate all callbacks

3. **Network Security**

   - Always use HTTPS
   - Validate SSL certificates
   - Implement request timeout

4. **Error Handling**
   - Never expose sensitive info in errors
   - Log security events
   - Rate limit auth attempts

## User Experience

1. **First Run**

   ```
   Creating new ElizaOS project...

   🔐 ElizaOS Platform Authentication
   To use elizaos-services and other platform features, you can:

   1) Login with existing account
   2) Create new account
   3) Skip (configure manually later)

   Choice: _
   ```

2. **Seamless Integration**

   - Auto-inject API key when detected
   - Background token refresh
   - Clear error messages

3. **Manual Override**
   - Support env vars for CI/CD
   - Allow explicit API key in config
   - Respect user preferences

## Testing Strategy

### Unit Tests

- Auth service methods
- Token management
- Keyring integration
- Error handling

### E2E Tests

- Full login flow
- Token refresh
- API key operations
- Logout cleanup

### BATS Tests

```bash
# Login flow
bats tests/auth/login.bats

# API key management
bats tests/auth/apikey.bats

# Integration with project creation
bats tests/auth/integration.bats
```

## Error Handling

1. **Network Errors**

   - Retry with exponential backoff
   - Offline mode fallback
   - Clear error messages

2. **Auth Errors**

   - Invalid credentials
   - Expired tokens
   - Account issues

3. **Storage Errors**
   - Keyring access denied
   - Corrupted state
   - Migration issues

## Migration & Compatibility

1. **Existing Users**

   - Detect existing .env files
   - Offer migration to secure storage
   - Maintain backwards compatibility

2. **CI/CD Support**
   - Environment variable override
   - Non-interactive mode
   - Service account support

## Success Metrics

1. **Security**

   - Zero plain text credential storage
   - Secure token refresh
   - Proper error handling

2. **Usability**

   - < 30s first auth
   - Seamless integration
   - Clear documentation

3. **Reliability**
   - 99.9% auth success rate
   - Graceful degradation
   - Robust error recovery

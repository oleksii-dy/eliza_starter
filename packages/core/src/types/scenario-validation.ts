import path from 'path';
import { URL } from 'url';

/**
 * Validates and sanitizes file paths for security
 */
export function validateFilePath(
  filePath: string,
  allowedPaths?: string[]
): { valid: boolean; sanitized?: string; error?: string } {
  // Normalize and resolve the path
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(normalized);

  // Check for path traversal attempts
  if (normalized.includes('..') || normalized.includes('~')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // If allowed paths are specified, ensure the path is within them
  if (allowedPaths && allowedPaths.length > 0) {
    const isAllowed = allowedPaths.some((allowed) => {
      const allowedResolved = path.resolve(allowed);
      return resolved.startsWith(allowedResolved);
    });

    if (!isAllowed) {
      return { valid: false, error: 'Path is outside allowed directories' };
    }
  }

  return { valid: true, sanitized: resolved };
}

/**
 * Validates Git repository URLs
 */
export function validateGitUrl(url: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  try {
    const parsed = new URL(url);

    // Only allow specific protocols
    if (!['http:', 'https:', 'ssh:', 'git:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid protocol for Git URL' };
    }

    // Basic hostname validation
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, error: 'Invalid hostname' };
    }

    // Remove any authentication info from URL
    parsed.username = '';
    parsed.password = '';

    return { valid: true, sanitized: parsed.toString() };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates API endpoints
 */
export function validateApiEndpoint(
  endpoint: string,
  baseUrl?: string
): { valid: boolean; sanitized?: string; error?: string } {
  try {
    let url: URL;

    if (baseUrl) {
      url = new URL(endpoint, baseUrl);
    } else {
      url = new URL(endpoint);
    }

    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP(S) protocols are allowed' };
    }

    // Check for localhost/private IPs (optional security measure)
    const hostname = url.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)) {
      return { valid: true, sanitized: url.toString() }; // Allow for testing
    }

    // Basic validation passed
    return { valid: true, sanitized: url.toString() };
  } catch (error) {
    return { valid: false, error: 'Invalid endpoint format' };
  }
}

/**
 * Sanitizes command arguments to prevent injection
 */
export function sanitizeCommandArgs(args: string[]): string[] {
  return args.map((arg) => {
    // Remove shell metacharacters
    return arg.replace(/[;&|`$<>\\]/g, '');
  });
}

/**
 * Validates environment variables
 */
export function validateEnvironmentVars(env: Record<string, string>): {
  valid: boolean;
  sanitized?: Record<string, string>;
  error?: string;
} {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    // Validate key format
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      return { valid: false, error: `Invalid environment variable name: ${key}` };
    }

    // Sanitize value (remove null bytes and control characters)
    sanitized[key] = value.replace(/[\x00-\x1F\x7F]/g, '');
  }

  return { valid: true, sanitized };
}

/**
 * Command whitelist for safe execution
 */
const SAFE_COMMANDS = new Set([
  'echo',
  'cat',
  'ls',
  'pwd',
  'date',
  'whoami',
  'git',
  'npm',
  'node',
  'bun',
  'yarn',
  'pnpm',
  'grep',
  'find',
  'wc',
  'sort',
  'uniq',
  'curl',
  'wget',
  'ping',
  'jest',
  'mocha',
  'vitest',
  'pytest',
]);

/**
 * Validates commands for safe execution
 */
export function validateCommand(command: string): { valid: boolean; error?: string } {
  const cmd = command.trim().split(/\s+/)[0];

  // Check if command is in whitelist
  if (!SAFE_COMMANDS.has(cmd)) {
    return { valid: false, error: `Command '${cmd}' is not in the allowed list` };
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /rm\s+-rf/,
    /format/i,
    /mkfs/,
    /dd\s+if=/,
    />\s*\/dev\//,
    /sudo/,
    /su\s+-/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return { valid: false, error: 'Command contains dangerous pattern' };
    }
  }

  return { valid: true };
}

/**
 * Creates a sandbox configuration for safe execution
 */
export interface SandboxConfig {
  tempDir: string;
  allowedPaths: string[];
  maxFileSize: number;
  maxExecutionTime: number;
  networkAccess: boolean;
}

export function createSandboxConfig(baseDir: string): SandboxConfig {
  const tempDir = path.join(baseDir, '.scenario-sandbox', Date.now().toString());

  return {
    tempDir,
    allowedPaths: [tempDir],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxExecutionTime: 30000, // 30 seconds
    networkAccess: false,
  };
}

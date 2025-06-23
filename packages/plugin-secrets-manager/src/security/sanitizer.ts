// Try to import DOMPurify, fallback to basic sanitization if not available
let DOMPurify: any;
try {
  DOMPurify = require('isomorphic-dompurify');
} catch (error) {
  // Fallback implementation for environments without isomorphic-dompurify
  DOMPurify = {
    sanitize: (input: string) => {
      // Basic HTML escape fallback
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
  };
}

interface SanitizationOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    stripUnknown?: boolean;
}

const DEFAULT_OPTIONS: SanitizationOptions = {
    allowedTags: []  // No HTML tags by default
    allowedAttributes: {},
    stripUnknown: true
};

export class Sanitizer {
    private options: SanitizationOptions;

    constructor(options?: SanitizationOptions) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Sanitize HTML input
     */
    sanitizeHTML(input: string): string {
        if (!input) return '';

        // Configure DOMPurify
        const config = {
            ALLOWED_TAGS: this.options.allowedTags,
            ALLOWED_ATTR: Object.keys(this.options.allowedAttributes || {}),
            KEEP_CONTENT: !this.options.stripUnknown,
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false,
            RETURN_DOM_IMPORT: false,
            SAFE_FOR_JQUERY: false,
            SANITIZE_DOM: true,
            WHOLE_DOCUMENT: false,
            FORCE_BODY: false,
            IN_PLACE: false,
            USE_PROFILES: false
        };

        return DOMPurify.sanitize(input, config);
    }

    /**
     * Escape HTML entities
     */
    escapeHTML(input: string): string {
        if (!input) return '';

        const escapeMap: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return input.replace(/[&<>"'/]/g, char => escapeMap[char]);
    }

    /**
     * Sanitize for use in JavaScript strings
     */
    sanitizeForJS(input: string): string {
        if (!input) return '';

        return input
            .replace(/\\/g, '\\\\')  // Escape backslashes
            .replace(/'/g, "\\'")    // Escape single quotes
            .replace(/"/g, '\\"')    // Escape double quotes
            .replace(/\n/g, '\\n')   // Escape newlines
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t')   // Escape tabs
            .replace(/\x00/g, '');   // Remove null bytes
    }

    /**
     * Sanitize for use in URLs
     */
    sanitizeURL(input: string): string {
        if (!input) return '';

        try {
            const url = new URL(input);
            
            // Only allow http(s) protocols
            if (!['http:', 'https:'].includes(url.protocol)) {
                return '';
            }

            // Encode the URL components
            return encodeURI(url.toString());
        } catch {
            // If not a valid URL, encode as component
            return encodeURIComponent(input);
        }
    }

    /**
     * Sanitize file names
     */
    sanitizeFileName(input: string): string {
        if (!input) return '';

        // Remove any path traversal attempts
        let sanitized = input.replace(/[\/\\]/g, '');
        
        // Remove dangerous characters
        sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');
        
        // Remove leading dots (hidden files)
        sanitized = sanitized.replace(/^\.+/, '');
        
        // Limit length
        if (sanitized.length > 255) {
            const ext = sanitized.lastIndexOf('.');
            if (ext > 0) {
                const name = sanitized.substring(0, ext);
                const extension = sanitized.substring(ext);
                sanitized = name.substring(0, 255 - extension.length) + extension;
            } else {
                sanitized = sanitized.substring(0, 255);
            }
        }

        // Default if empty
        return sanitized || 'unnamed';
    }

    /**
     * Sanitize JSON input
     */
    sanitizeJSON(input: string): object | null {
        if (!input) return null;

        try {
            // Parse JSON to validate structure
            const parsed = JSON.parse(input);
            
            // Re-stringify to remove any code execution attempts
            return JSON.parse(JSON.stringify(parsed));
        } catch {
            return null;
        }
    }

    /**
     * Validate and sanitize environment variable names
     */
    sanitizeEnvVarName(input: string): string {
        if (!input) return '';

        // Only allow alphanumeric, underscore, and dash
        // Must start with letter or underscore
        const sanitized = input
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '_')
            .replace(/^[^A-Z_]/, '_');

        return sanitized || 'INVALID_NAME';
    }

    /**
     * Sanitize secret values (minimal processing to preserve data)
     */
    sanitizeSecretValue(input: string): string {
        if (!input) return '';

        // Only remove null bytes and control characters
        return input.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    /**
     * Validate input length
     */
    validateLength(input: string, maxLength: number): boolean {
        return input.length <= maxLength;
    }

    /**
     * Sanitize input object recursively
     */
    sanitizeObject(obj: any, maxDepth: number = 10): any {
        if (maxDepth <= 0) return null;

        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
            return this.escapeHTML(obj);
        }

        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
        }

        if (typeof obj === 'object') {
            const sanitized: Record<string, any> = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.sanitizeEnvVarName(key);
                sanitized[sanitizedKey] = this.sanitizeObject(value, maxDepth - 1);
            }
            return sanitized;
        }

        return null; // Unknown type
    }
}

// Export singleton instances for common use cases
export const htmlSanitizer = new Sanitizer();
export const formSanitizer = new Sanitizer({
    allowedTags: ['b', 'i', 'em', 'strong', 'br'],
    allowedAttributes: {}
});
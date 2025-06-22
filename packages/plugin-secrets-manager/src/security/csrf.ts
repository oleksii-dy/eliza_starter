import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

interface CSRFOptions {
    cookieName?: string;
    headerName?: string;
    tokenLength?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
}

const DEFAULT_OPTIONS: Required<CSRFOptions> = {
    cookieName: '_csrf',
    headerName: 'x-csrf-token',
    tokenLength: 32,
    secure: true,
    sameSite: 'strict'
};

export class CSRFProtection {
    private options: Required<CSRFOptions>;
    private tokens: Map<string, { token: string; expires: number }> = new Map();

    constructor(options?: CSRFOptions) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        
        // Clean up expired tokens every 5 minutes
        setInterval(() => this.cleanupTokens(), 5 * 60 * 1000);
    }

    /**
     * Generates a new CSRF token
     */
    generateToken(): string {
        return randomBytes(this.options.tokenLength).toString('hex');
    }

    /**
     * Middleware to generate and attach CSRF token
     */
    generateTokenMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const token = this.generateToken();
            const sessionId = req.sessionID || this.generateToken();
            
            // Store token with 1 hour expiry
            this.tokens.set(sessionId, {
                token,
                expires: Date.now() + 3600000
            });

            // Set token in cookie
            res.cookie(this.options.cookieName, token, {
                httpOnly: true,
                secure: this.options.secure,
                sameSite: this.options.sameSite,
                maxAge: 3600000 // 1 hour
            });

            // Make token available to templates
            res.locals.csrfToken = token;

            next();
        };
    }

    /**
     * Middleware to validate CSRF token
     */
    validateTokenMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Skip validation for GET requests
            if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
                return next();
            }

            // Get token from multiple sources
            const headerToken = req.headers[this.options.headerName] as string;
            const bodyToken = req.body?._csrf;
            const queryToken = req.query?._csrf as string;
            const cookieToken = req.cookies?.[this.options.cookieName];

            const submittedToken = headerToken || bodyToken || queryToken;

            if (!submittedToken || !cookieToken) {
                return res.status(403).json({
                    error: 'CSRF token missing'
                });
            }

            // Validate tokens match
            if (!this.constantTimeCompare(submittedToken, cookieToken)) {
                return res.status(403).json({
                    error: 'Invalid CSRF token'
                });
            }

            // Check if token is still valid in our store
            const sessionId = req.sessionID || submittedToken;
            const storedToken = this.tokens.get(sessionId);

            if (!storedToken || storedToken.expires < Date.now()) {
                return res.status(403).json({
                    error: 'CSRF token expired'
                });
            }

            next();
        };
    }

    /**
     * Helper to inject CSRF token into forms
     */
    getTokenField(token: string): string {
        return `<input type="hidden" name="_csrf" value="${token}">`;
    }

    /**
     * Constant-time string comparison
     */
    private constantTimeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * Clean up expired tokens
     */
    private cleanupTokens(): void {
        const now = Date.now();
        for (const [sessionId, data] of this.tokens.entries()) {
            if (data.expires < now) {
                this.tokens.delete(sessionId);
            }
        }
    }
}

// Export singleton instance
export const csrfProtection = new CSRFProtection();
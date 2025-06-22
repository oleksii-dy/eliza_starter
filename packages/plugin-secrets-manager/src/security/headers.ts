import { Request, Response, NextFunction } from 'express';

interface SecurityHeadersOptions {
    enableCSP?: boolean;
    enableHSTS?: boolean;
    cspDirectives?: Record<string, string[]>;
    frameOptions?: 'DENY' | 'SAMEORIGIN';
}

const DEFAULT_CSP_DIRECTIVES = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"], // Will tighten this later
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'media-src': ["'none'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': []
};

export class SecurityHeaders {
    private options: Required<SecurityHeadersOptions>;

    constructor(options?: SecurityHeadersOptions) {
        this.options = {
            enableCSP: true,
            enableHSTS: true,
            frameOptions: 'DENY',
            cspDirectives: DEFAULT_CSP_DIRECTIVES,
            ...options
        };
    }

    /**
     * Security headers middleware
     */
    middleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Prevent MIME type sniffing
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Prevent clickjacking
            res.setHeader('X-Frame-Options', this.options.frameOptions);

            // Enable XSS protection
            res.setHeader('X-XSS-Protection', '1; mode=block');

            // Remove server header
            res.removeHeader('X-Powered-By');

            // Referrer policy
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

            // Permissions policy
            res.setHeader('Permissions-Policy', 
                'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), ' +
                'cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), ' +
                'execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), ' +
                'geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), ' +
                'midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), ' +
                'screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()'
            );

            // HSTS (HTTP Strict Transport Security)
            if (this.options.enableHSTS && req.secure) {
                res.setHeader(
                    'Strict-Transport-Security',
                    'max-age=31536000; includeSubDomains; preload'
                );
            }

            // Content Security Policy
            if (this.options.enableCSP) {
                const cspHeader = this.buildCSPHeader();
                res.setHeader('Content-Security-Policy', cspHeader);
            }

            next();
        };
    }

    /**
     * Build CSP header from directives
     */
    private buildCSPHeader(): string {
        const directives: string[] = [];
        
        for (const [directive, values] of Object.entries(this.options.cspDirectives) as Array<[string, string[]]>) {
            if (values.length === 0) {
                directives.push(directive);
            } else {
                directives.push(`${directive} ${values.join(' ')}`);
            }
        }

        return directives.join('; ');
    }

    /**
     * Add nonce to CSP for inline scripts
     */
    addNonce(nonce: string): void {
        if (!this.options.cspDirectives['script-src']) {
            this.options.cspDirectives['script-src'] = [];
        }
        this.options.cspDirectives['script-src'].push(`'nonce-${nonce}'`);
    }

    /**
     * Generate a CSP nonce
     */
    static generateNonce(): string {
        return Buffer.from(Math.random().toString(36).substring(2)).toString('base64');
    }
}

// Export singleton instance
export const securityHeaders = new SecurityHeaders();
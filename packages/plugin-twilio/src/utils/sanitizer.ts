export class LogSanitizer {
    private static readonly PATTERNS = {
        PHONE_NUMBERS: [
            /\+\d{1,}/g,
            /\b\d{10,}\b/g,
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
        ],
        API_KEYS: [
            /sk-ant-[a-zA-Z0-9-]+/g,
            /sk-[a-zA-Z0-9-]+/g
        ],
        FILE_PATHS: [
            /\/Users\/[^\/]+/g,
            /[A-Za-z]:\\Users\\[^\\]+/g
        ],
        TWILIO_IDS: [
            /AC[a-zA-Z0-9]{32}/g,
            /SM[a-zA-Z0-9]{32}/g
        ],
        REQUEST_IDS: [
            /req_[a-zA-Z0-9]+/g
        ],
        EMAILS: [
            /[\w.-]+@[\w.-]+\.\w+/g
        ],
        ENV_VARS: [
            /(TWILIO_[A-Z_]+|ANTHROPIC_[A-Z_]+)=["']?[^"'\s]+["']?/g
        ]
    };

    private static readonly REPLACEMENTS = {
        PHONE_NUMBERS: '+***',
        API_KEYS: 'sk-***',
        FILE_PATHS: '/Users/***',
        TWILIO_IDS: {
            AC: 'AC***',
            SM: 'SM***'
        },
        REQUEST_IDS: 'req_***',
        EMAILS: '***@***.***',
        ENV_VARS: '$1=***'
    };

    static sanitize(log: string | object): string {
        if (typeof log !== 'string') {
            log = JSON.stringify(log);
        }

        let sanitized = log;

        // Apply all sanitization patterns
        Object.entries(this.PATTERNS).forEach(([key, patterns]) => {
            patterns.forEach(pattern => {
                sanitized = sanitized.replace(pattern,
                    key === 'TWILIO_IDS'
                        ? (match) => this.REPLACEMENTS.TWILIO_IDS[match.substring(0,2)]
                        : this.REPLACEMENTS[key]);
            });
        });

        return sanitized;
    }

    static sanitizeAnthropicLogs(log: any): any {
        if (!log) return log;

        // Deep clone to avoid modifying original
        const sanitized = JSON.parse(JSON.stringify(log));

        // Sanitize headers
        if (sanitized.headers) {
            if (sanitized.headers['x-api-key']) {
                sanitized.headers['x-api-key'] = 'sk-***';
            }
        }

        // Sanitize body
        if (sanitized.body?.system) {
            sanitized.body.system = this.sanitize(sanitized.body.system);
        }

        return sanitized;
    }
}
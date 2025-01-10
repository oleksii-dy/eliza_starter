import { LogSanitizer } from './sanitizer.js';

export class SafeLogger {
    private static debugMode = false;

    static setDebugMode(enabled: boolean) {
        this.debugMode = enabled;
    }

    static log(...args: any[]) {
        console.log(...this.sanitizeArgs(args));
    }

    static error(...args: any[]) {
        console.error(...this.sanitizeArgs(args));
    }

    static info(...args: any[]) {
        console.info(...this.sanitizeArgs(args));
    }

    static warn(...args: any[]) {
        console.warn(...this.sanitizeArgs(args));
    }

    static debug(...args: any[]) {
        if (this.debugMode) {
            console.debug(...this.sanitizeArgs(args));
        }
    }

    private static sanitizeArgs(args: any[]): any[] {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return LogSanitizer.sanitize(arg);
            }
            if (arg instanceof Error) {
                return new Error(LogSanitizer.sanitize(arg.message));
            }
            return LogSanitizer.sanitize(JSON.stringify(arg));
        });
    }

    // Special method for Anthropic debug logs
    static anthropicDebug(type: string, data: any) {
        console.log(`Anthropic:${type}:`, LogSanitizer.sanitizeAnthropicDebug(data));
    }

    // Method for initialization logs
    static init(service: string, data: any) {
        console.log(`Initialized ${service} with:`, LogSanitizer.sanitize(JSON.stringify(data)));
    }

    // Add method for core logger wrapping
    static wrapCoreLogger(message: string, data: any) {
        const sanitized = LogSanitizer.sanitize(JSON.stringify({
            message,
            data,
            timestamp: new Date().toISOString()
        }));
        console.log('[ElizaLogger]', sanitized);
    }

    // Add method for runtime logs
    static runtime(message: string, data: any) {
        const sanitized = LogSanitizer.sanitize(JSON.stringify({
            message,
            data: {
                ...data,
                // Mask agent ID if present
                agentId: data.agentId ? '***' : undefined,
                // Mask any file paths
                path: data.path ? '/***' : undefined
            }
        }));
        console.log('Runtime:', sanitized);
    }

    // Add method for character config logs
    static character(name: string, config: any) {
        const sanitized = {
            name,
            model: config.model,
            // Truncate personality to avoid leaking full system prompt
            personality: config.personality?.substring(0, 50) + '...'
        };
        console.log('Character config:', sanitized);
    }

    // Add method for service status
    private static seenMessages = new Set<string>();
    static service(name: string, status: string) {
        const key = `${name}:${status}`;
        if (!this.seenMessages.has(key)) {
            this.seenMessages.add(key);
            console.log(`${name} service ${status}`);
        }
    }

    // Add method for agent logs
    static agent(message: string, data: any) {
        const sanitized = {
            message,
            data: {
                character: data.character ? {
                    name: data.character,
                    model: data.model
                } : undefined,
                agentId: '***'  // Always mask agent ID
            }
        };
        console.log('Agent:', sanitized);
    }

    // Add method for ElizaLogger output
    static elizaLog(type: string, data: any) {
        // Sanitize all file paths and environment data
        const sanitized = {
            type,
            data: LogSanitizer.sanitize(JSON.stringify(data)),
            timestamp: new Date().toISOString()
        };
        console.log(`[ElizaLogger] ${type}:`, sanitized);
    }
}
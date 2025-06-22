import { IAgentRuntime } from '@elizaos/core';
import * as crypto from 'crypto';

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface ScanResult {
  found: boolean;
  secrets: Array<{
    type: string;
    severity: string;
    match: string;
    redacted: string;
    line?: number;
    column?: number;
    file?: string;
  }>;
}

export class SecretsScanner {
  private patterns: SecretPattern[] = [
    // Specific API Keys (must come before generic pattern)
    {
      name: 'AWS Access Key',
      pattern: /(?:AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
      severity: 'critical',
      description: 'AWS Access Key ID',
    },
    {
      name: 'AWS Secret Key',
      pattern:
        /(?:aws[_\-]?secret[_\-]?access[_\-]?key|aws[_\-]?secret[_\-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9\/\+=]{40})['"]?/gi,
      severity: 'critical',
      description: 'AWS Secret Access Key',
    },
    {
      name: 'Google API Key',
      pattern: /AIza[0-9A-Za-z\-_]{35}/g,
      severity: 'high',
      description: 'Google API Key',
    },
    {
      name: 'GitHub Token',
      pattern: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}/g,
      severity: 'critical',
      description: 'GitHub Personal Access Token',
    },
    {
      name: 'Slack Token',
      pattern: /xox[baprs]-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24,}/g,
      severity: 'high',
      description: 'Slack API Token',
    },
    {
      name: 'Stripe API Key',
      pattern: /(?:sk|pk)_(?:test|live)_[a-zA-Z0-9]{24,}/g,
      severity: 'critical',
      description: 'Stripe API Key',
    },
    {
      name: 'Anthropic API Key',
      pattern: /sk-ant-api[0-9]{2}-[a-zA-Z0-9\-_]{48}/g,
      severity: 'critical',
      description: 'Anthropic Claude API Key',
    },
    {
      name: 'OpenAI API Key',
      pattern: /sk-[a-zA-Z0-9]{48}/g,
      severity: 'critical',
      description: 'OpenAI API Key',
    },
    // Generic API Key (must come after specific patterns)
    {
      name: 'Generic API Key',
      pattern: /(?:api[_\-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi,
      severity: 'high',
      description: 'Generic API key pattern',
    },

    // Private Keys
    {
      name: 'RSA Private Key',
      pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
      severity: 'critical',
      description: 'RSA Private Key',
    },
    {
      name: 'SSH Private Key',
      pattern:
        /-----BEGIN (?:DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:DSA|EC|OPENSSH) PRIVATE KEY-----/g,
      severity: 'critical',
      description: 'SSH Private Key',
    },

    // Database Connections
    {
      name: 'PostgreSQL Connection',
      pattern: /postgres(?:ql)?:\/\/[a-zA-Z0-9\-_]+:[^@\s]+@[^\/\s]+(?::\d+)?\/[^\s]+/gi,
      severity: 'critical',
      description: 'PostgreSQL connection string with credentials',
    },
    {
      name: 'MySQL Connection',
      pattern: /mysql:\/\/[a-zA-Z0-9\-_]+:[^@\s]+@[^\/\s]+(?::\d+)?\/[^\s]+/gi,
      severity: 'critical',
      description: 'MySQL connection string with credentials',
    },
    {
      name: 'MongoDB Connection',
      pattern: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9\-_]+:[^@\s]+@[^\/\s]+/gi,
      severity: 'critical',
      description: 'MongoDB connection string with credentials',
    },

    // Tokens
    {
      name: 'JWT Token',
      pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
      severity: 'medium',
      description: 'JSON Web Token',
    },
    {
      name: 'Bearer Token',
      pattern: /[Bb]earer\s+[a-zA-Z0-9\-_\.]{20,}/g,
      severity: 'medium',
      description: 'Bearer authentication token',
    },

    // Passwords
    {
      name: 'Password in URL',
      pattern: /(?:password|pwd|pass)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
      severity: 'high',
      description: 'Password in configuration or URL',
    },
    {
      name: 'Basic Auth',
      pattern: /[Bb]asic\s+[a-zA-Z0-9\+\/]+=*/g,
      severity: 'high',
      description: 'Basic authentication header',
    },

    // Cloud Providers
    {
      name: 'Azure Storage Key',
      pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[a-zA-Z0-9\+\/]+=*/g,
      severity: 'critical',
      description: 'Azure Storage connection string',
    },
    {
      name: 'GCP Service Account',
      pattern: /"private_key":\s*"-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----"/g,
      severity: 'critical',
      description: 'Google Cloud service account key',
    },

    // Cryptocurrency
    {
      name: 'Bitcoin Private Key',
      pattern: /[KL][1-9A-HJ-NP-Za-km-z]{50,51}/g,
      severity: 'critical',
      description: 'Bitcoin private key',
    },
    {
      name: 'Ethereum Private Key',
      pattern: /0x[a-fA-F0-9]{64}/g,
      severity: 'critical',
      description: 'Ethereum private key',
    },
  ];

  private entropyThreshold = 4.5; // High entropy threshold for detecting secrets

  constructor(private runtime: IAgentRuntime) {}

  /**
   * Scan text for secrets
   */
  async scanText(text: string, filename?: string): Promise<ScanResult> {
    const secrets: ScanResult['secrets'] = [];
    const lines = text.split('\n');

    // Check each pattern
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const secretValue = match[1] || match[0];

        // Find line and column
        let totalChars = 0;
        let lineNumber = 0;
        let columnNumber = 0;

        for (let i = 0; i < lines.length; i++) {
          if (totalChars + lines[i].length >= match.index!) {
            lineNumber = i + 1;
            columnNumber = match.index! - totalChars + 1;
            break;
          }
          totalChars += lines[i].length + 1; // +1 for newline
        }

        secrets.push({
          type: pattern.name,
          severity: pattern.severity,
          match: fullMatch,
          redacted: this.redactSecret(secretValue),
          line: lineNumber,
          column: columnNumber,
          file: filename,
        });
      }
    }

    // Check for high entropy strings (potential secrets)
    const entropySecrets = this.findHighEntropyStrings(text, filename);
    secrets.push(...entropySecrets);

    return {
      found: secrets.length > 0,
      secrets,
    };
  }

  /**
   * Scan multiple files
   */
  async scanFiles(files: Map<string, string>): Promise<ScanResult> {
    const allSecrets: ScanResult['secrets'] = [];

    for (const [filename, content] of files) {
      const result = await this.scanText(content, filename);
      allSecrets.push(...result.secrets);
    }

    return {
      found: allSecrets.length > 0,
      secrets: allSecrets,
    };
  }

  /**
   * Redact a secret value
   */
  redactSecret(secret: string): string {
    if (typeof secret !== 'string') {
      return '***REDACTED***';
    }

    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }

    const visibleChars = 4;
    const start = secret.substring(0, visibleChars);
    const end = secret.substring(secret.length - visibleChars);
    const middleLength = Math.max(secret.length - visibleChars * 2, 3);
    const middle = '*'.repeat(middleLength);

    return `${start}${middle}${end}`;
  }

  /**
   * Redact all secrets in text
   */
  redactSecretsInText(text: string): string {
    let redactedText = text;

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      redactedText = redactedText.replace(regex, (match, group1) => {
        const secretPart = group1 || match;
        const redacted = this.redactSecret(secretPart);
        return match.replace(secretPart, redacted);
      });
    }

    // Also redact high entropy strings
    const entropyRegex = /[a-zA-Z0-9\+\/\-_]{20,}/g;
    redactedText = redactedText.replace(entropyRegex, (match) => {
      if (this.calculateEntropy(match) > this.entropyThreshold) {
        return this.redactSecret(match);
      }
      return match;
    });

    return redactedText;
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const frequencies = new Map<string, number>();

    for (const char of str) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    let entropy = 0;
    const length = str.length;

    for (const count of frequencies.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Find high entropy strings that might be secrets
   */
  private findHighEntropyStrings(text: string, filename?: string): ScanResult['secrets'] {
    const secrets: ScanResult['secrets'] = [];
    const potentialSecrets = text.match(/[a-zA-Z0-9\+\/\-_]{20,}/g) || [];

    for (const potential of potentialSecrets) {
      const entropy = this.calculateEntropy(potential);

      if (entropy > this.entropyThreshold) {
        // Skip if it's a known safe pattern
        if (this.isKnownSafePattern(potential)) {
          continue;
        }

        const index = text.indexOf(potential);
        const lines = text.substring(0, index).split('\n');
        const lineNumber = lines.length;
        const columnNumber = lines[lines.length - 1].length + 1;

        secrets.push({
          type: 'High Entropy String',
          severity: 'medium',
          match: potential,
          redacted: this.redactSecret(potential),
          line: lineNumber,
          column: columnNumber,
          file: filename,
        });
      }
    }

    return secrets;
  }

  /**
   * Check if a string is a known safe pattern
   */
  private isKnownSafePattern(str: string): boolean {
    const safePatterns = [
      /^[a-f0-9]{40}$/, // Git commit hash
      /^[a-f0-9]{64}$/, // SHA256 hash
      /^[A-Z0-9_]+$/, // Environment variable name
      /^data:image\/[a-z]+;base64,/, // Base64 image
      /^[a-zA-Z0-9\-]+\.(js|ts|css|html|json)$/, // File names
    ];

    return safePatterns.some((pattern) => pattern.test(str));
  }

  /**
   * Add custom secret pattern
   */
  addPattern(pattern: SecretPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get all patterns
   */
  getPatterns(): SecretPattern[] {
    return [...this.patterns];
  }

  /**
   * Validate environment variables
   */
  async validateEnvironmentVariables(env: Record<string, string | undefined>): Promise<ScanResult> {
    const secrets: ScanResult['secrets'] = [];

    for (const [key, value] of Object.entries(env)) {
      if (!value) continue;

      const result = await this.scanText(`${key}=${value}`);
      if (result.found) {
        secrets.push(
          ...result.secrets.map((s) => ({
            ...s,
            file: 'environment',
          }))
        );
      }
    }

    return {
      found: secrets.length > 0,
      secrets,
    };
  }

  /**
   * Create a secure hash of a secret for comparison
   */
  hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }
}

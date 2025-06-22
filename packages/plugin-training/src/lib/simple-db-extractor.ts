import { TrainingExample } from '../simple-types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { elizaLogger } from '@elizaos/core';

/**
 * Simple database extractor that works with any ElizaOS database format
 */
export class SimpleDbExtractor {
  constructor(private dataDir: string = './.elizadb') {}

  /**
   * Extract training data from ElizaOS database files
   */
  async extractTrainingData(): Promise<TrainingExample[]> {
    const examples: TrainingExample[] = [];

    try {
      elizaLogger.info(`🔍 Scanning ${this.dataDir} for ElizaOS data...`);

      // Check if the database directory exists
      try {
        await fs.access(this.dataDir);
      } catch {
        elizaLogger.info('📭 No ElizaOS database found. Creating sample data...');
        return this.createSampleData();
      }

      // Look for JSON files that might contain conversation data
      const files = await fs.readdir(this.dataDir);
      elizaLogger.info(`📂 Found ${files.length} files in database directory`);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.dataDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            elizaLogger.info(`📄 Processing ${file}...`);
            const fileExamples = this.extractFromData(data, file);
            examples.push(...fileExamples);
          } catch (error) {
            elizaLogger.warn(`⚠️  Skipping ${file}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      if (examples.length === 0) {
        elizaLogger.info('📭 No training data found in database. Creating sample data...');
        return this.createSampleData();
      }

      elizaLogger.info(`✅ Extracted ${examples.length} examples from database`);
      return examples;

    } catch (error) {
      elizaLogger.error('❌ Error extracting from database:', error);
      elizaLogger.info('📭 Creating sample data instead...');
      return this.createSampleData();
    }
  }

  /**
   * Extract examples from any data structure
   */
  private extractFromData(data: any, filename: string): TrainingExample[] {
    const examples: TrainingExample[] = [];

    try {
      // Handle different data formats
      if (Array.isArray(data)) {
        // Array of messages/memories
        for (let i = 0; i < data.length - 1; i++) {
          const current = data[i];
          const next = data[i + 1];
          
          const example = this.tryCreateExample(current, next, filename);
          if (example) {
            examples.push(example);
          }
        }
      } else if (data.messages || data.memories) {
        // Object with messages/memories array
        const messages = data.messages || data.memories;
        if (Array.isArray(messages)) {
          for (let i = 0; i < messages.length - 1; i++) {
            const current = messages[i];
            const next = messages[i + 1];
            
            const example = this.tryCreateExample(current, next, filename);
            if (example) {
              examples.push(example);
            }
          }
        }
      } else if (data.content || data.text) {
        // Single message/memory
        const example = this.createExampleFromSingle(data, filename);
        if (example) {
          examples.push(example);
        }
      }

    } catch (error) {
      elizaLogger.warn(`⚠️  Error processing data from ${filename}:`, error);
    }

    return examples;
  }

  /**
   * Try to create a training example from two consecutive items
   */
  private tryCreateExample(current: any, next: any, source: string): TrainingExample | null {
    try {
      // Extract text content from various formats
      const currentText = this.extractText(current);
      const nextText = this.extractText(next);

      if (!currentText || !nextText) {
        return null;
      }

      // Check if this looks like a user-agent interaction
      const isUserAgent = this.isUserAgentPair(current, next);
      if (!isUserAgent) {
        return null;
      }

      // Assess quality
      const quality = this.assessQuality(currentText, nextText);
      if (quality < 0.5) {
        return null;
      }

      // Generate thinking block
      const thinking = this.generateThinking(currentText, nextText);

      return {
        id: `extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        request: currentText,
        response: nextText,
        thinking,
        quality,
        createdAt: new Date(),
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Create example from single item (for conversational data)
   */
  private createExampleFromSingle(data: any, source: string): TrainingExample | null {
    try {
      const text = this.extractText(data);
      if (!text || text.length < 20) {
        return null;
      }

      // Create a simple request-response pair
      const parts = text.split(/[.!?]\s+/);
      if (parts.length < 2) {
        return null;
      }

      const request = parts[0] + '.';
      const response = parts.slice(1).join(' ');

      if (response.length < 10) {
        return null;
      }

      return {
        id: `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        request,
        response,
        thinking: 'This appears to be a conversational example that can be used for training.',
        quality: 0.6,
        createdAt: new Date(),
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Extract text from various object formats
   */
  private extractText(obj: any): string {
    if (typeof obj === 'string') {
      return obj;
    }

    if (obj && typeof obj === 'object') {
      // Try common text fields
      const textFields = ['text', 'content', 'message', 'body', 'description'];
      for (const field of textFields) {
        if (obj[field] && typeof obj[field] === 'string') {
          return obj[field];
        }
        if (obj[field] && obj[field].text && typeof obj[field].text === 'string') {
          return obj[field].text;
        }
      }
    }

    return '';
  }

  /**
   * Check if this looks like a user-agent pair
   */
  private isUserAgentPair(current: any, next: any): boolean {
    // Basic heuristics to detect user-agent interactions
    const currentText = this.extractText(current);
    const nextText = this.extractText(next);

    // Check for different speakers/entities
    if (current.entityId && next.entityId && current.entityId !== next.entityId) {
      return true;
    }

    if (current.userId && next.agentId) {
      return true;
    }

    // Check for question-answer patterns
    if (currentText.includes('?') && nextText.length > currentText.length) {
      return true;
    }

    // Check for request-response patterns
    const requestWords = ['create', 'make', 'build', 'implement', 'write', 'help', 'please'];
    const responseWords = ['I\'ll', 'I will', 'Here', 'Let me', 'Sure'];

    const hasRequest = requestWords.some(word => currentText.toLowerCase().includes(word));
    const hasResponse = responseWords.some(word => nextText.includes(word));

    return hasRequest && hasResponse;
  }

  /**
   * Assess the quality of an interaction
   */
  private assessQuality(request: string, response: string): number {
    let quality = 0.5;

    // Length indicates effort
    if (response.length > 100) quality += 0.1;
    if (response.length > 300) quality += 0.1;
    if (response.length > 500) quality += 0.1;

    // Code indicates technical content
    if (response.includes('```') || response.includes('function') || response.includes('export')) {
      quality += 0.2;
    }

    // Detailed responses are better
    if (response.includes('implementation') || response.includes('example')) {
      quality += 0.1;
    }

    // Plugin-related content is high value
    if (request.toLowerCase().includes('plugin') || response.toLowerCase().includes('plugin')) {
      quality += 0.2;
    }

    // Penalty for short or low-effort responses
    if (response.length < 50) quality -= 0.3;
    if (response.includes('I don\'t know') || response.includes('sorry')) quality -= 0.1;

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Generate thinking block
   */
  private generateThinking(request: string, response: string): string {
    const thoughts = [];

    if (request.toLowerCase().includes('plugin')) {
      thoughts.push('The user wants to create or work with a plugin.');
      thoughts.push('I should provide a complete implementation following ElizaOS patterns.');
    } else if (request.includes('?')) {
      thoughts.push('The user is asking a question.');
      thoughts.push('I should provide a clear and helpful answer.');
    } else {
      thoughts.push('The user needs assistance.');
      thoughts.push('I should provide relevant and detailed help.');
    }

    if (response.includes('```')) {
      thoughts.push('I\'ll include code examples to illustrate the solution.');
    }

    return thoughts.join(' ');
  }

  /**
   * Create sample data for demonstration
   */
  private createSampleData(): TrainingExample[] {
    return [
      {
        id: 'sample-1',
        request: 'Create a Discord plugin for ElizaOS',
        response: 'I\'ll create a comprehensive Discord plugin for ElizaOS. Here\'s the implementation:\n\n```typescript\nimport { Plugin } from \'@elizaos/core\';\n// Complete implementation...\n```',
        thinking: 'The user wants a Discord plugin. I need to create a complete implementation with proper TypeScript types, Discord.js integration, and ElizaOS patterns.',
        quality: 0.95,
        createdAt: new Date(),
      },
      {
        id: 'sample-2',
        request: 'How do I create a custom action?',
        response: 'To create a custom action in ElizaOS, you need to implement the Action interface. Here\'s how:\n\n```typescript\nconst myAction: Action = {\n  name: \'MY_ACTION\',\n  // implementation...\n};\n```',
        thinking: 'The user wants to understand how to create custom actions. I should explain the Action interface and provide a complete example.',
        quality: 0.9,
        createdAt: new Date(),
      },
      {
        id: 'sample-3',
        request: 'Build a weather API integration',
        response: 'I\'ll create a weather API integration plugin that fetches real-time weather data. This will include error handling, rate limiting, and proper data formatting for ElizaOS.',
        thinking: 'This requires API integration with proper error handling and rate limiting. I should structure this as a service with actions and providers.',
        quality: 0.85,
        createdAt: new Date(),
      },
    ];
  }
}
/**
 * Mock LLM Service for Testing Scenarios
 * Provides realistic agent responses when real LLM is not available
 */

import { type IAgentRuntime, type Memory, type Content, logger } from '@elizaos/core';

export class MockLLMService {
  // @ts-expect-error - Used for potential future functionality
  private _runtime: IAgentRuntime;
  private responseTemplates: Map<string, string[]> = new Map();

  constructor(runtime: IAgentRuntime) {
    this._runtime = runtime;

    // Log that we're using mock service
    console.log('🎭 Using MockLLMService for deterministic responses');

    this.setupResponseTemplates();
  }

  private setupResponseTemplates(): void {
    // Greeting responses
    this.responseTemplates.set('greeting', [
      "Hello! I'm ready to help with this scenario test.",
      "Hi there! All systems are operational and I'm ready to assist.",
      "Greetings! I'm functioning properly and ready for testing.",
    ]);

    // Confirmation responses
    this.responseTemplates.set('confirmation', [
      'Yes, all systems are working correctly. The infrastructure is operational.',
      'Confirmed! The scenario runner is functioning as expected.',
      'All systems are green. The testing environment is ready.',
    ]);

    // System status responses
    this.responseTemplates.set('status', [
      'System status: All components operational. Database connected, runtime active.',
      'Infrastructure check: AgentServer ✓, Database ✓, WebSockets ✓, Message Bridge ✓',
      'Status report: All systems nominal. Ready for scenario execution.',
    ]);

    // Task completion responses
    this.responseTemplates.set('completion', [
      'Task completed successfully. Ready for the next instruction.',
      'Done! The requested action has been executed.',
      'Completed as requested. What would you like me to do next?',
    ]);

    // Default responses
    this.responseTemplates.set('default', [
      'I understand. Let me process that request.',
      'Acknowledged. Working on that now.',
      'Got it! Processing your request.',
    ]);
  }

  /**
   * Generate a mock response based on message content
   */
  generateResponse(message: Memory): Content {
    const text = message.content.text?.toLowerCase() || '';
    let responseCategory = 'default';

    // Determine response category based on message content
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      responseCategory = 'greeting';
    } else if (text.includes('confirm') || text.includes('working') || text.includes('systems')) {
      responseCategory = 'confirmation';
    } else if (text.includes('status') || text.includes('check') || text.includes('operational')) {
      responseCategory = 'status';
    } else if (text.includes('thank') || text.includes('complete') || text.includes('done')) {
      responseCategory = 'completion';
    }

    // Select a random response from the category
    const responses =
      this.responseTemplates.get(responseCategory) || this.responseTemplates.get('default')!;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    logger.info(`MockLLMService: Generated ${responseCategory} response for: "${text}"`);

    return {
      text: randomResponse,
      source: 'mock-llm',
      thought: `Generated mock response in category: ${responseCategory}`,
    };
  }

  /**
   * Check if the runtime has a valid LLM configuration
   */
  static hasValidLLM(runtime: IAgentRuntime): boolean {
    const apiKey = runtime.getSetting('OPENAI_API_KEY');
    return !!(apiKey && apiKey !== 'mock-key-for-testing' && !apiKey.includes('test-key'));
  }

  /**
   * Create a mock response handler for the runtime
   */
  static createMockHandler(runtime: IAgentRuntime) {
    const mockService = new MockLLMService(runtime);

    return async (message: Memory, callback: (response: Content) => Promise<Memory[]>) => {
      // Add a small delay to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

      const response = mockService.generateResponse(message);
      await callback(response);
    };
  }
}

/**
 * Enhanced message processing with fallback to mock LLM
 */
export async function processMessageWithLLMFallback(
  runtime: IAgentRuntime,
  message: Memory,
  callback: (response: Content) => Promise<Memory[]>
): Promise<void> {
  try {
    // Try to process with real LLM first
    if (MockLLMService.hasValidLLM(runtime)) {
      logger.info('Processing message with real LLM');
      // Use the message manager if available
      const messageManager = (runtime as any).messageManager;
      if (messageManager?.handleMessage) {
        await messageManager.handleMessage({
          message,
          runtime,
          callback,
        });
      } else {
        // Fallback to mock if no message handler available
        throw new Error('No message handler available');
      }
    } else {
      // Fallback to mock LLM
      logger.info('Processing message with mock LLM (no valid API key)');
      const mockHandler = MockLLMService.createMockHandler(runtime);
      await mockHandler(message, callback);
    }
  } catch (error) {
    logger.warn('LLM processing failed, falling back to mock:', error);
    const mockHandler = MockLLMService.createMockHandler(runtime);
    await mockHandler(message, callback);
  }
}

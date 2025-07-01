import { GrokLanguageModel } from '../index';
import OpenAI from 'openai';
import { ChatMessage } from '@elizaos/core';

// Mock the OpenAI client
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
  });
});

const MOCK_XAI_API_KEY = 'test-xai-api-key';

describe('GrokLanguageModel', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.XAI_API_KEY = MOCK_XAI_API_KEY;
    (OpenAI.prototype.chat.completions.create as jest.Mock).mockClear();
    (OpenAI as jest.Mock).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if API key is not provided', () => {
    delete process.env.XAI_API_KEY;
    expect(() => new GrokLanguageModel()).toThrow(
      'XAI_API_KEY is not set in environment variables and no apiKey provided in config.'
    );
  });

  it('should initialize OpenAI client with correct params', () => {
    new GrokLanguageModel();
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: MOCK_XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  });

  it('should use apiKey from config if provided', () => {
    const configApiKey = 'config-provided-key';
    new GrokLanguageModel({ apiKey: configApiKey });
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: configApiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  });

  describe('generate', () => {
    it('should call OpenAI completions.create with correct parameters and return mapped response', async () => {
      const model = new GrokLanguageModel();
      const mockResponse: OpenAI.Chat.Completions.ChatCompletion = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'grok-3-latest',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello from Grok!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      (model['client'].chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const output = await model.generate(messages);

      expect(model['client'].chat.completions.create).toHaveBeenCalledWith({
        model: 'grok-3-latest',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: undefined,
        max_tokens: undefined,
        stream: false,
        tools: undefined,
        tool_choice: undefined,
      });
      expect(output.content).toBe('Hello from Grok!');
      expect(output.model).toBe('grok-3-latest');
      expect(output.usage?.totalTokens).toBe(15);
    });
  });

  // TODO: Add tests for the stream method, which will be more complex due to stream handling.
  // For now, this covers the basic structure and generate method.
  describe('stream', () => {
    it('should call OpenAI completions.create with stream: true', async () => {
        const model = new GrokLanguageModel();
        // Mock the stream response
        const mockStream = async function* () {
            yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] };
            yield { choices: [{ delta: { content: ' from Grok!' }, finish_reason: null }] };
            yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
        };
        (model['client'].chat.completions.create as jest.Mock).mockResolvedValue(mockStream());

        const messages: ChatMessage[] = [{ role: 'user', content: 'Stream hello' }];
        const streamResult = await model.stream(messages);

        expect(model['client'].chat.completions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stream: true,
                messages: [{ role: 'user', content: 'Stream hello' }],
            })
        );

        // Consume the stream to verify (simplified)
        const reader = streamResult.getReader();
        let content = '';
        let chunk = await reader.read();
        while (!chunk.done) {
            content += chunk.value.content;
            chunk = await reader.read();
        }
        expect(content).toBe('Hello from Grok!');
    });
  });

});

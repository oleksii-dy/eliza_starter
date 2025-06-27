/**
 * Character Conversation Messages API Tests
 * Tests for the character inference functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../[id]/messages/route';
import {
  clearTestDatabase,
  createTestOrganization,
  createTestUser,
} from '@/lib/test-utils';

// Mock dependencies
vi.mock('@/lib/auth/session', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('@/lib/characters/service', () => ({
  characterService: {
    getConversation: vi.fn(),
    getCharacterById: vi.fn(),
    addMessage: vi.fn(),
  },
}));

vi.mock('@/lib/billing/credits', () => ({
  CreditService: {
    checkSufficientCredits: vi.fn(),
    deductCreditsForUsage: vi.fn(),
  },
}));

// Mock fetch for OpenAI API
const mockFetch = vi.fn() as any;
mockFetch.preconnect = vi.fn();
global.fetch = mockFetch;

import { authService } from '@/lib/auth/session';
import { characterService } from '@/lib/characters/service';
import { CreditService } from '@/lib/billing/credits';

describe('/api/characters/conversations/[id]/messages', () => {
  let organizationId: string;
  let userId: string;
  let conversationId: string;
  let characterId: string;
  let mockUser: any;
  let mockCharacter: any;
  let mockConversation: any;

  beforeEach(async () => {
    await clearTestDatabase();

    // Create test data
    const org = await createTestOrganization();
    organizationId = org.id;

    const user = await createTestUser(organizationId);
    userId = user.id;

    conversationId = 'conv-123';
    characterId = 'char-123';

    mockUser = {
      id: userId,
      organizationId,
      email: 'test@example.com',
    };

    mockCharacter = {
      id: characterId,
      name: 'Test Character',
      characterConfig: {
        name: 'Test Character',
        bio: 'A helpful test character',
        personality: 'Friendly and helpful',
        style: 'Casual and engaging',
        system: 'You are a helpful assistant',
        knowledge: ['testing', 'AI'],
        messageExamples: [
          [{ user: 'Hello', assistant: 'Hi there! How can I help you today?' }],
        ],
      },
    };

    mockConversation = {
      id: conversationId,
      characterId,
      userId,
      organizationId,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now() - 1000,
        },
      ],
    };

    // Reset mocks
    vi.clearAllMocks();

    // Set environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_API_BASE_URL = 'https://api.openai.com';
  });

  afterEach(async () => {
    await clearTestDatabase();
    vi.resetAllMocks();
  });

  describe('POST /api/characters/conversations/[id]/messages', () => {
    const validMessage = {
      content: 'Hello, character!',
      metadata: { test: true },
    };

    it('should send message and get AI response successfully', async () => {
      // Mock auth
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      // Mock character service
      vi.mocked(characterService.getConversation).mockResolvedValue(
        mockConversation,
      );
      vi.mocked(characterService.getCharacterById).mockResolvedValue(
        mockCharacter,
      );

      const updatedConversationWithUser = {
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          {
            id: 'msg-2',
            role: 'user',
            content: validMessage.content,
            timestamp: Date.now(),
            metadata: validMessage.metadata,
          },
        ],
      };

      const finalConversationWithAI = {
        ...updatedConversationWithUser,
        messages: [
          ...updatedConversationWithUser.messages,
          {
            id: 'msg-3',
            role: 'assistant',
            content: 'Hello! How can I help you today?',
            timestamp: Date.now(),
            metadata: {
              model: 'gpt-4o-mini',
              tokensUsed: 25,
              cost: 0.001,
            },
          },
        ],
      };

      vi.mocked(characterService.addMessage)
        .mockResolvedValueOnce(updatedConversationWithUser as any)
        .mockResolvedValueOnce(finalConversationWithAI as any);

      // Mock credit service
      vi.mocked(CreditService.checkSufficientCredits).mockResolvedValue(true);
      vi.mocked(CreditService.deductCreditsForUsage).mockResolvedValue({
        success: true,
        remainingBalance: 95.0,
        deductedAmount: 0.005,
        transactionId: 'txn-123',
      });

      // Mock OpenAI API response
      const mockOpenAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Hello! How can I help you today?',
              },
            },
          ],
          usage: {
            total_tokens: 25,
            prompt_tokens: 15,
            completion_tokens: 10,
          },
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockOpenAIResponse as any);

      // Create request
      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // Call handler
      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.conversation).toEqual(finalConversationWithAI);
      expect(data.data.usage).toEqual({
        tokensUsed: 25,
        cost: 0.001,
        model: 'gpt-4o-mini',
      });

      // Verify service calls
      expect(characterService.addMessage).toHaveBeenCalledTimes(2);
      expect(CreditService.checkSufficientCredits).toHaveBeenCalledWith(
        organizationId,
        0.01,
      );
      expect(CreditService.deductCreditsForUsage).toHaveBeenCalledWith(
        organizationId,
        'system',
        {
          service: 'openai',
          operation: 'character_inference',
          modelName: 'gpt-4o-mini',
          inputTokens: 15,
          outputTokens: 10,
          agentId: characterId,
        },
      );

      // Verify OpenAI API call
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          },
          body: expect.stringContaining('gpt-4o-mini'),
        }),
      );
    });

    it('should handle insufficient credits', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(characterService.getConversation).mockResolvedValue(
        mockConversation,
      );
      vi.mocked(characterService.getCharacterById).mockResolvedValue(
        mockCharacter,
      );

      const updatedConversation = {
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          {
            id: 'msg-2',
            role: 'user',
            content: validMessage.content,
            timestamp: Date.now(),
          },
        ],
      };

      vi.mocked(characterService.addMessage).mockResolvedValue(
        updatedConversation as any,
      );
      vi.mocked(CreditService.checkSufficientCredits).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate AI response');
      expect(data.data.conversation).toEqual(updatedConversation);
    });

    it('should validate message content', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const invalidMessage = {
        content: '', // Empty content
      };

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(invalidMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should handle non-existent conversation', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(characterService.getConversation).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should handle non-existent character', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(characterService.getConversation).mockResolvedValue(
        mockConversation,
      );
      vi.mocked(characterService.getCharacterById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Character not found');
    });

    it('should handle OpenAI API errors', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(characterService.getConversation).mockResolvedValue(
        mockConversation,
      );
      vi.mocked(characterService.getCharacterById).mockResolvedValue(
        mockCharacter,
      );

      const updatedConversation = {
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          {
            id: 'msg-2',
            role: 'user',
            content: validMessage.content,
            timestamp: Date.now(),
          },
        ],
      };

      vi.mocked(characterService.addMessage).mockResolvedValue(
        updatedConversation as any,
      );
      vi.mocked(CreditService.checkSufficientCredits).mockResolvedValue(true);

      // Mock failed OpenAI API response
      const mockFailedResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      };

      vi.mocked(fetch).mockResolvedValue(mockFailedResponse as any);

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate AI response');
      expect(data.data.conversation).toEqual(updatedConversation);
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: conversationId }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });

    it('should build correct system prompt from character config', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(characterService.getConversation).mockResolvedValue(
        mockConversation,
      );
      vi.mocked(characterService.getCharacterById).mockResolvedValue(
        mockCharacter,
      );
      vi.mocked(characterService.addMessage).mockResolvedValue({
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          {
            id: 'msg-2',
            role: 'user',
            content: validMessage.content,
            timestamp: Date.now(),
          },
        ],
      } as any);
      vi.mocked(CreditService.checkSufficientCredits).mockResolvedValue(true);

      const mockOpenAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
          usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockOpenAIResponse as any);

      const request = new NextRequest(
        `http://localhost/api/characters/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(validMessage),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      await POST(request, { params: Promise.resolve({ id: conversationId }) });

      // Verify the system prompt was constructed correctly
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall).toBeDefined();
      const requestBody = JSON.parse(fetchCall![1]?.body as string);
      const systemMessage = requestBody.messages[0];

      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('Test Character');
      expect(systemMessage.content).toContain('A helpful test character');
      expect(systemMessage.content).toContain('Friendly and helpful');
      expect(systemMessage.content).toContain('Casual and engaging');
      expect(systemMessage.content).toContain('testing, AI');
      expect(systemMessage.content).toContain('Example interactions:');
    });
  });
});

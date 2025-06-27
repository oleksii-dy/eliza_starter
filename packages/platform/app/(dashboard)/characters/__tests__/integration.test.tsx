/**
 * Character Frontend Integration Tests
 * End-to-end tests for character functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  clearTestDatabase,
  createTestOrganization,
  createTestUser,
} from '@/lib/test-utils';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: 'test-conversation-id' }),
}));

// Mock fetch for API calls
(global.fetch as any) = vi.fn();

describe('Character System Integration', () => {
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    await clearTestDatabase();

    const org = await createTestOrganization();
    organizationId = org.id;

    const user = await createTestUser(organizationId);
    userId = user.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  describe('Character Creation Flow', () => {
    it('should allow creating a character with complete flow', async () => {
      const CreateCharacterPage = (await import('../create/page')).default;

      // Mock successful character creation
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'char-123',
            name: 'Test Character',
            slug: 'test-character',
            characterConfig: {
              name: 'Test Character',
              bio: 'A helpful assistant',
            },
            visibility: 'private',
          },
        }),
      } as any);

      const user = userEvent.setup();
      render(<CreateCharacterPage />);

      // Fill out the form
      await user.type(
        screen.getByLabelText(/character name/i),
        'Test Character',
      );
      await user.type(
        screen.getByLabelText(/description/i),
        'A helpful test character',
      );
      await user.type(
        screen.getByLabelText(/bio/i),
        'I am a helpful AI assistant',
      );
      await user.type(
        screen.getByLabelText(/personality/i),
        'Friendly and helpful',
      );

      // Add knowledge item
      const knowledgeInput =
        screen.getByPlaceholderText(/add knowledge topic/i);
      await user.type(knowledgeInput, 'Testing');
      await user.click(screen.getByRole('button', { name: /add/i }));

      // Add message example
      await user.type(screen.getByLabelText(/user message/i), 'Hello');
      await user.type(
        screen.getByLabelText(/character response/i),
        'Hi there! How can I help?',
      );
      await user.click(screen.getByRole('button', { name: /add example/i }));

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /create character/i }),
      );

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/characters',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('Test Character'),
          }),
        );
      });
    });

    it('should validate required fields', async () => {
      const CreateCharacterPage = (await import('../create/page')).default;

      const user = userEvent.setup();
      render(<CreateCharacterPage />);

      // Try to submit without required fields
      await user.click(
        screen.getByRole('button', { name: /create character/i }),
      );

      // Should show HTML5 validation (required attributes)
      const nameInput = screen.getByLabelText(/character name/i);
      expect(nameInput).toHaveAttribute('required');
    });

    it('should handle creation errors gracefully', async () => {
      const CreateCharacterPage = (await import('../create/page')).default;

      // Mock API error
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Character with this slug already exists',
        }),
      } as any);

      // Mock alert
      global.alert = vi.fn();

      const user = userEvent.setup();
      render(<CreateCharacterPage />);

      // Fill required fields
      await user.type(
        screen.getByLabelText(/character name/i),
        'Test Character',
      );
      await user.type(screen.getByLabelText(/bio/i), 'A test character');

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /create character/i }),
      );

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Character with this slug already exists',
        );
      });
    });
  });

  describe('Character Listing', () => {
    it('should display characters list', async () => {
      const { default: CharactersPage } = await import('../page');

      // Mock API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            characters: [
              {
                id: 'char-1',
                name: 'Assistant Bot',
                description: 'A helpful assistant',
                slug: 'assistant-bot',
                characterConfig: {
                  bio: 'I help with various tasks',
                  personality: 'Helpful and friendly',
                },
                visibility: 'public',
                totalConversations: 5,
                isActive: true,
              },
              {
                id: 'char-2',
                name: 'Creative Writer',
                description: 'A creative writing assistant',
                slug: 'creative-writer',
                characterConfig: {
                  bio: 'I help with creative writing',
                  personality: 'Creative and inspiring',
                },
                visibility: 'private',
                totalConversations: 2,
                isActive: true,
              },
            ],
            stats: {
              totalCharacters: 2,
              activeCharacters: 2,
              totalConversations: 7,
              totalMessages: 25,
            },
          },
        }),
      } as any);

      render(<CharactersPage />);

      await waitFor(() => {
        expect(screen.getByText('Assistant Bot')).toBeInTheDocument();
        expect(screen.getByText('Creative Writer')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Total characters stat
        expect(screen.getByText('7')).toBeInTheDocument(); // Total conversations stat
      });
    });

    it('should filter characters by search', async () => {
      const { default: CharactersPage } = await import('../page');

      let lastSearchQuery = '';

      // Mock API responses for different search queries
      vi.mocked(fetch).mockImplementation(async (url) => {
        const urlObj = new URL(url as string, 'http://localhost');
        lastSearchQuery = urlObj.searchParams.get('search') || '';

        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              characters:
                lastSearchQuery === 'assistant'
                  ? [
                    {
                      id: 'char-1',
                      name: 'Assistant Bot',
                      slug: 'assistant-bot',
                      characterConfig: { bio: 'I help with tasks' },
                      visibility: 'public',
                      totalConversations: 5,
                      isActive: true,
                    },
                  ]
                  : [],
              stats: {
                totalCharacters: lastSearchQuery === 'assistant' ? 1 : 0,
                activeCharacters: lastSearchQuery === 'assistant' ? 1 : 0,
                totalConversations: 0,
                totalMessages: 0,
              },
            },
          }),
        } as any;
      });

      const user = userEvent.setup();
      render(<CharactersPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // Search for "assistant"
      const searchInput = screen.getByPlaceholderText(/search characters/i);
      await user.type(searchInput, 'assistant');

      await waitFor(() => {
        expect(lastSearchQuery).toBe('assistant');
      });
    });

    it('should start conversation with character', async () => {
      const { default: CharactersPage } = await import('../page');

      // Mock characters list
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              characters: [
                {
                  id: 'char-1',
                  name: 'Assistant Bot',
                  slug: 'assistant-bot',
                  characterConfig: { bio: 'I help with tasks' },
                  visibility: 'public',
                  totalConversations: 0,
                  isActive: true,
                },
              ],
              stats: {
                totalCharacters: 1,
                activeCharacters: 1,
                totalConversations: 0,
                totalMessages: 0,
              },
            },
          }),
        } as any)
        // Mock conversation creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'conv-123',
              characterId: 'char-1',
              title: 'Chat with Assistant Bot',
              messages: [],
            },
          }),
        } as any);

      const user = userEvent.setup();
      render(<CharactersPage />);

      await waitFor(() => {
        expect(screen.getByText('Assistant Bot')).toBeInTheDocument();
      });

      // Click chat button
      const chatButton = screen.getByRole('button', { name: /chat/i });
      await user.click(chatButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/characters/char-1/conversations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          },
        );
      });
    });
  });

  describe('Character Chat Interface', () => {
    it('should display conversation and allow sending messages', async () => {
      const { default: CharacterChatPage } = await import('../chat/[id]/page');

      // Mock conversation data
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'conv-123',
              characterId: 'char-1',
              title: 'Chat with Assistant Bot',
              messages: [
                {
                  id: 'msg-1',
                  role: 'user',
                  content: 'Hello',
                  timestamp: Date.now() - 5000,
                },
                {
                  id: 'msg-2',
                  role: 'assistant',
                  content: 'Hi there! How can I help you today?',
                  timestamp: Date.now() - 4000,
                },
              ],
            },
          }),
        } as any)
        // Mock character data
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'char-1',
              name: 'Assistant Bot',
              characterConfig: {
                bio: 'I help with various tasks',
              },
              visibility: 'public',
            },
          }),
        } as any);

      render(<CharacterChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Assistant Bot')).toBeInTheDocument();
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(
          screen.getByText('Hi there! How can I help you today?'),
        ).toBeInTheDocument();
      });
    });

    it('should send message and receive AI response', async () => {
      const { default: CharacterChatPage } = await import('../chat/[id]/page');

      // Mock initial conversation load
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'conv-123',
              characterId: 'char-1',
              messages: [],
            },
          }),
        } as any)
        // Mock character data
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'char-1',
              name: 'Assistant Bot',
              characterConfig: { bio: 'I help with tasks' },
              visibility: 'public',
            },
          }),
        } as any)
        // Mock message sending
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              conversation: {
                id: 'conv-123',
                messages: [
                  {
                    id: 'msg-1',
                    role: 'user',
                    content: 'Hello',
                    timestamp: Date.now(),
                  },
                  {
                    id: 'msg-2',
                    role: 'assistant',
                    content: 'Hi there! How can I help you?',
                    timestamp: Date.now(),
                    metadata: {
                      cost: 0.001,
                      tokensUsed: 25,
                    },
                  },
                ],
              },
              usage: {
                cost: 0.001,
                tokensUsed: 25,
                model: 'gpt-4o-mini',
              },
            },
          }),
        } as any);

      const user = userEvent.setup();
      render(<CharacterChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Assistant Bot')).toBeInTheDocument();
      });

      // Type message
      const messageInput = screen.getByPlaceholderText(
        /message assistant bot/i,
      );
      await user.type(messageInput, 'Hello');

      // Send message
      const sendButton = screen.getByRole('button', { name: '' }); // Send button with icon
      await user.click(sendButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/characters/conversations/test-conversation-id/messages',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ content: 'Hello' }),
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(
          screen.getByText('Hi there! How can I help you?'),
        ).toBeInTheDocument();
      });
    });

    it('should handle AI response errors gracefully', async () => {
      const { default: CharacterChatPage } = await import('../chat/[id]/page');

      // Mock initial loads
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'conv-123', characterId: 'char-1', messages: [] },
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'char-1',
              name: 'Assistant Bot',
              characterConfig: { bio: 'I help with tasks' },
              visibility: 'public',
            },
          }),
        } as any)
        // Mock failed AI response
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error: 'Failed to generate AI response',
            data: {
              conversation: {
                id: 'conv-123',
                messages: [
                  {
                    id: 'msg-1',
                    role: 'user',
                    content: 'Hello',
                    timestamp: Date.now(),
                  },
                ],
              },
            },
          }),
        } as any);

      const user = userEvent.setup();
      render(<CharacterChatPage />);

      await waitFor(() => {
        expect(screen.getByText('Assistant Bot')).toBeInTheDocument();
      });

      // Send message
      const messageInput = screen.getByPlaceholderText(
        /message assistant bot/i,
      );
      await user.type(messageInput, 'Hello');

      const sendButton = screen.getByRole('button', { name: '' });
      await user.click(sendButton);

      await waitFor(() => {
        // Should show user message even if AI response failed
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors in character listing', async () => {
      const { default: CharactersPage } = await import('../page');

      // Mock API error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<CharactersPage />);

      await waitFor(() => {
        // Should show empty state or error message
        expect(screen.getByText(/no characters found/i)).toBeInTheDocument();
      });
    });

    it('should handle non-existent conversation', async () => {
      const { default: CharacterChatPage } = await import('../chat/[id]/page');

      // Mock conversation not found
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: null,
        }),
      } as any);

      render(<CharacterChatPage />);

      await waitFor(() => {
        expect(screen.getByText(/conversation not found/i)).toBeInTheDocument();
      });
    });
  });
});

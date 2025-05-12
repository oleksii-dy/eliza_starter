import { beforeAll, describe, expect, it, test, vi } from 'vitest';
import { formatEntities, getEntityDetails } from '../src/entities';
import { formatMessages, formatTimestamp } from '../src/prompts';
import type {
  Content,
  Entity,
  IAgentRuntime,
  IDatabaseAdapter,
  Memory,
  Room,
  UUID,
} from '../src/types';
import { ChannelType } from '../src/types';

describe('Messages Library', () => {
  let runtime: IAgentRuntime & IDatabaseAdapter;
  let entities: Entity[];
  let entityId: UUID;

  beforeAll(() => {
    // Mock runtime with necessary methods
    runtime = {
      // Using vi.fn() instead of jest.fn()
      getParticipantsForRoom: vi.fn(),
      getEntityById: vi.fn(),
      getRoom: vi.fn(),
    } as unknown as IAgentRuntime & IDatabaseAdapter;

    // Mock user data with proper UUID format
    entityId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    entities = [
      {
        id: entityId,
        names: ['Test User'],
        agentId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      },
    ];
  });

  test('formatEntities should format entities into a readable string', () => {
    const formattedEntities = formatEntities({ entities });

    expect(formattedEntities).toContain('Test User');
  });

  test('formatMessages should format messages into a readable string', () => {
    const messages: Memory[] = [
      {
        content: { text: 'Hello, world!' } as Content,
        entityId: entityId,
        roomId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
        createdAt: new Date().getTime(),
        agentId: '' as UUID, // assuming agentId is an empty string here
      },
    ];

    const formattedMessages = formatMessages({ messages, entities });

    // Assertions
    expect(formattedMessages).toContain('Hello, world!');
    expect(formattedMessages).toContain('Test User');
  });

  test('formatTimestamp should return correct time string', () => {
    const timestamp = new Date().getTime() - 60000; // 1 minute ago
    const result = formatTimestamp(timestamp);

    // Assertions
    expect(result).toBe('1 minute ago');
  });

  test('formatMessages should include attachments if present', () => {
    const messages: Memory[] = [
      {
        content: {
          text: 'Check this attachment',
          attachments: [
            {
              id: '123e4567-e89b-12d3-a456-426614174003' as UUID,
              title: 'Image',
              url: 'http://example.com/image.jpg',
            },
          ],
        } as Content,
        entityId: entityId,
        roomId: '123e4567-e89b-12d3-a456-426614174004' as UUID,
        createdAt: new Date().getTime(),
        agentId: '' as UUID, // assuming agentId is an empty string here
      },
    ];

    const formattedMessages = formatMessages({ messages, entities });

    // Assertions
    expect(formattedMessages).toContain('Check this attachment');
    expect(formattedMessages).toContain('Attachments: [');
  });

  test('formatMessages should handle empty attachments gracefully', () => {
    const messages: Memory[] = [
      {
        content: {
          text: 'No attachments here',
        } as Content,
        entityId: entityId,
        roomId: '123e4567-e89b-12d3-a456-426614174005' as UUID,
        createdAt: new Date().getTime(),
        agentId: '' as UUID, // assuming agentId is an empty string here
      },
    ];

    const formattedMessages = formatMessages({ messages, entities });

    // Assertions
    expect(formattedMessages).toContain('No attachments here');
    expect(formattedMessages).not.toContain('Attachments');
  });
});

describe('Messages', () => {
  const mockEntities: Entity[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174006' as UUID,
      names: ['Alice'],
      agentId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174007' as UUID,
      names: ['Bob'],
      agentId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
    },
  ];

  const mockMessages: Memory[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174008' as UUID,
      roomId: '123e4567-e89b-12d3-a456-426614174009' as UUID,
      entityId: mockEntities[0].id as UUID,
      createdAt: Date.now() - 5000, // 5 seconds ago
      content: {
        text: 'Hello everyone!',
        action: 'wave',
      } as Content,
      agentId: '123e4567-e89b-12d3-a456-426614174001',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174010' as UUID,
      roomId: '123e4567-e89b-12d3-a456-426614174009' as UUID,
      entityId: mockEntities[1].id as UUID,
      createdAt: Date.now() - 60000, // 1 minute ago
      content: {
        text: 'Hi Alice!',
        attachments: [
          {
            id: '123e4567-e89b-12d3-a456-426614174011' as UUID,
            title: 'Document',
            url: 'https://example.com/doc.pdf',
          },
        ],
      } as Content,
      agentId: '123e4567-e89b-12d3-a456-426614174001',
    },
  ];

 

  describe('formatEntities', () => {
    it('should format entities with complete details', () => {
      const formatted = formatEntities({ entities: mockEntities });
      // Updated to match current implementation which wraps names in quotes
      expect(formatted).toContain('"Alice"');
      expect(formatted).toContain('ID: 123e4567-e89b-12d3-a456-426614174006');
      expect(formatted).toContain('"Bob"');
      expect(formatted).toContain('ID: 123e4567-e89b-12d3-a456-426614174007');
    });

    it('should handle entities without details', () => {
      const actorsWithoutDetails: Entity[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174013' as UUID,
          names: ['Charlie'],
          agentId: '123e4567-e89b-12d3-a456-426614174003' as UUID,
        },
      ];
      const formatted = formatEntities({ entities: actorsWithoutDetails });
      // Updated to match current implementation which wraps names in quotes
      expect(formatted).toContain('"Charlie"');
      expect(formatted).toContain('ID: 123e4567-e89b-12d3-a456-426614174013');
    });

    it('should handle empty entities array', () => {
      const formatted = formatEntities({ entities: [] });
      expect(formatted).toBe('');
    });
  });

  describe('formatMessages', () => {
    it('should handle messages from unknown users', () => {
      const messagesWithUnknownUser: Memory[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174014' as UUID,
          roomId: '123e4567-e89b-12d3-a456-426614174009' as UUID,
          entityId: '123e4567-e89b-12d3-a456-426614174015' as UUID,
          createdAt: Date.now(),
          content: { text: 'Test message' } as Content,
          agentId: '123e4567-e89b-12d3-a456-426614174001',
        },
      ];

      const formatted = formatMessages({
        messages: messagesWithUnknownUser,
        entities: mockEntities,
      });
      expect(formatted).toContain('Unknown User: Test message');
    });

    it('should handle messages with no action', () => {
      const messagesWithoutAction: Memory[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174016' as UUID,
          roomId: '123e4567-e89b-12d3-a456-426614174009' as UUID,
          entityId: mockEntities[0].id as UUID,
          createdAt: Date.now(),
          content: { text: 'Simple message' } as Content,
          agentId: '123e4567-e89b-12d3-a456-426614174001',
        },
      ];

      const formatted = formatMessages({
        messages: messagesWithoutAction,
        entities: mockEntities,
      });
      expect(formatted).not.toContain('()');
      expect(formatted).toContain('Simple message');
    });

    it('should handle empty messages array', () => {
      const formatted = formatMessages({
        messages: [],
        entities: mockEntities,
      });
      expect(formatted).toBe('');
    });
  });

  describe('formatTimestamp', () => {
    it('should handle exact time boundaries', () => {
      const now = Date.now();
      expect(formatTimestamp(now)).toContain('just now');
    });
  });
});

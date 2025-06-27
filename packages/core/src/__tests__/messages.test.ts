import { expect } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import { formatEntities } from '../entities';
import { formatMessages, formatTimestamp } from '../utils';
import type { Content, Entity, Memory, UUID } from '../types';

const messagesLibrarySuite = createUnitTest('Messages Library Tests');

// Test context for shared data
interface MessagesTestContext {
  entities: Entity[];
  entityId: UUID;
  mockEntities: Entity[];
}

messagesLibrarySuite.beforeEach<MessagesTestContext>((context) => {
  // Mock user data with proper UUID format
  context.entityId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  context.entities = [
    {
      id: context.entityId,
      names: ['Test User'],
      agentId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
    },
  ];

  context.mockEntities = [
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
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatEntities should format entities into a readable string', async (context) => {
  const formattedEntities = formatEntities({ entities: context.entities });

  expect(formattedEntities).toContain('Test User');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatMessages should format messages into a readable string', async (context) => {
  const messages: Memory[] = [
    {
      content: { text: 'Hello, world!' } as Content,
      entityId: context.entityId,
      roomId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      createdAt: new Date().getTime(),
      agentId: '' as UUID, // assuming agentId is an empty string here
    },
  ];

  const formattedMessages = formatMessages({ messages, entities: context.entities });

  // Assertions
  expect(formattedMessages).toContain('Hello, world!');
  expect(formattedMessages).toContain('Test User');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatTimestamp should return correct time string', async (context) => {
  const timestamp = new Date().getTime() - 60000; // 1 minute ago
  const result = formatTimestamp(timestamp);

  // Assertions
  expect(result).toBe('1 minute ago');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatMessages should include attachments if present', async (context) => {
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
      entityId: context.entityId,
      roomId: '123e4567-e89b-12d3-a456-426614174004' as UUID,
      createdAt: new Date().getTime(),
      agentId: '' as UUID, // assuming agentId is an empty string here
    },
  ];

  const formattedMessages = formatMessages({ messages, entities: context.entities });

  // Assertions
  expect(formattedMessages).toContain('Check this attachment');
  expect(formattedMessages).toContain('Attachments: [');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatMessages should handle empty attachments gracefully', async (context) => {
  const messages: Memory[] = [
    {
      content: {
        text: 'No attachments here',
      } as Content,
      entityId: context.entityId,
      roomId: '123e4567-e89b-12d3-a456-426614174005' as UUID,
      createdAt: new Date().getTime(),
      agentId: '' as UUID, // assuming agentId is an empty string here
    },
  ];

  const formattedMessages = formatMessages({ messages, entities: context.entities });

  // Assertions
  expect(formattedMessages).toContain('No attachments here');
  expect(formattedMessages).not.toContain('Attachments');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatEntities should format entities with complete details', async (context) => {
  const formatted = formatEntities({ entities: context.mockEntities });
  expect(formatted).toContain('"Alice"\nID:');
  expect(formatted).toContain('"Bob"\nID:');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatEntities should handle entities without details', async (context) => {
  const actorsWithoutDetails: Entity[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174013' as UUID,
      names: ['Charlie'],
      agentId: '123e4567-e89b-12d3-a456-426614174003' as UUID,
    },
  ];
  const formatted = formatEntities({ entities: actorsWithoutDetails });
  expect(formatted).toContain('"Charlie"\nID:');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatEntities should handle empty entities array', async (context) => {
  const formatted = formatEntities({ entities: [] });
  expect(formatted).toBe('');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatMessages should handle messages from unknown users', async (context) => {
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
    entities: context.mockEntities,
  });
  expect(formatted).toContain('Unknown User: Test message');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatMessages should handle messages with no action', async (context) => {
  const messagesWithoutAction: Memory[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174016' as UUID,
      roomId: '123e4567-e89b-12d3-a456-426614174009' as UUID,
      entityId: context.mockEntities[0].id as UUID,
      createdAt: Date.now(),
      content: { text: 'Simple message' } as Content,
      agentId: '123e4567-e89b-12d3-a456-426614174001',
    },
  ];

  const formatted = formatMessages({
    messages: messagesWithoutAction,
    entities: context.mockEntities,
  });
  expect(formatted).not.toContain('()');
  expect(formatted).toContain('Simple message');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatMessages should handle empty messages array', async (context) => {
  const formatted = formatMessages({
    messages: [],
    entities: context.mockEntities,
  });
  expect(formatted).toBe('');
});

messagesLibrarySuite.addTest<MessagesTestContext>('formatTimestamp should handle exact time boundaries', async (context) => {
  const now = Date.now();
  expect(formatTimestamp(now)).toContain('just now');
});

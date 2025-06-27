import { expect, mock } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import { Content, Entity, IAgentRuntime, Memory, ModelType, State } from '../types';
import * as utils from '../utils';
import {
  addHeader,
  composePrompt,
  composePromptFromState,
  formatMessages,
  formatPosts,
  formatTimestamp,
  normalizeJsonString,
  parseBooleanFromText,
  parseJSONObjectFromText,
  parseKeyValueXml,
  safeReplacer,
  splitChunks,
  stringToUuid,
  trimTokens,
  truncateToCompleteSentence,
  validateUuid,
} from '../utils';

const utilsSuite = createUnitTest('Utils Comprehensive Tests');

// Test context for shared data
interface TestContext {
  mockRuntime: IAgentRuntime;
  fixedTime: Date;
  originalDate: DateConstructor;
}

utilsSuite.beforeEach<TestContext>((context) => {
  // Setup mock runtime for trimTokens tests
  context.mockRuntime = {
    useModel: mock(async (type: any, params: any) => {
      if (type === 'TEXT_TOKENIZER_ENCODE') {
        // Simple mock: each word is a token
        return params.prompt.split(' ');
      }
      if (type === 'TEXT_TOKENIZER_DECODE') {
        // Simple mock: join tokens back
        return params.tokens.join(' ');
      }
      return null;
    }),
  } as unknown as IAgentRuntime;

  // Setup fixed time for formatTimestamp tests
  context.fixedTime = new Date('2024-01-15T12:00:00Z');
  context.originalDate = globalThis.Date;
});

utilsSuite.addTest<TestContext>('parseBooleanFromText should return true for affirmative values', async (context) => {
  const affirmativeValues = [
    'YES',
    'Y',
    'TRUE',
    'T',
    '1',
    'ON',
    'ENABLE',
    'yes',
    'y',
    'true',
    't',
    ' YES ',
    ' true ',
  ];

  affirmativeValues.forEach((value) => {
    expect(parseBooleanFromText(value)).toBe(true);
  });
});

utilsSuite.addTest<TestContext>('parseBooleanFromText should return false for negative values', async (context) => {
  const negativeValues = [
    'NO',
    'N',
    'FALSE',
    'F',
    '0',
    'OFF',
    'DISABLE',
    'no',
    'n',
    'false',
    'f',
    ' NO ',
    ' false ',
  ];

  negativeValues.forEach((value) => {
    expect(parseBooleanFromText(value)).toBe(false);
  });
});

utilsSuite.addTest<TestContext>('parseBooleanFromText should return false for null, undefined, or empty values', async (context) => {
  expect(parseBooleanFromText(null)).toBe(false);
  expect(parseBooleanFromText(undefined)).toBe(false);
  expect(parseBooleanFromText('')).toBe(false);
});

utilsSuite.addTest<TestContext>('parseBooleanFromText should return false for unrecognized values', async (context) => {
  expect(parseBooleanFromText('maybe')).toBe(false);
  expect(parseBooleanFromText('123')).toBe(false);
  expect(parseBooleanFromText('YESNO')).toBe(false);
  expect(parseBooleanFromText('random')).toBe(false);
});

utilsSuite.addTest<TestContext>('formatTimestamp should return just now for recent timestamps', async (context) => {
  // Mock Date constructor to return fixed time
  globalThis.Date = class extends context.originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(context.fixedTime.toISOString());
      } else {
        super(...(args as [any]));
      }
    }
    static now() {
      return context.fixedTime.getTime();
    }
  } as any;

  try {
    expect(formatTimestamp(context.fixedTime.getTime())).toBe('just now');
    expect(formatTimestamp(context.fixedTime.getTime() - 30000)).toBe('just now'); // 30 seconds ago
    expect(formatTimestamp(context.fixedTime.getTime() - 59999)).toBe('just now'); // Just under 1 minute
  } finally {
    // Restore original Date
    globalThis.Date = context.originalDate;
  }
});

utilsSuite.addTest<TestContext>('formatTimestamp should return minutes ago for timestamps within an hour', async (context) => {
  globalThis.Date = class extends context.originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(context.fixedTime.toISOString());
      } else {
        super(...(args as [any]));
      }
    }
    static now() {
      return context.fixedTime.getTime();
    }
  } as any;

  try {
    expect(formatTimestamp(context.fixedTime.getTime() - 60000)).toBe('1 minute ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 120000)).toBe('2 minutes ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 1800000)).toBe('30 minutes ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 3599000)).toBe('59 minutes ago');
  } finally {
    globalThis.Date = context.originalDate;
  }
});

utilsSuite.addTest<TestContext>('formatTimestamp should return hours ago for timestamps within 24 hours', async (context) => {
  globalThis.Date = class extends context.originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(context.fixedTime.toISOString());
      } else {
        super(...(args as [any]));
      }
    }
    static now() {
      return context.fixedTime.getTime();
    }
  } as any;

  try {
    expect(formatTimestamp(context.fixedTime.getTime() - 3600000)).toBe('1 hour ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 7200000)).toBe('2 hours ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 43200000)).toBe('12 hours ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 86399000)).toBe('23 hours ago');
  } finally {
    globalThis.Date = context.originalDate;
  }
});

utilsSuite.addTest<TestContext>('formatTimestamp should return days ago for older timestamps', async (context) => {
  globalThis.Date = class extends context.originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(context.fixedTime.toISOString());
      } else {
        super(...(args as [any]));
      }
    }
    static now() {
      return context.fixedTime.getTime();
    }
  } as any;

  try {
    expect(formatTimestamp(context.fixedTime.getTime() - 86400000)).toBe('1 day ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 172800000)).toBe('2 days ago');
    expect(formatTimestamp(context.fixedTime.getTime() - 604800000)).toBe('7 days ago');
  } finally {
    globalThis.Date = context.originalDate;
  }
});

utilsSuite.addTest<TestContext>('parseJSONObjectFromText should parse JSON from code blocks', async (context) => {
  const text = 'Here is some JSON:\n```json\n{"key": "value", "number": 42}\n```';
  const result = parseJSONObjectFromText(text);
  // Note: normalizeJsonString converts numbers to strings
  expect(result).toEqual({ key: 'value', number: '42' });
});

utilsSuite.addTest<TestContext>('parseJSONObjectFromText should parse direct JSON without code blocks', async (context) => {
  const text = '{"name": "Alice", "age": 30}';
  const result = parseJSONObjectFromText(text);
  // Note: normalizeJsonString converts numbers to strings
  expect(result).toEqual({ name: 'Alice', age: '30' });
});

utilsSuite.addTest<TestContext>('parseJSONObjectFromText should return null for invalid JSON', async (context) => {
  expect(parseJSONObjectFromText('not json')).toBeNull();
  expect(parseJSONObjectFromText('{invalid json}')).toBeNull();
  expect(parseJSONObjectFromText('')).toBeNull();
});

utilsSuite.addTest<TestContext>('parseJSONObjectFromText should return null for arrays', async (context) => {
  expect(parseJSONObjectFromText('["item1", "item2"]')).toBeNull();
  expect(parseJSONObjectFromText('```json\n[1, 2, 3]\n```')).toBeNull();
});

utilsSuite.addTest<TestContext>('parseJSONObjectFromText should return null for non-object values', async (context) => {
  expect(parseJSONObjectFromText('"string"')).toBeNull();
  expect(parseJSONObjectFromText('42')).toBeNull();
  expect(parseJSONObjectFromText('true')).toBeNull();
  expect(parseJSONObjectFromText('null')).toBeNull();
});

utilsSuite.addTest<TestContext>('normalizeJsonString should remove extra spaces', async (context) => {
  // Note: normalizeJsonString doesn't handle unquoted keys
  expect(normalizeJsonString('{  "key": "value"  }')).toBe('{"key": "value"}');
  expect(normalizeJsonString('{\n  "key": "value"\n}')).toBe('{"key": "value"}');
});

utilsSuite.addTest<TestContext>('normalizeJsonString should wrap unquoted values in double quotes', async (context) => {
  expect(normalizeJsonString('{"key": value}')).toBe('{"key": "value"}');
  expect(normalizeJsonString('{"key": someWord}')).toBe('{"key": "someWord"}');
});

utilsSuite.addTest<TestContext>('normalizeJsonString should convert single quotes to double quotes', async (context) => {
  // The function only converts when format is exactly "key": 'value'
  expect(normalizeJsonString('"key": \'value\'')).toBe('"key": "value"');
  // When already inside JSON braces, single quotes inside are preserved
  const result = normalizeJsonString('{"key": \'value\', "key2": \'value2\'}');
  // The function converts the quotes but may not work perfectly for nested quotes
  expect(result).toContain('key');
  expect(result).toContain('value');
});

utilsSuite.addTest<TestContext>('normalizeJsonString should handle mixed formatting', async (context) => {
  const input = '{ "key1": value1, "key2": \'value2\', "key3": "value3" }';
  const result = normalizeJsonString(input);
  // Check that the function at least wraps unquoted values
  expect(result).toContain('"key1": "value1"');
  expect(result).toContain('"key3": "value3"');
});

utilsSuite.addTest<TestContext>('normalizeJsonString should wrap numbers in quotes', async (context) => {
  // normalizeJsonString wraps ALL unquoted values including numbers
  const input = '{"key": "value", "number": 42}';
  const result = normalizeJsonString(input);
  expect(result).toBe('{"key": "value", "number": "42"}');
});

utilsSuite.addTest<TestContext>('truncateToCompleteSentence should return text unchanged if within limit', async (context) => {
  const text = 'Short text.';
  expect(truncateToCompleteSentence(text, 50)).toBe(text);
});

utilsSuite.addTest<TestContext>('truncateToCompleteSentence should truncate at last period within limit', async (context) => {
  const text = 'First sentence. Second sentence. Third sentence that is very long.';
  expect(truncateToCompleteSentence(text, 35)).toBe('First sentence. Second sentence.');
});

utilsSuite.addTest<TestContext>('truncateToCompleteSentence should truncate at last space if no period found', async (context) => {
  const text = 'This is a very long sentence without any periods that needs truncation';
  expect(truncateToCompleteSentence(text, 30)).toBe('This is a very long sentence...');
});

utilsSuite.addTest<TestContext>('truncateToCompleteSentence should hard truncate if no space found', async (context) => {
  const text = 'Verylongwordwithoutanyspacesorperiods';
  // maxLength 10 - 3 = 7 chars for the text part
  expect(truncateToCompleteSentence(text, 10)).toBe('Verylon...');
});

utilsSuite.addTest<TestContext>('truncateToCompleteSentence should handle edge cases', async (context) => {
  expect(truncateToCompleteSentence('', 10)).toBe('');
  expect(truncateToCompleteSentence('No period', 5)).toBe('No...');
});

utilsSuite.addTest<TestContext>('splitChunks should split text into chunks', async (context) => {
  const text = 'a'.repeat(2000); // Long text
  const chunks = await splitChunks(text, 512, 20);

  expect(chunks).toBeInstanceOf(Array);
  expect(chunks.length).toBeGreaterThan(0);
  chunks.forEach((chunk) => {
    expect(chunk.length).toBeLessThanOrEqual(512 * 4); // Accounting for character to token ratio
  });
});

utilsSuite.addTest<TestContext>('splitChunks should handle short text', async (context) => {
  const text = 'Short text';
  const chunks = await splitChunks(text);

  expect(chunks).toHaveLength(1);
  expect(chunks[0]).toBe(text);
});

utilsSuite.addTest<TestContext>('splitChunks should respect chunk overlap', async (context) => {
  const text = `Word1 Word2 Word3 Word4 Word5 ${'Word6 '.repeat(100)}`;
  const chunks = await splitChunks(text, 50, 10);

  expect(chunks.length).toBeGreaterThan(1);
});

utilsSuite.addTest<TestContext>('trimTokens should trim tokens to specified limit', async (context) => {
  const prompt = 'one two three four five six seven eight nine ten';
  const result = await trimTokens(prompt, 5, context.mockRuntime);

  expect(result).toBe('six seven eight nine ten');
  expect(context.mockRuntime.useModel).toHaveBeenCalledTimes(2);
});

utilsSuite.addTest<TestContext>('trimTokens should return unchanged if within limit', async (context) => {
  const prompt = 'short text';
  const result = await trimTokens(prompt, 10, context.mockRuntime);

  expect(result).toBe(prompt);
});

utilsSuite.addTest<TestContext>('trimTokens should throw error for invalid inputs', async (context) => {
  await expect(trimTokens('', 10, context.mockRuntime)).rejects.toThrow();
  await expect(trimTokens('text', 0, context.mockRuntime)).rejects.toThrow();
  await expect(trimTokens('text', -1, context.mockRuntime)).rejects.toThrow();
});

utilsSuite.addTest<TestContext>('trimTokens should skip tokenization for very short prompts', async (context) => {
  const prompt = 'hi';
  const result = await trimTokens(prompt, 100, context.mockRuntime);

  expect(result).toBe(prompt);
  expect(context.mockRuntime.useModel).not.toHaveBeenCalled();
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should parse response XML blocks', async (context) => {
  const xml = `<response>
            <name>TestAgent</name>
            <reasoning>Test reasoning</reasoning>
            <action>RESPOND</action>
        </response>`;

  const result = parseKeyValueXml(xml);
  expect(result).toEqual({
    name: 'TestAgent',
    reasoning: 'Test reasoning',
    action: 'RESPOND',
  });
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should handle comma-separated lists for specific keys', async (context) => {
  const xml = `<response>
            <actions>ACTION1,ACTION2,ACTION3</actions>
            <providers>PROVIDER1, PROVIDER2</providers>
            <evaluators>EVAL1, EVAL2</evaluators>
        </response>`;

  const result = parseKeyValueXml(xml);
  expect(result).toEqual({
    actions: ['ACTION1', 'ACTION2', 'ACTION3'],
    providers: ['PROVIDER1', 'PROVIDER2'],
    evaluators: ['EVAL1', 'EVAL2'],
  });
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should parse boolean values', async (context) => {
  const xml = '<response><simple>true</simple><complex>false</complex></response>';

  const result = parseKeyValueXml(xml);
  expect(result).toEqual({
    simple: true,
    complex: 'false', // Only 'simple' key is treated as boolean
  });
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should handle XML entities', async (context) => {
  const xml = '<response><text>Value with &lt;tags&gt; &amp; entities</text></response>';

  const result = parseKeyValueXml(xml);
  expect(result).toEqual({
    text: 'Value with <tags> & entities',
  });
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should return null for invalid XML', async (context) => {
  expect(parseKeyValueXml('')).toBeNull();
  expect(parseKeyValueXml('not xml')).toBeNull();
  expect(parseKeyValueXml('<unclosed>')).toBeNull();
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should handle any root tag name', async (context) => {
  const xml = '<custom><key>value</key></custom>';
  const result = parseKeyValueXml(xml);
  expect(result).toEqual({ key: 'value' });
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should handle mismatched XML tags', async (context) => {
  // This tests lines 393-395 - warning about mismatched tags
  const xml = '<response><start>value</end></response>';
  const result = parseKeyValueXml(xml);
  // Should still try to parse what it can
  expect(result).toBeNull();
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should return null when no key-value pairs are found', async (context) => {
  // This tests lines 400-403 - no key-value pairs extracted
  const xml = '<response></response>'; // Empty response
  const result = parseKeyValueXml(xml);
  expect(result).toBeNull();

  // Also test with content that doesn't match the pattern
  const xml2 = '<response>Just plain text</response>';
  const result2 = parseKeyValueXml(xml2);
  expect(result2).toBeNull();
});

utilsSuite.addTest<TestContext>('parseKeyValueXml should handle empty comma-separated lists', async (context) => {
  const xml = `<response>
            <actions></actions>
            <providers> </providers>
        </response>`;

  const result = parseKeyValueXml(xml);
  expect(result).toEqual({
    actions: [],
    providers: [],
  });
});

utilsSuite.addTest<TestContext>('formatMessages should format messages with basic content', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
    {
      id: 'entity-2' as any,
      names: ['Bob'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now() - 60000, // 1 minute ago
      content: {
        text: 'Hello world',
        source: 'chat',
      } as Content,
    },
  ];

  const result = formatMessages({ messages, entities: mockEntities });

  expect(result).toContain('Alice');
  expect(result).toContain('Hello world');
  expect(result).toContain('1 minute ago');
  expect(result).toContain('[entity-1]');
});

utilsSuite.addTest<TestContext>('formatMessages should format messages with actions and thoughts', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-2' as any,
      names: ['Bob'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-2' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: {
        text: 'Doing something',
        thought: 'I should help',
        actions: ['SEARCH', 'REPLY'],
        source: 'chat',
      } as Content,
    },
  ];

  const result = formatMessages({ messages, entities: mockEntities });

  expect(result).toContain('Bob');
  expect(result).toContain('Doing something');
  expect(result).toContain("(Bob's internal thought: I should help)");
  expect(result).toContain("(Bob's actions: SEARCH, REPLY)");
});

utilsSuite.addTest<TestContext>('formatMessages should handle attachments', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: {
        text: 'Check this out',
        attachments: [
          { id: 'att-1', title: 'Image', url: 'http://example.com/img.jpg' },
          { id: 'att-2', title: 'Document', url: 'http://example.com/doc.pdf' },
        ],
        source: 'chat',
      } as Content,
    },
  ];

  const result = formatMessages({ messages, entities: mockEntities });

  expect(result).toContain(
    '(Attachments: [att-1 - Image (http://example.com/img.jpg)], [att-2 - Document (http://example.com/doc.pdf)])'
  );
});

utilsSuite.addTest<TestContext>('formatMessages should filter out messages without entityId', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: null as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: { text: 'Should be filtered', source: 'chat' } as Content,
    },
    {
      id: 'msg-2' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: { text: 'Should appear', source: 'chat' } as Content,
    },
  ];

  const result = formatMessages({ messages, entities: mockEntities });

  expect(result).not.toContain('Should be filtered');
  expect(result).toContain('Should appear');
});

utilsSuite.addTest<TestContext>('formatPosts should format posts grouped by room', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now() - 3600000,
      content: {
        text: 'First message',
        source: 'twitter',
      } as Content,
    },
    {
      id: 'msg-2' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: {
        text: 'Second message',
        source: 'twitter',
      } as Content,
    },
  ];

  const result = formatPosts({ messages, entities: mockEntities });

  // formatPosts uses roomId.slice(-5) to show only last 5 chars
  expect(result).toContain('Conversation: oom-1');
  expect(result).toContain('Name: Alice');
  expect(result).toContain('First message');
  expect(result).toContain('Second message');
  expect(result).toContain('Source: twitter');
});

utilsSuite.addTest<TestContext>('formatPosts should include reply information', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: {
        text: 'Reply message',
        inReplyTo: '12345678-1234-1234-1234-123456789012' as any,
        source: 'chat',
      } as Content,
    },
  ];

  const result = formatPosts({ messages, entities: mockEntities });

  expect(result).toContain('In reply to: 12345678-1234-1234-1234-123456789012');
});

utilsSuite.addTest<TestContext>('formatPosts should format without conversation header when specified', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-1' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: { text: 'Message', source: 'chat' } as Content,
    },
  ];

  const result = formatPosts({
    messages,
    entities: mockEntities,
    conversationHeader: false,
  });

  expect(result).not.toContain('Conversation:');
});

utilsSuite.addTest<TestContext>('formatPosts should handle missing entity with warning', async (context) => {
  // This tests line 209 - logger.warn when entity not found
  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'non-existent-entity' as any,
      roomId: 'room-1' as any,
      createdAt: Date.now(),
      content: {
        text: 'Message from unknown entity',
        source: 'chat',
      } as Content,
    },
  ];

  // Empty entities array to ensure entity is not found
  const result = formatPosts({ messages, entities: [] });

  // Should use "Unknown User" when entity not found
  expect(result).toContain('Unknown User');
  expect(result).toContain('unknown');
  expect(result).toContain('non-existent-entity');
});

utilsSuite.addTest<TestContext>('formatPosts should handle messages without roomId', async (context) => {
  const mockEntities: Entity[] = [
    {
      id: 'entity-1' as any,
      names: ['Alice'],
      agentId: 'agent-1' as any,
    },
  ];

  const messages: Memory[] = [
    {
      id: 'msg-1' as any,
      entityId: 'entity-1' as any,
      roomId: null as any, // No roomId
      createdAt: Date.now(),
      content: {
        text: 'Message without room',
        source: 'chat',
      } as Content,
    },
  ];

  const result = formatPosts({ messages, entities: mockEntities });

  // Messages without roomId should be filtered out
  expect(result).toBe('');
});

utilsSuite.addTest<TestContext>('validateUuid should validate correct UUID format', async (context) => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const result = validateUuid(validUuid);
  expect(result).toBe(validUuid);
});

utilsSuite.addTest<TestContext>('validateUuid should return null for invalid UUID format', async (context) => {
  expect(validateUuid('not-a-uuid')).toBeNull();
  expect(validateUuid('123')).toBeNull();
  expect(validateUuid('')).toBeNull();
  expect(validateUuid(null)).toBeNull();
  expect(validateUuid(undefined)).toBeNull();
  expect(validateUuid(123)).toBeNull();
  expect(validateUuid({})).toBeNull();
});

utilsSuite.addTest<TestContext>('validateUuid should handle UUID-like strings that are invalid', async (context) => {
  // Wrong format variations
  expect(validateUuid('123e4567-e89b-12d3-a456')).toBeNull(); // Too short
  expect(validateUuid('123e4567-e89b-12d3-a456-426614174000-extra')).toBeNull(); // Too long
  expect(validateUuid('123e4567e89b12d3a456426614174000')).toBeNull(); // No dashes
  expect(validateUuid('XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX')).toBeNull(); // Invalid chars
});

utilsSuite.addTest<TestContext>('stringToUuid should convert string to UUID', async (context) => {
  const result = stringToUuid('test-string');
  expect(result).toBeDefined();
  expect(typeof result).toBe('string');
  // Should be in UUID format
  expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

utilsSuite.addTest<TestContext>('stringToUuid should convert number to UUID', async (context) => {
  const result = stringToUuid(12345);
  expect(result).toBeDefined();
  expect(typeof result).toBe('string');
  expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

utilsSuite.addTest<TestContext>('stringToUuid should throw TypeError for non-string/non-number input', async (context) => {
  expect(() => stringToUuid(null as any)).toThrow(TypeError);
  expect(() => stringToUuid(undefined as any)).toThrow(TypeError);
  expect(() => stringToUuid({} as any)).toThrow(TypeError);
  expect(() => stringToUuid([] as any)).toThrow(TypeError);
  expect(() => stringToUuid(true as any)).toThrow(TypeError);
});

utilsSuite.addTest<TestContext>('stringToUuid should generate consistent UUID for same input', async (context) => {
  const input = 'consistent-input';
  const uuid1 = stringToUuid(input);
  const uuid2 = stringToUuid(input);
  expect(uuid1).toBe(uuid2);
});

utilsSuite.addTest<TestContext>('stringToUuid should generate different UUIDs for different inputs', async (context) => {
  const uuid1 = stringToUuid('input1');
  const uuid2 = stringToUuid('input2');
  expect(uuid1).not.toBe(uuid2);
});

utilsSuite.addTest<TestContext>('stringToUuid should handle special characters in string input', async (context) => {
  const specialChars = 'test@#$%^&*()_+-=[]{}|;\':",./<>?';
  const result = stringToUuid(specialChars);
  expect(result).toBeDefined();
  expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

utilsSuite.addTest<TestContext>('stringToUuid should handle empty string', async (context) => {
  const result = stringToUuid('');
  expect(result).toBeDefined();
  expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

utilsSuite.addTest<TestContext>('stringToUuid should handle very long strings', async (context) => {
  const longString = 'a'.repeat(1000);
  const result = stringToUuid(longString);
  expect(result).toBeDefined();
  expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

utilsSuite.addTest<TestContext>('safeReplacer should handle circular references', async (context) => {
  const obj: any = { a: 1, b: { c: 2 } };
  obj.circular = obj; // Create circular reference
  obj.b.parent = obj; // Another circular reference

  const replacer = safeReplacer();
  const result = JSON.stringify(obj, replacer);

  expect(result).toContain('[Circular]');
  expect(result).toContain('"a":1');
  expect(result).toContain('"c":2');

  // Should not throw error
  expect(() => JSON.stringify(obj, replacer)).not.toThrow();
});

utilsSuite.addTest<TestContext>('safeReplacer should handle non-circular objects normally', async (context) => {
  const obj = {
    a: 1,
    b: { c: 2 },
    d: [1, 2, 3],
    e: null,
    f: 'string',
  };

  const replacer = safeReplacer();
  const result = JSON.stringify(obj, replacer);

  expect(result).toBe(JSON.stringify(obj)); // Should be identical
  expect(result).not.toContain('[Circular]');
});

utilsSuite.addTest<TestContext>('safeReplacer should handle nested circular references', async (context) => {
  const obj: any = {
    level1: {
      level2: {
        level3: {},
      },
    },
  };
  obj.level1.level2.level3.back = obj.level1; // Circular reference

  const replacer = safeReplacer();
  const result = JSON.stringify(obj, replacer);

  expect(result).toContain('[Circular]');
  expect(() => JSON.stringify(obj, replacer)).not.toThrow();
});

utilsSuite.addTest<TestContext>('safeReplacer should handle arrays with circular references', async (context) => {
  const arr: any[] = [1, 2, 3];
  const obj = { arr, value: 'test' };
  arr.push(obj); // Circular reference through array

  const replacer = safeReplacer();
  const result = JSON.stringify({ data: arr }, replacer);

  expect(result).toContain('[Circular]');
  expect(result).toContain('1');
  expect(result).toContain('2');
  expect(result).toContain('3');
});

utilsSuite.addTest<TestContext>('composePrompt should compose prompt with state values', async (context) => {
  const state = {
    name: 'Alice',
    role: 'developer',
    task: 'write tests',
  };
  const template = 'Hello {{name}}, as a {{role}}, please {{task}}.';

  const result = composePrompt({ state, template });

  expect(result).toBe('Hello Alice, as a developer, please write tests.');
});

utilsSuite.addTest<TestContext>('composePrompt should handle missing state values', async (context) => {
  const state = {
    name: 'Bob',
  };
  const template = 'Hello {{name}}, your role is {{role}}.';

  const result = composePrompt({ state, template });

  // Handlebars replaces missing values with empty string
  expect(result).toBe('Hello Bob, your role is .');
});

utilsSuite.addTest<TestContext>('composePrompt should handle empty state', async (context) => {
  const state = {};
  const template = 'Template with {{placeholder}}.';

  const result = composePrompt({ state, template });

  // Handlebars replaces missing values with empty string
  expect(result).toBe('Template with .');
});

utilsSuite.addTest<TestContext>('composePrompt should handle multiple occurrences of same placeholder', async (context) => {
  const state = {
    word: 'test',
  };
  const template = '{{word}} {{word}} {{word}}';

  const result = composePrompt({ state, template });

  expect(result).toBe('test test test');
});

utilsSuite.addTest<TestContext>('composePromptFromState should compose prompt from State object', async (context) => {
  const mockState: State = {
    // Required State properties
    userId: 'user-123' as any,
    agentId: 'agent-123' as any,
    roomId: 'room-123' as any,
    bio: 'I am a helpful assistant',
    lore: 'Created to help with tasks',
    senderName: 'Assistant',
    actors: 'user123',
    actorsData: [
      {
        id: 'actor-1' as any,
        names: ['John'],
        agentId: 'agent-123' as any,
      },
    ],
    // Template values
    recentMessages: 'Recent conversation history',
    relevantKnowledge: 'Relevant facts',
    recentMessagesData: [
      {
        id: 'msg-1' as any,
        entityId: 'entity-1' as any,
        roomId: 'room-123' as any,
        createdAt: Date.now(),
        content: {
          text: 'Hello',
          source: 'chat',
        } as Content,
      },
    ],
    // Additional required State properties
    values: {},
    data: {},
    text: '',
  };

  const template = 'Bio: {{bio}}\nLore: {{lore}}\nRecent: {{recentMessages}}';

  const result = composePromptFromState({ state: mockState, template });

  expect(result).toContain('Bio: I am a helpful assistant');
  expect(result).toContain('Lore: Created to help with tasks');
  expect(result).toContain('Recent: Recent conversation history');
});

utilsSuite.addTest<TestContext>('composePromptFromState should handle State with array data', async (context) => {
  const mockState: State = {
    userId: 'user-123' as any,
    agentId: 'agent-123' as any,
    roomId: 'room-123' as any,
    bio: 'Assistant bio',
    senderName: 'User',
    actors: '',
    actorsData: [
      {
        id: 'actor-1' as any,
        names: ['Alice'],
        agentId: 'agent-123' as any,
      },
      {
        id: 'actor-2' as any,
        names: ['Bob'],
        agentId: 'agent-123' as any,
      },
    ],
    recentMessagesData: [],
    values: {},
    data: {},
    text: '',
  };

  const template = 'Actors: {{actors}}\nSender: {{senderName}}';

  const result = composePromptFromState({ state: mockState, template });

  expect(result).toContain('Sender: User');
  // actors field might be generated from actorsData
  expect(result).toBeDefined();
});

utilsSuite.addTest<TestContext>('composePromptFromState should handle missing properties in State', async (context) => {
  const mockState: State = {
    userId: 'user-123' as any,
    agentId: 'agent-123' as any,
    roomId: 'room-123' as any,
    bio: '',
    senderName: '',
    actors: '',
    actorsData: [],
    recentMessagesData: [],
    values: {},
    data: {},
    text: '',
  };

  const template = 'Bio: {{bio}}\nMissing: {{missingProp}}';

  const result = composePromptFromState({ state: mockState, template });

  expect(result).toContain('Bio: ');
  // Handlebars replaces missing values with empty string
  expect(result).toBe('Bio: \nMissing: ');
});

utilsSuite.addTest<TestContext>('addHeader should add header to body', async (context) => {
  const header = '# Title';
  const body = 'This is the body content.';

  const result = addHeader(header, body);

  // addHeader adds only single newline between header and body, and adds newline at end
  expect(result).toBe('# Title\nThis is the body content.\n');
});

utilsSuite.addTest<TestContext>('addHeader should handle empty header', async (context) => {
  const header = '';
  const body = 'Body content';

  const result = addHeader(header, body);

  // Empty header results in just body with newline at end
  expect(result).toBe('Body content\n');
});

utilsSuite.addTest<TestContext>('addHeader should handle empty body', async (context) => {
  const header = 'Header';
  const body = '';

  const result = addHeader(header, body);

  // Empty body returns empty string regardless of header
  expect(result).toBe('');
});

utilsSuite.addTest<TestContext>('addHeader should handle both empty', async (context) => {
  const result = addHeader('', '');

  // Both empty returns empty string
  expect(result).toBe('');
});

utilsSuite.addTest<TestContext>('addHeader should handle multiline header and body', async (context) => {
  const header = 'Line 1\nLine 2';
  const body = 'Body line 1\nBody line 2';

  const result = addHeader(header, body);

  // Single newline between header and body, newline at end
  expect(result).toBe('Line 1\nLine 2\nBody line 1\nBody line 2\n');
});

// Additional legacy tests for coverage
utilsSuite.addTest<TestContext>('legacy addHeader tests', async (context) => {
  expect(addHeader('Head', 'Body')).toBe('Head\nBody\n');
  expect(addHeader('Head', '')).toBe('');
});

utilsSuite.addTest<TestContext>('legacy parseKeyValueXml test', async (context) => {
  const xml = '<response><key>value</key><actions>a,b</actions><simple>true</simple></response>';
  const parsed = parseKeyValueXml(xml);
  expect(parsed).toEqual({ key: 'value', actions: ['a', 'b'], simple: true });
});

utilsSuite.addTest<TestContext>('legacy safeReplacer test', async (context) => {
  const obj: any = { a: 1 };
  obj.self = obj;
  const str = JSON.stringify(obj, safeReplacer());
  expect(str).toContain('[Circular]');
});

utilsSuite.addTest<TestContext>('legacy validateUuid test', async (context) => {
  const valid = validateUuid('123e4567-e89b-12d3-a456-426614174000');
  const invalid = validateUuid('not-a-uuid');
  expect(valid).toBe('123e4567-e89b-12d3-a456-426614174000');
  expect(invalid).toBeNull();
});

utilsSuite.addTest<TestContext>('legacy composePrompt test', async (context) => {
  const out = utils.composePrompt({ state: { a: 'x' }, template: 'Hello {{a}}' });
  expect(out).toBe('Hello x');
});

utilsSuite.addTest<TestContext>('legacy composePromptFromState test', async (context) => {
  const out = utils.composePromptFromState({
    state: { values: { b: 'y' }, data: {}, text: '', c: 'z' },
    template: '{{b}} {{c}}',
  });
  expect(out).toBe('y z');
});

utilsSuite.addTest<TestContext>('legacy formatPosts test', async (context) => {
  const messages = [
    {
      id: '1',
      entityId: 'e1',
      roomId: 'r1',
      createdAt: 1,
      content: { text: 'hi', source: 'chat' },
    },
    {
      id: '2',
      entityId: 'e1',
      roomId: 'r1',
      createdAt: 2,
      content: { text: 'there', source: 'chat' },
    },
  ] as any;
  const entities = [{ id: 'e1', names: ['Alice'] }] as any;
  const result = utils.formatPosts({ messages, entities });
  expect(result).toContain('Conversation:');
  expect(result).toContain('Alice');
  expect(result).toContain('hi');
  expect(result).toContain('there');
});

utilsSuite.addTest<TestContext>('legacy trimTokens test', async (context) => {
  const runtime = {
    useModel: mock(
      async (type: (typeof ModelType)[keyof typeof ModelType], { prompt, tokens }: any) => {
        if (type === ModelType.TEXT_TOKENIZER_ENCODE) {
          return prompt.split(' ');
        }
        if (type === ModelType.TEXT_TOKENIZER_DECODE) {
          return tokens.join(' ');
        }
        return [];
      }
    ),
  } as any;
  const result = await utils.trimTokens('a b c d e', 3, runtime);
  expect(result).toBe('c d e');
});
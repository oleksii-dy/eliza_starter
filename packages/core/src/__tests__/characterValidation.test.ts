import { expect } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import {
  validateCharacter,
  parseAndValidateCharacter,
  isValidCharacter,
} from '../schemas/character';
import type { Character } from '../types/agent';

const characterValidationSuite = createUnitTest('Character Schema Validation Tests');

// Test context for shared data
interface CharacterValidationTestContext {
  validCharacter: Character;
  minimalValidCharacter: Character;
}

characterValidationSuite.beforeEach<CharacterValidationTestContext>((context) => {
  context.validCharacter = {
    name: 'Test Character',
    bio: 'A test character for validation',
    messageExamples: [],
    postExamples: [],
    topics: ['AI', 'Testing'],
    knowledge: [],
    plugins: [],
    settings: {},
    style: {},
  };

  context.minimalValidCharacter = {
    name: 'Minimal Character',
    bio: 'Just the basics',
  };
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should validate a complete valid character', async (context) => {
  const result = validateCharacter(context.validCharacter);
  expect(result.success).toBe(true);
  expect(result.data).toEqual(context.validCharacter);
  expect(result.error).toBeUndefined();
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should validate a minimal valid character', async (context) => {
  const result = validateCharacter(context.minimalValidCharacter);
  expect(result.success).toBe(true);
  expect(result.data).toEqual(context.minimalValidCharacter);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should reject character without name', async (context) => {
  const invalidCharacter = { bio: 'No name character' };
  const result = validateCharacter(invalidCharacter);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Character validation failed');
  expect(result.error?.issues).toBeDefined();
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should reject character with empty name', async (context) => {
  const invalidCharacter = { name: '', bio: 'Empty name' };
  const result = validateCharacter(invalidCharacter);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Character validation failed');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should reject character without bio', async (context) => {
  const invalidCharacter = { name: 'No Bio Character' };
  const result = validateCharacter(invalidCharacter);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Character validation failed');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should accept bio as string array', async (context) => {
  const characterWithArrayBio = {
    name: 'Array Bio Character',
    bio: ['First line', 'Second line', 'Third line'],
  };
  const result = validateCharacter(characterWithArrayBio);
  expect(result.success).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should reject unknown properties in strict mode', async (context) => {
  const characterWithExtra = {
    ...context.validCharacter,
    unknownProperty: 'should be rejected',
    anotherUnknown: 123,
  };
  const result = validateCharacter(characterWithExtra);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Unrecognized key');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should validate optional fields correctly', async (context) => {
  const characterWithOptionals = {
    name: 'Optional Fields Character',
    bio: 'Testing optional fields',
    username: 'test_user',
    system: 'Test system prompt',
    messageExamples: [
      [
        {
          name: 'user',
          content: { text: 'Hello' },
        },
        {
          name: 'assistant',
          content: { text: 'Hi there!' },
        },
      ],
    ],
    postExamples: ['Example post 1', 'Example post 2'],
    topics: ['AI', 'Testing', 'Validation'],
    knowledge: [
      'knowledge/file1.txt',
      { path: 'knowledge/file2.txt', shared: true },
      { directory: 'knowledge/shared', shared: true },
    ],
    plugins: ['plugin1', 'plugin2'],
    settings: {
      temperature: 0.7,
      maxTokens: 1000,
      debug: true,
    },
    secrets: {
      apiKey: 'secret-key',
      enabled: true,
    },
    style: {
      all: ['casual', 'friendly'],
      chat: ['responsive', 'helpful'],
      post: ['engaging', 'informative'],
    },
  };
  const result = validateCharacter(characterWithOptionals);
  expect(result.success).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should validate UUID format for id field', async (context) => {
  const characterWithValidUuid = {
    ...context.validCharacter,
    id: '123e4567-e89b-12d3-a456-426614174000',
  };
  const result = validateCharacter(characterWithValidUuid);
  expect(result.success).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('validateCharacter should reject invalid UUID format for id field', async (context) => {
  const characterWithInvalidUuid = {
    ...context.validCharacter,
    id: 'invalid-uuid-format',
  };
  const result = validateCharacter(characterWithInvalidUuid);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Invalid UUID format');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('parseAndValidateCharacter should parse and validate valid JSON character', async (context) => {
  const jsonString = JSON.stringify(context.validCharacter);
  const result = parseAndValidateCharacter(jsonString);
  expect(result.success).toBe(true);
  expect(result.data).toEqual(context.validCharacter);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('parseAndValidateCharacter should handle malformed JSON', async (context) => {
  const malformedJson = '{ "name": "Test", "bio": "Test" '; // Missing closing brace
  const result = parseAndValidateCharacter(malformedJson);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Invalid JSON');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('parseAndValidateCharacter should handle JSON with invalid character data', async (context) => {
  const invalidCharacterJson = JSON.stringify({ name: '', bio: 'Invalid' });
  const result = parseAndValidateCharacter(invalidCharacterJson);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Character validation failed');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('parseAndValidateCharacter should handle empty JSON object', async (context) => {
  const emptyJson = '{}';
  const result = parseAndValidateCharacter(emptyJson);
  expect(result.success).toBe(false);
  expect(result.error?.message).toContain('Character validation failed');
});

characterValidationSuite.addTest<CharacterValidationTestContext>('isValidCharacter should return true for valid character', async (context) => {
  expect(isValidCharacter(context.validCharacter)).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('isValidCharacter should return false for invalid character', async (context) => {
  const invalidCharacter = { name: '', bio: 'Invalid' };
  expect(isValidCharacter(invalidCharacter)).toBe(false);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('isValidCharacter should return false for non-object input', async (context) => {
  expect(isValidCharacter('string')).toBe(false);
  expect(isValidCharacter(null)).toBe(false);
  expect(isValidCharacter(undefined)).toBe(false);
  expect(isValidCharacter(123)).toBe(false);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('Complex validation should validate character with complex knowledge array', async (context) => {
  const characterWithComplexKnowledge = {
    name: 'Knowledge Character',
    bio: 'Testing knowledge validation',
    knowledge: [
      'simple/path.txt',
      { path: 'path/with/config.txt', shared: false },
      { path: 'shared/path.txt', shared: true },
      { directory: 'knowledge/dir' },
      { directory: 'shared/dir', shared: true },
    ],
  };
  const result = validateCharacter(characterWithComplexKnowledge);
  expect(result.success).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('Complex validation should validate character with complex message examples', async (context) => {
  const characterWithComplexMessages = {
    name: 'Message Character',
    bio: 'Testing message validation',
    messageExamples: [
      [
        {
          name: 'user',
          content: {
            text: 'Hello, how are you?',
            source: 'user',
          },
        },
        {
          name: 'assistant',
          content: {
            text: 'I am doing well, thank you!',
            source: 'assistant',
            attachments: [{ type: 'text', data: 'additional info' }],
          },
        },
      ],
      [
        {
          name: 'user',
          content: { text: 'What is the weather like?' },
        },
        {
          name: 'assistant',
          content: {
            text: 'I would need to check a weather service for current conditions.',
            url: 'https://weather.example.com',
          },
        },
      ],
    ],
  };
  const result = validateCharacter(characterWithComplexMessages);
  expect(result.success).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('Complex validation should validate character with flexible settings', async (context) => {
  const characterWithFlexibleSettings = {
    name: 'Settings Character',
    bio: 'Testing settings validation',
    settings: {
      temperature: 0.8,
      maxTokens: 2000,
      enableDebug: true,
      model: 'gpt-4',
      customConfig: {
        nested: {
          deeply: {
            value: 'test',
          },
        },
      },
      arrayValue: [1, 2, 3],
    },
    secrets: {
      apiKey: 'sk-test123',
      secretNumber: 42,
      isEnabled: true,
    },
  };
  const result = validateCharacter(characterWithFlexibleSettings);
  expect(result.success).toBe(true);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('Edge cases should handle null and undefined inputs', async (context) => {
  expect(validateCharacter(null).success).toBe(false);
  expect(validateCharacter(undefined).success).toBe(false);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('Edge cases should handle non-object inputs', async (context) => {
  expect(validateCharacter('string').success).toBe(false);
  expect(validateCharacter(123).success).toBe(false);
  expect(validateCharacter([]).success).toBe(false);
});

characterValidationSuite.addTest<CharacterValidationTestContext>('Edge cases should provide detailed error information', async (context) => {
  const invalidCharacter = {
    name: '', // Invalid: empty string
    bio: 123, // Invalid: should be string or string[]
    messageExamples: 'invalid', // Invalid: should be array
  };
  const result = validateCharacter(invalidCharacter);
  expect(result.success).toBe(false);
  expect(result.error?.issues).toBeDefined();
  expect(result.error?.issues?.length).toBeGreaterThan(0);
});
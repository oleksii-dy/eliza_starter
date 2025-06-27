import { expect } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import type { UUID } from '../types';
import { stringToUuid } from '../utils';

const uuidSuite = createUnitTest('String to UUID Tests');

uuidSuite.addTest('should generate a valid UUID v5 format', async () => {
  const result = stringToUuid('test-string') as UUID;
  expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // Check version bits (version 5)
  const versionChar = result.split('-')[2][0];
  expect(versionChar).toBe('0');

  // Check variant bits (RFC4122)
  const variantByte = Number.parseInt(result.split('-')[3].slice(0, 2), 16);
  expect(variantByte >= 0x80 && variantByte <= 0xbf).toBe(true);
});

uuidSuite.addTest('should generate consistent UUIDs for identical inputs', async () => {
  const input = 'consistent-test';
  const uuid1 = stringToUuid(input) as UUID;
  const uuid2 = stringToUuid(input) as UUID;
  expect(uuid1).toBe(uuid2);
});

uuidSuite.addTest('should generate unique UUIDs for different inputs', async () => {
  const uuid1 = stringToUuid('input1') as UUID;
  const uuid2 = stringToUuid('input2') as UUID;
  expect(uuid1).not.toBe(uuid2);
});

uuidSuite.addTest('should handle various input types correctly', async () => {
  // Numbers should be converted to strings
  const numberUuid = stringToUuid(123) as UUID;
  const stringUuid = stringToUuid('123') as UUID;
  expect(numberUuid).toBe(stringUuid);

  // Empty string should produce valid UUID
  const emptyUuid = stringToUuid('') as UUID;
  expect(emptyUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // Unicode and special characters
  const unicodeUuid = stringToUuid('Hello 世界! 🌍') as UUID;
  expect(unicodeUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

uuidSuite.addTest('should throw TypeError for invalid input types', async () => {
  expect(() => stringToUuid(undefined as any)).toThrow(TypeError);
  expect(() => stringToUuid(null as any)).toThrow(TypeError);
  expect(() => stringToUuid({} as any)).toThrow(TypeError);
  expect(() => stringToUuid([] as any)).toThrow(TypeError);
});

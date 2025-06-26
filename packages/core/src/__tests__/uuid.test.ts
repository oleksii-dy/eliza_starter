import { beforeEach, describe, expect, it } from 'bun:test';
import type { UUID } from '../types';
import { stringToUuid } from '../utils';

describe('stringToUuid', () => {
  it('should generate a valid UUID v5 format', () => {
    const result = stringToUuid('test-string') as UUID;
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Check version bits (version 5)
    const versionChar = result.split('-')[2][0];
    expect(versionChar).toBe('0');

    // Check variant bits (RFC4122)
    const variantByte = Number.parseInt(result.split('-')[3].slice(0, 2), 16);
    expect(variantByte >= 0x80 && variantByte <= 0xbf).toBe(true);
  });

  it('should generate consistent UUIDs for identical inputs', () => {
    const input = 'consistent-test';
    const uuid1 = stringToUuid(input) as UUID;
    const uuid2 = stringToUuid(input) as UUID;
    expect(uuid1).toBe(uuid2);
  });

  it('should generate unique UUIDs for different inputs', () => {
    const uuid1 = stringToUuid('input1') as UUID;
    const uuid2 = stringToUuid('input2') as UUID;
    expect(uuid1).not.toBe(uuid2);
  });

  it('should handle various input types correctly', () => {
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

  it('should throw TypeError for invalid input types', () => {
    expect(() => stringToUuid(undefined as any)).toThrow(TypeError);
    expect(() => stringToUuid(null as any)).toThrow(TypeError);
    expect(() => stringToUuid({} as any)).toThrow(TypeError);
    expect(() => stringToUuid([] as any)).toThrow(TypeError);
  });
});

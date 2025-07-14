import { describe, expect, it } from 'bun:test';
import { asUUID } from '../uuid';
import type { UUID } from '../uuid';

describe('asUUID', () => {
  describe('valid UUIDs', () => {
    it('should validate standard UUID v4 format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = asUUID(validUuid);
      expect(result).toBe(validUuid);
    });

    it('should validate UUID with uppercase letters', () => {
      const validUuid = '550E8400-E29B-41D4-A716-446655440000';
      const result = asUUID(validUuid);
      expect(result).toBe(validUuid);
    });

    it('should validate UUID with mixed case', () => {
      const validUuid = '550e8400-E29B-41d4-A716-446655440000';
      const result = asUUID(validUuid);
      expect(result).toBe(validUuid);
    });

    it('should validate UUID with all zeros', () => {
      const validUuid = '00000000-0000-0000-0000-000000000000';
      const result = asUUID(validUuid);
      expect(result).toBe(validUuid);
    });

    it("should validate UUID with all F's", () => {
      const validUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const result = asUUID(validUuid);
      expect(result).toBe(validUuid);
    });
  });

  describe('invalid UUIDs', () => {
    it('should throw error for null input', () => {
      expect(() => asUUID(null as any)).toThrow('Invalid UUID format: null');
    });

    it('should throw error for undefined input', () => {
      expect(() => asUUID(undefined as any)).toThrow('Invalid UUID format: undefined');
    });

    it('should throw error for empty string', () => {
      expect(() => asUUID('')).toThrow('Invalid UUID format: ');
    });

    it('should throw error for UUID without hyphens', () => {
      const invalidUuid = '550e8400e29b41d4a716446655440000';
      expect(() => asUUID(invalidUuid)).toThrow(`Invalid UUID format: ${invalidUuid}`);
    });

    it('should throw error for UUID with incorrect segment lengths', () => {
      const invalidUuid = '550e840-e29b-41d4-a716-446655440000';
      expect(() => asUUID(invalidUuid)).toThrow(`Invalid UUID format: ${invalidUuid}`);
    });

    it('should throw error for UUID with invalid characters', () => {
      const invalidUuid = '550e8400-e29b-41d4-a716-44665544000g';
      expect(() => asUUID(invalidUuid)).toThrow(`Invalid UUID format: ${invalidUuid}`);
    });

    it('should throw error for UUID with spaces', () => {
      const invalidUuid = '550e8400-e29b-41d4-a716-44665544 000';
      expect(() => asUUID(invalidUuid)).toThrow(`Invalid UUID format: ${invalidUuid}`);
    });

    it('should throw error for partial UUID', () => {
      const invalidUuid = '550e8400-e29b-41d4';
      expect(() => asUUID(invalidUuid)).toThrow(`Invalid UUID format: ${invalidUuid}`);
    });

    it('should throw error for UUID with extra characters', () => {
      const invalidUuid = '550e8400-e29b-41d4-a716-446655440000-extra';
      expect(() => asUUID(invalidUuid)).toThrow(`Invalid UUID format: ${invalidUuid}`);
    });

    it('should throw error for non-string input', () => {
      expect(() => asUUID(123 as any)).toThrow('Invalid UUID format: 123');
      expect(() => asUUID({} as any)).toThrow('Invalid UUID format: [object Object]');
      expect(() => asUUID([] as any)).toThrow('Invalid UUID format: ');
    });
  });

  describe('type assertion', () => {
    it('should return value typed as UUID', () => {
      const input = '550e8400-e29b-41d4-a716-446655440000';
      const result = asUUID(input);
      // TypeScript should treat result as UUID type
      const typedUuid: UUID = result;
      expect(typedUuid).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('should handle UUID with version 1 format', () => {
      const v1Uuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = asUUID(v1Uuid);
      expect(result).toBe(v1Uuid);
    });

    it('should handle UUID with version 3 format', () => {
      const v3Uuid = '6ba7b814-9dad-11d1-80b4-00c04fd430c8';
      const result = asUUID(v3Uuid);
      expect(result).toBe(v3Uuid);
    });

    it('should handle UUID with version 5 format', () => {
      const v5Uuid = '6ba7b814-9dad-51d1-80b4-00c04fd430c8';
      const result = asUUID(v5Uuid);
      expect(result).toBe(v5Uuid);
    });
  });
});

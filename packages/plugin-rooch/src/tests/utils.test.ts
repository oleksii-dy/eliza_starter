import { describe, it, expect, vi } from 'vitest';
import { IAgentRuntime } from "@elizaos/core";
import { parseAccessPath, parseKeypair } from '../utils';

describe('parseAccessPath', () => {
    it('should parse a valid rooch URI correctly', () => {
        const uri = 'rooch://object/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        const expected = '/object/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        expect(parseAccessPath(uri)).toBe(expected);
    });

    it('should throw an error for invalid URI with missing scheme', () => {
        const uri = 'object/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });

    it('should throw an error for invalid URI with incorrect structure', () => {
        const uri = 'rooch://invalid/0xd858ebbc8e0e5c2128800b9a715e3bd8ceae2fb8a75df5cc40b58b86f1dc77ee';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });

    it('should throw an error for URI with missing object path', () => {
        const uri = 'rooch://object/';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });

    it('should throw an error for URI with invalid hex string', () => {
        const uri = 'rooch://object/invalid_hex_string';
        expect(() => parseAccessPath(uri)).toThrowError('Invalid URI format');
    });
});


describe('parseKeypair', () => {
    it("should parse a valid Rooch secret key correctly", () => {
        // Mock IAgentRuntime, only implementing the getSetting method
        const mockRuntime: Partial<IAgentRuntime> = {
            getSetting: vi.fn((key: string) => {
                if (key === "BITCOIN_WIF_PRIVATE_KEY") {
                    return "roochsecretkey_valid_rooch_secret_key";
                }
                return null;
            }),
        };

        // Call parseKeypair
        const result = parseKeypair(mockRuntime as IAgentRuntime);

        // Assert the result
        expect(result).toBeDefined();
        // Add more detailed assertions based on the return value of decodeRoochSercetKey
    });
});
import { describe, it, expect, beforeAll } from "vitest";
import { GoldRushProvider } from "../index";
import type { IAgentRuntime } from "@elizaos/core";

// Using a test address with minimal transactions
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

// Mock runtime
const mockRuntime: IAgentRuntime = {
    logger: console,
    config: {
        COVALENT_API_KEY: process.env.COVALENT_API_KEY || "",
    },
};

describe("GoldRush Plugin Tests", () => {
    let provider: GoldRushProvider;

    beforeAll(async () => {
        const apiKey = process.env.COVALENT_API_KEY;
        if (!apiKey) {
            throw new Error(
                "COVALENT_API_KEY environment variable is required"
            );
        }
        provider = new GoldRushProvider(apiKey);
        try {
            await provider.init();
        } catch (error) {
            console.error("Failed to initialize provider:", error);
            throw error;
        }
    }, 30000);

    describe("Initialization", () => {
        it("should throw error when initialized without API key", () => {
            expect(() => new GoldRushProvider("")).toThrow(
                "Covalent API key is required"
            );
        });

        it("should throw error with invalid API key", async () => {
            const invalidProvider = new GoldRushProvider("invalid_key");
            try {
                await invalidProvider.init();
                fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeDefined();
                expect(error instanceof Error).toBe(true);
            }
        });
    });

    describe("Wallet Data Fetching", () => {
        it("should fetch wallet data from eth-mainnet", async () => {
            try {
                const result = await provider.get(mockRuntime, {
                    address: TEST_ADDRESS,
                    chain: "eth-mainnet",
                } as any);

                expect(result).toBeDefined();
                expect(result.address).toBe(TEST_ADDRESS);
                expect(result.balance).toBeDefined();
                expect(Array.isArray(result.transactions)).toBe(true);
                expect(result.lastUpdated).toBeDefined();
            } catch (error) {
                console.error("Failed to fetch wallet data:", error);
                throw error;
            }
        }, 30000);

        it("should handle missing address", async () => {
            await expect(provider.get(mockRuntime, {} as any)).rejects.toThrow(
                "Wallet address is required"
            );
        });

        it("should handle invalid addresses", async () => {
            await expect(
                provider.get(mockRuntime, {
                    address: "0xinvalid",
                    chain: "eth-mainnet",
                } as any)
            ).rejects.toThrow("Invalid Ethereum address");
        });

        it("should handle unsupported chains", async () => {
            await expect(
                provider.get(mockRuntime, {
                    address: TEST_ADDRESS,
                    chain: "invalid-chain",
                } as any)
            ).rejects.toThrow("Unsupported chain: invalid-chain");
        });

        it("should handle network errors gracefully", async () => {
            // Mock a network error by using an invalid API key temporarily
            const originalApiKey = provider["client"].apiKey;
            provider["client"].apiKey = "invalid_key";

            try {
                await provider.get(mockRuntime, {
                    address: TEST_ADDRESS,
                    chain: "eth-mainnet",
                } as any);
                fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeDefined();
            } finally {
                // Restore the valid API key
                provider["client"].apiKey = originalApiKey;
            }
        });
    });
});

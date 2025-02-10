import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { WalletProvider } from "../providers/wallet.ts";

import { defaultCharacter } from "@elizaos/core";

// Mock NodeCache
vi.mock("node-cache", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        })),
    };
});

// Mock path module
vi.mock("path", async () => {
    const actual = await vi.importActual("path");
    return {
        ...actual,
        join: vi.fn().mockImplementation((...args) => args.join("/")),
    };
});

// Mock the ICacheManager
const mockCacheManager = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    delete: vi.fn(),
};

describe("WalletProvider", () => {
    let walletProvider: WalletProvider;
    let mockedRuntime;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCacheManager.get.mockResolvedValue(null);

        // Create new instance of TokenProvider with mocked dependencies
        walletProvider = new WalletProvider(
            "labor shop parade fence caution okay slice dismiss among drama barrel bitter", // replace your mnemonic here
            "devnet",
            mockCacheManager,
        );

        mockedRuntime = {
            character: defaultCharacter,
        };
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Wallet Integration", () => {
        it("should check wallet address", async () => {
            const result = await walletProvider.getFormattedPortfolio(mockedRuntime);
            console.log(result);
            expect(result).toBeDefined();
        });

        it("should check wallet balance", async () => {
            const result = await walletProvider.getFormattedBalance(mockedRuntime);
            console.log(result);
            expect(result).toBeDefined();
        })
    });
});

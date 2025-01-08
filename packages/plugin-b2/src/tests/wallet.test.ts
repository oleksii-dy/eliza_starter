import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initWalletProvider, B2WalletProvider } from "../providers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Memory, State } from "@elizaos/core";

describe("B2 Network Wallet Provider", () => {
    let walletProvider: B2WalletProvider;
    let mockRuntime;

    beforeEach(() => {
        vi.clearAllMocks();
        const pk = generatePrivateKey();
        walletProvider = new B2WalletProvider(pk);
        mockRuntime = {
            getSetting: vi.fn(),
        };
        mockRuntime.getSetting.mockImplementation((key: string) => {
            const settings = {
                B2_PRIVATE_KEY: pk,
            };
            return settings[key];
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Constructor", () => {
        it("new wallet provider", () => {
            const pk = generatePrivateKey();
            const ta = new B2WalletProvider(pk);
            expect(ta).toBeDefined();
            console.log(`wallet.address {}`, ta.getAddress());
        });
        it("init wallet provider",async () => {
            const ta = await initWalletProvider(mockRuntime);
            expect(ta).toBeDefined();
            console.log(`wallet.address {}`, ta.getAddress());
        });
    });
});

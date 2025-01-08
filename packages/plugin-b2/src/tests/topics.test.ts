import { describe, it, expect, beforeEach, vi } from "vitest";
// import { TopicsProvider } from "../../src/providers/topics";
import { B2WalletProvider } from "../providers";
import { Memory, State } from "@elizaos/core";

describe("TopicsProvider", () => {
    let walletProvider: B2WalletProvider;
    let mockRuntime;

    beforeEach(() => {
        walletProvider = new B2WalletProvider();
        mockRuntime = {
            getSetting: vi.fn(),
        };

        mockRuntime.getSetting.mockImplementation((key: string) => {
            const settings = {
                B2_PRIVATE_KEY: "test-private-key",
            };
            return settings[key];
        });
    });

    describe("Topics data integration", () => {
        it("should format topics into expected string format", async () => {

        });
    });
});

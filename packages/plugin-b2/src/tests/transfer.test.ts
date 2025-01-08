import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initWalletProvider, B2WalletProvider } from "../providers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Memory, State } from "@elizaos/core";
import { TransferAction } from "../actions/transfer";

describe("Transfer Action", () => {
    let mockRuntime;
    beforeEach(() => {
        vi.clearAllMocks();
        const pk = generatePrivateKey();
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
        it("should initialize with wallet provider",async () => {
            const wp = await initWalletProvider(mockRuntime);
            expect(wp).toBeDefined();
        });
    });
    describe("Transfer", () => {
        let ta: TransferAction;
        beforeEach(() => {
            ta = new TransferAction(mockRuntime);
            expect(ta).toBeDefined();
            // if (wp1) {
            //     ta1 = new TransferAction(wp1);
            //     receiverAddress = wp1.getAddress();
            // }
            // else {
            //     receiverAddress = wp.getAddress();
            // }
        });

    });
});

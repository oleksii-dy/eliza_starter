import { describe, it, expect } from "vitest";
import swapAction from "../actions/swap";
import { type SwapContent } from "../actions/swap";

describe("Movement Swap Action", () => {
    describe("Swap Content Validation", () => {
        it("should validate valid swap content", () => {
            const validContent: Partial<SwapContent> = {
                inputToken: "0x1::aptos_coin::AptosCoin",
                outputToken: "0xbd9162ee6441fcf49652f0a50706279187e744aa4622a7c30bfeeaa18b7e4147::porto::YUZU",
                inputAmount: "1",
                text: "swap 1 move to yuzu"
            };

            const isSwapContent = (swapAction as any).isSwapContent;
            expect(isSwapContent(validContent)).toBe(true);
        });

        it("should reject invalid swap content", () => {
            const invalidContent = {
                inputToken: 123, // Wrong type
                outputToken: "0x1::coin::YUZU",
                inputAmount: {}, // Wrong type
                text: "invalid swap"
            };

            const isSwapContent = (swapAction as any).isSwapContent;
            expect(isSwapContent(invalidContent)).toBe(false);
        });

        it("should accept both string and number amounts", () => {
            const contentWithStringAmounts: Partial<SwapContent> = {
                inputToken: "0x1::aptos_coin::AptosCoin",
                outputToken: "0x1::coin::YUZU",
                inputAmount: "1.5",
                text: "swap 1.5 move to yuzu"
            };

            const contentWithNumberAmounts: Partial<SwapContent> = {
                inputToken: "0x1::aptos_coin::AptosCoin",
                outputToken: "0x1::coin::YUZU",
                inputAmount: 1.5,
                text: "swap 1.5 move to yuzu"
            };

            const isSwapContent = (swapAction as any).isSwapContent;
            expect(isSwapContent(contentWithStringAmounts)).toBe(true);
            expect(isSwapContent(contentWithNumberAmounts)).toBe(true);
        });
    });

    describe("Action Examples", () => {
        it("should have valid examples", () => {
            expect(Array.isArray(swapAction.examples)).toBe(true);
            expect(swapAction.examples.length).toBeGreaterThan(0);
            
            swapAction.examples.forEach(example => {
                expect(Array.isArray(example)).toBe(true);
                expect(example.length).toBe(2);
                expect(example[0].content.text).toBeDefined();
                expect(example[1].content.action).toBe("SWAP_MOVE");
            });
        });
    });
}); 
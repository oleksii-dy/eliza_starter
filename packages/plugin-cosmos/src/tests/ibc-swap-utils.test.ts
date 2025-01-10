import { describe, it, expect, vi } from "vitest";

import {
    calculateAmountInDenomFromDisplayUnit,
    prepareAmbiguityErrorMessage,
} from "../actions/ibc-swap/services/ibc-swap-utils.ts";

vi.mock("chain-registry", () => ({
    assets: [
        {
            chain_name: "test-chain",
            assets: [
                {
                    symbol: "ATOM",
                    description: "Cosmos Hub token",
                    base: "atom-base",
                },
                {
                    symbol: "ATOM",
                    description: "Wrapped Cosmos token",
                    base: "wrapped-atom-base",
                },
            ],
        },
    ],
}));

describe("Utility Functions Tests", () => {
    describe("prepareAmbiguityErrorMessage", () => {
        it("should return an error message for ambiguous assets", () => {
            const result = prepareAmbiguityErrorMessage("ATOM", "test-chain");

            expect(result).toContain("Error occured. Swap was not performed.");
            expect(result).toContain("ATOM");
            expect(result).toContain("test-chain");
            expect(result).toContain(
                "Symbol: ATOM Desc: Cosmos Hub token Denom: atom-base"
            );
            expect(result).toContain(
                "Symbol: ATOM Desc: Wrapped Cosmos token Denom: wrapped-atom-base"
            );
        });
    });

    describe("calculateAmountInDenomFromDisplayUnit", () => {
        it("should calculate the correct amount in denom", () => {
            const result = calculateAmountInDenomFromDisplayUnit("1", 6);
            expect(result).toBe("1000000");
        });

        it("should handle decimal values correctly", () => {
            const result = calculateAmountInDenomFromDisplayUnit("1.234", 6);
            expect(result).toBe("1234000");
        });

        it("should handle large exponent values correctly", () => {
            const result = calculateAmountInDenomFromDisplayUnit("1", 18);
            expect(result).toBe("1000000000000000000");
        });

        it("should return 0 for a token amount of 0", () => {
            const result = calculateAmountInDenomFromDisplayUnit("0", 6);
            expect(result).toBe("0");
        });
    });
});

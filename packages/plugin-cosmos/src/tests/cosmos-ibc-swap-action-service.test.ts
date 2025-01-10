import {describe, it, expect, vi, beforeEach, Mock} from "vitest";
import {IBCSwapAction} from "../actions/ibc-swap/services/ibc-swap-action-service.ts";
import {HandlerCallback} from "@elizaos/core";
import {getAssetBySymbol} from "@chain-registry/utils";

vi.mock("@cosmjs/cosmwasm-stargate", () => ({
    SigningCosmWasmClient: {
        connectWithSigner: vi.fn(),
    },
}));

vi.mock("@chain-registry/utils", () => ({
    getAssetBySymbol: vi.fn(),
    getChainByChainName: vi.fn((_, chainName: string) => {
        if (chainName === "source-chain") return { chain_id: "source-chain-id" };
        return { chain_id: "target-chain-id" };
    }),
    getChainNameByChainId: vi.fn((_, chainId: string) => {
        if (chainId === "source-chain-id") return "source-chain";
        return "target-chain";
    }),
    convertDisplayUnitToBaseUnit: vi.fn(() => "1"),
    getChainByChainId: vi.fn(() => ({ chainId: "target-chain-id" })),
}));


describe("IBCSwapAction", () => {
    const mockWalletChains = {
        getWalletAddress: vi.fn(),
        getSkipClient: vi.fn(),
        walletChainsData: {},
        getSigningCosmWasmClient: vi.fn(),
    };

    const mockSwapDenomProvider = vi.fn();

    const mockSkipClient = {
        route: vi.fn(),
        executeRoute: vi.fn(),
    };

    const params = {
        fromChainName: "source-chain",
        fromTokenSymbol: "fromTokenSymbol",
        fromTokenAmount: "1000",
        toChainName: "target-chain",
        toTokenSymbol: "toTokenSymbol",
    };

    const _callback: Mock<HandlerCallback> = vi.fn();

    const customChainAssets = [];

    beforeEach(() => {
        vi.clearAllMocks();
        mockWalletChains.getSkipClient.mockReturnValue(mockSkipClient);
    });

    it("should complete", async () => {
        mockWalletChains.getWalletAddress('source-chain').mockReturnValue('source-chain-address');
        mockWalletChains.getWalletAddress('target-chain').mockReturnValue('target-chain-address');
        const ibcSwapAction = new IBCSwapAction(mockWalletChains);

        (getAssetBySymbol as Mock).mockImplementationOnce((symbol: string) => {
            if (symbol === "fromTokenSymbol") {
                return { asset: { base: "fromTokenDenom"} };
            }
            if (symbol === "toTokenSymbol") {
                return { asset: { base: "toTokenDenom"} };
            }
        });

        (mockSkipClient.route as Mock).mockReturnValue({
            estimatedAmountOut: "123",
            estimatedFees: "1",
            estimatedRouteDurationSeconds: "1",
        })

        expect(mockSkipClient.route).toBeCalledWith(
            {
                smartSwapOptions: {},
                amountIn: params.fromTokenAmount,
                sourceAssetDenom: "fromTokenDenom",
                sourceAssetChainID: "source-chain-id",
                destAssetDenom: "toTokenDenom",
                destAssetChainID: "target-chain-id",
            }
        );

        expect(_callback).toBeCalledWith(
            {
                text: `Expected swap result: 123 ${params.toTokenSymbol}, \nEstimated Fee: 1. \nEstimated time: 1`,
            }
        )

         await expect(
             await ibcSwapAction.execute(
                params,
                customChainAssets,
                _callback
            )
        ).resolves.toEqual({
             fromChainName: params.fromChainName,
             fromTokenAmount: params.fromTokenAmount,
             fromTokenSymbol: params.fromTokenSymbol,
             gasPaid: 0,
             toChainName: params.toChainName,
             toTokenAmount: "ile??", //todo: get exchange result
             toTokenSymbol: params.toTokenSymbol,
             txHash: undefined,
         });
    });
});

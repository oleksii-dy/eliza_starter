import { describe, it, expect, vi, beforeEach } from "vitest";
import { CosmosIBCTransferAction } from "../actions/ibc-transfer/services/ibc-transfer-action-service";
import { IBCTransferActionParams } from "../actions/ibc-transfer/types";
import { getAssetBySymbol, getChainByChainName } from "@chain-registry/utils";

vi.mock("@cosmjs/cosmwasm-stargate", () => ({
    SigningCosmWasmClient: {
        connectWithSigner: vi.fn(),
    },
}));

vi.mock("@chain-registry/utils", () => ({
    getAssetBySymbol: vi.fn().mockReturnValue({ base: "uatom" }),
    getChainByChainName: vi
        .fn()
        .mockResolvedValue({ chain_id: "cosmos-chain-id" }),
    convertDisplayUnitToBaseUnit: vi.fn().mockResolvedValue("100000000"),
}));

vi.mock("../shared/services/cosmos-transaction-fee-estimator", () => ({
    CosmosTransactionFeeEstimator: {
        estimateGasForIBCTransfer: vi.fn().mockResolvedValue(BigInt(200_000)),
    },
}));

vi.mock("../shared/helpers/cosmos-assets", () => ({
    getAvailableAssets: vi.fn().mockResolvedValue([]),
}));

vi.mock("../shared/helpers/cosmos-transaction-receipt.ts", () => ({
    getPaidFeeFromReceipt: vi.fn().mockReturnValue("200000"),
}));

describe("CosmosIBCTransferAction", () => {
    const mockSigningCosmWasmClient = {
        sendTokens: vi.fn().mockResolvedValue({
            transactionHash: "mockTxHash",
        }),
    };

    const mockCosmosWalletChains = {
        walletChainsData: {},
        getWalletAddress: vi.fn().mockResolvedValue("senderAddress"),
        getSigningCosmWasmClient: vi
            .fn()
            .mockReturnValue(mockSigningCosmWasmClient),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should execute transfer successfully", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        const expectedResult = {
            from: "senderAddress",
            to: "cosmosReceiverAddress",
            gasPaid: "200000",
            txHash: "mockTxHash",
        };

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).resolves.toEqual(expectedResult);
    });

    it("should throw error if transaction fails", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };

        mockSigningCosmWasmClient.sendTokens.mockRejectedValue(
            new Error("Transaction Failed")
        );

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("Transaction Failed");
    });

    it("should throw error if no wallet address is found", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };

        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(null); // Brak adresu portfela

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("Cannot get wallet address for chain cosmos");
    });

    it("should throw error if no receiver address is provided", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });
        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(
            "cosmos1address"
        );

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("No receiver address");
    });

    it("should throw error if no symbol is provided", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "",
            amount: "100",
        };

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(
            "cosmos1address"
        );

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("No symbol");
    });

    it("should throw error if no chainName is provided", async () => {
        const params: IBCTransferActionParams = {
            chainName: "",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(
            "cosmos1address"
        );

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("No chain name");
    });
    it("should throw error if no targetChainName is provided", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "",
            symbol: "atom",
            amount: "100",
        };

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(
            "cosmos1address"
        );

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("No target chain name");
    });
    it("should throw error if no base denom in assets list", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };

        // @ts-expect-error ---
        getAssetBySymbol.mockReturnValue({});

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(
            "cosmos1address"
        );

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("Cannot find asset");
    });

    it("should throw error if no chain in chain list", async () => {
        const params: IBCTransferActionParams = {
            chainName: "cosmos",
            toAddress: "cosmosReceiverAddress",
            targetChainName: "cosmosTarget",
            symbol: "atom",
            amount: "100",
        };
        // @ts-expect-error --- ...
        getAssetBySymbol.mockReturnValue({ base: "uatom" });
        // @ts-expect-error --- ...
        getChainByChainName.mockReturnValue(undefined);

        const mockBridgeDataProvider = vi.fn().mockResolvedValue({
            ibcDenom: "uatom",
            channelId: "channel-1",
            portId: "transfer",
        });

        mockCosmosWalletChains.getWalletAddress.mockResolvedValue(
            "cosmos1address"
        );

        const cosmosIBCTransferAction = new CosmosIBCTransferAction(
            mockCosmosWalletChains
        );

        await expect(
            cosmosIBCTransferAction.execute(params, mockBridgeDataProvider)
        ).rejects.toThrow("Cannot find chain");
    });
});

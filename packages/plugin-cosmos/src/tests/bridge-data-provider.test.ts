import { bridgeDataProvider } from "../actions/ibc-transfer/services/bridge-data-provider";
import { BridgeDataFetcher } from "../actions/ibc-transfer/services/bridge-data-fetcher";
import { vi, expect, it, beforeEach, describe } from "vitest";

vi.mock("./bridge-data-fetcher", () => ({
    BridgeDataFetcher: {
        getInstance: vi.fn().mockReturnValue({
            fetchBridgeData: vi.fn(),
        }),
    },
}));

describe("bridgeDataProvider", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockFetchBridgeData: any;

    beforeEach(() => {
        mockFetchBridgeData = vi.fn();
        BridgeDataFetcher.getInstance().fetchBridgeData = mockFetchBridgeData;
    });

    it("should return correct channelId and ibcDenom when valid data is returned", async () => {
        const mockResponse = {
            dest_assets: {
                cosmos: {
                    assets: [
                        {
                            origin_denom: "atom",
                            denom: "uatom",
                            trace: "channel-123/abc",
                        },
                    ],
                },
            },
        };

        mockFetchBridgeData.mockResolvedValue(mockResponse);

        const sourceAssetDenom = "atom";
        const sourceAssetChainId = "cosmos";

        const result = await bridgeDataProvider(
            sourceAssetDenom,
            sourceAssetChainId
        );

        expect(result).toEqual({
            channelId: "channel-123",
            ibcDenom: "uatom",
            portId: "transfer",
        });
    });

    it("should throw an error when ibcAssetData is not found", async () => {
        const mockResponse = {
            dest_assets: {
                cosmos: {
                    assets: [
                        {
                            origin_denom: "btc",
                            denom: "ubtc",
                            trace: "channel-123/abc",
                        },
                    ],
                },
            },
        };

        mockFetchBridgeData.mockResolvedValue(mockResponse);

        const sourceAssetDenom = "atom";
        const sourceAssetChainId = "cosmos";

        await expect(
            bridgeDataProvider(sourceAssetDenom, sourceAssetChainId)
        ).rejects.toThrowError();
    });

    it("should throw an error when channelId is missing", async () => {
        const mockResponse = {
            dest_assets: {
                cosmos: {
                    assets: [
                        {
                            origin_denom: "atom",
                            denom: "uatom",
                            trace: "",
                        },
                    ],
                },
            },
        };

        mockFetchBridgeData.mockResolvedValue(mockResponse);

        const sourceAssetDenom = "atom";
        const sourceAssetChainId = "cosmos";

        await expect(
            bridgeDataProvider(sourceAssetDenom, sourceAssetChainId)
        ).rejects.toThrowError();
    });
});

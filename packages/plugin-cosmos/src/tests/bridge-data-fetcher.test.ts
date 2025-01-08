import { describe, it, expect, vi, beforeEach } from "vitest";
import { BridgeDataFetcher } from "../actions/ibc-transfer/services/bridge-data-fetcher";
import axios from "axios";

vi.mock("axios");

describe("BridgeDataFetcher", () => {
    let fetcher: BridgeDataFetcher;

    beforeEach(() => {
        fetcher = BridgeDataFetcher.getInstance();
        vi.clearAllMocks();
    });

    it("should return the same instance from getInstance", () => {
        const fetcher1 = BridgeDataFetcher.getInstance();
        const fetcher2 = BridgeDataFetcher.getInstance();
        expect(fetcher1).toBe(fetcher2);
    });

    it("should use cache when data is already fetched", async () => {
        const mockResponse = {
            dest_assets: {
                someKey: {
                    assets: [
                        {
                            denom: "atom",
                            chain_id: "cosmos",
                            origin_denom: "atom",
                            origin_chain_id: "cosmos",
                            trace: "someTrace",
                            symbol: "ATOM",
                            name: "Cosmos Atom",
                            logo_uri: "http://someurl.com/logo.png",
                            decimals: 6,
                            recommended_symbol: "ATOM",
                        },
                    ],
                },
            },
        };

        // @ts-expect-error -- ...
        axios.post.mockResolvedValueOnce({ data: mockResponse });

        const sourceAssetDenom = "atom";
        const sourceAssetChainId = "cosmos";

        await fetcher.fetchBridgeData(sourceAssetDenom, sourceAssetChainId);

        expect(axios.post).toHaveBeenCalledTimes(1);

        await fetcher.fetchBridgeData(sourceAssetDenom, sourceAssetChainId);
        expect(axios.post).toHaveBeenCalledTimes(1); // axios nie powinien być wywołany ponownie
    });

    it("should fetch and cache data correctly", async () => {
        const mockResponse = {
            dest_assets: {
                someKey: {
                    assets: [
                        {
                            denom: "atom",
                            chain_id: "cosmos",
                            origin_denom: "atom",
                            origin_chain_id: "cosmos",
                            trace: "someTrace",
                            symbol: "ATOM",
                            name: "Cosmos Atom",
                            logo_uri: "http://someurl.com/logo.png",
                            decimals: 6,
                            recommended_symbol: "ATOM",
                        },
                    ],
                },
            },
        };

        // @ts-expect-error -- ...
        axios.post.mockResolvedValueOnce({ data: mockResponse });

        const sourceAssetDenom = "atom";
        const sourceAssetChainId = "cosmos";

        const result = await fetcher.fetchBridgeData(
            sourceAssetDenom,
            sourceAssetChainId
        );

        expect(result).toEqual(mockResponse);

        const cacheKey = `${sourceAssetDenom}_${sourceAssetChainId}`;
        expect(fetcher["cache"].has(cacheKey)).toBe(true);

        const cachedResult = await fetcher.fetchBridgeData(
            sourceAssetDenom,
            sourceAssetChainId
        );
        expect(cachedResult).toEqual(mockResponse);
    });
});

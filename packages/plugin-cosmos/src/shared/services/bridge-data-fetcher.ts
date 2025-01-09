import { bridgeDataProviderResponseSchema } from "../../actions/ibc-transfer/schema";
import {
    BridgeDataProviderParams,
    BridgeDataProviderResponse,
} from "../../actions/ibc-transfer/types";
import axios from "axios";

type CacheKey = `${string}_${string}`;

export class BridgeDataFetcher {
    private static instance: BridgeDataFetcher;
    private cache: Map<CacheKey, BridgeDataProviderResponse>;
    private readonly apiUrl: string;

    private constructor() {
        this.cache = new Map();
        this.apiUrl = "https://api.skip.build/v2/fungible/assets_from_source";
    }

    public static getInstance(): BridgeDataFetcher {
        if (!BridgeDataFetcher.instance) {
            BridgeDataFetcher.instance = new BridgeDataFetcher();
        }
        return BridgeDataFetcher.instance;
    }

    private generateCacheKey(
        sourceAssetDenom: string,
        sourceAssetChainId: string
    ): CacheKey {
        return `${sourceAssetDenom}_${sourceAssetChainId}`;
    }

    public async fetchBridgeData(
        sourceAssetDenom: string,
        sourceAssetChainId: string
    ): Promise<BridgeDataProviderResponse> {
        const cacheKey = this.generateCacheKey(
            sourceAssetDenom,
            sourceAssetChainId
        );

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const requestData: BridgeDataProviderParams = {
            source_asset_denom: sourceAssetDenom,
            source_asset_chain_id: sourceAssetChainId,
            allow_multi_tx: false,
        };

        try {
            const response = await axios.post(this.apiUrl, requestData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const validResponse = bridgeDataProviderResponseSchema.parse(
                response.data
            );

            this.cache.set(cacheKey, validResponse);
            return response.data;
        } catch (error) {
            console.error("Error fetching assets:", error);
            throw error;
        }
    }
}

import { z } from "zod";
import {
    bridgeDataProviderParamsSchema,
    bridgeDataProviderResponseAssetsSchema,
    bridgeDataProviderResponseSchema,
    IBCTransferParamsSchema,
} from "./schema";

export type IBCTransferActionParams = z.infer<typeof IBCTransferParamsSchema>;
export type BridgeDataProviderParams = z.infer<
    typeof bridgeDataProviderParamsSchema
>;
export type BridgeDataProviderResponseAsset = z.infer<
    typeof bridgeDataProviderResponseAssetsSchema
>;
export type BridgeDataProviderResponse = z.infer<
    typeof bridgeDataProviderResponseSchema
>;

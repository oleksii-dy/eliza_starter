import { Plugin } from "@elizaos/core";
import { getAirQualityAction } from "./actions/getAirQuality";
import { getWaterQualityAction } from "./actions/getWaterQuality";
import { elizaLogger } from "@elizaos/core";

elizaLogger.info("Initializing environmental data plugin");

// The name should match what handlePluginImporting expects
export const environmentalDataPlugin: Plugin = {
    name: "environmental-data",
    description: "Environmental data plugin for Eliza using Meersens API",
    actions: [getAirQualityAction, getWaterQualityAction],
    evaluators: [],
    providers: [],
};

// Also export as default for flexibility
export default environmentalDataPlugin;
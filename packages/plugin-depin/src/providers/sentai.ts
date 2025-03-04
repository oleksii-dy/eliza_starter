import {
    type IAgentRuntime,
    type Provider,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";

import { depinDataProvider } from "./depinData";
import { weatherDataProvider } from "./weatherDataProvider";
import { weatherForecastProvider } from "./weatherForecastProvider";

export enum ProviderName {
    DEPIN = "depin",
    WEATHER_CURRENT = "weather-current",
    WEATHER_FORECAST = "weather-forecast",
}

interface ProviderTool {
    name: ProviderName;
    provider: Provider;
}

class ProviderRegistry {
    private providers: ProviderTool[] = [];
    private enabledSources: ProviderName[] = [];

    constructor(runtime: IAgentRuntime) {
        this.register(ProviderName.DEPIN, depinDataProvider);
        this.register(ProviderName.WEATHER_CURRENT, weatherDataProvider);
        this.register(ProviderName.WEATHER_FORECAST, weatherForecastProvider);

        this.setEnabledSources(runtime);
    }

    register(name: ProviderName, provider: Provider): void {
        this.providers.push({ name, provider });
    }

    getProvider(name: ProviderName): Provider | null {
        const providerTool = this.providers.find((p) => p.name === name);
        return providerTool.provider;
    }

    setEnabledSources(runtime: IAgentRuntime): void {
        const sourcesString = runtime.getSetting("SENTAI_SOURCES") || "";

        const sourceStrings = sourcesString.split(",").map((s) => s.trim());

        this.enabledSources = sourceStrings
            .filter((source) =>
                Object.values(ProviderName).includes(source as ProviderName)
            )
            .map((source) => source as ProviderName);

        const invalidSources = sourceStrings.filter(
            (source) =>
                !Object.values(ProviderName).includes(source as ProviderName)
        );
        if (invalidSources.length > 0) {
            elizaLogger.warn(
                `Invalid provider sources found and ignored: ${invalidSources.join(", ")}`
            );
        }
    }

    async fetchFromEnabledSources(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string[]> {
        const results: string[] = [];

        for (const source of this.enabledSources) {
            const provider = this.getProvider(source);
            elizaLogger.info(`Fetching data from ${source} provider`);
            const result = await this.fetchFromSource(
                runtime,
                message,
                provider,
                state
            );
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    async fetchFromSource(
        runtime: IAgentRuntime,
        message: Memory,
        provider: Provider,
        state?: State
    ): Promise<string | null> {
        try {
            const result = await provider.get(runtime, message, state);
            return result;
        } catch (error) {
            elizaLogger.error(`Error fetching from provider: ${error.message}`);
            return null;
        }
    }
}

export const sentaiProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const providerRegistry = new ProviderRegistry(runtime);
            const results = await providerRegistry.fetchFromEnabledSources(
                runtime,
                message,
                state
            );

            if (results.length === 0) {
                return "No data sources were specified or available.";
            }

            return results.join("\n\n");
        } catch (error) {
            elizaLogger.error("Error in Sentai provider:", error.message);
            return null;
        }
    },
};

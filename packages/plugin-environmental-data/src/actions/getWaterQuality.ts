// src/actions/getWaterQuality.ts
import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { validateMeersensConfig } from "../environment";
import { getLocationTemplate } from "../templates";
import { createMeersensService } from "../services/meersens";
import { createCachedGeocoder, createNominatimGeocoder } from "../services/geocoding";
import { LocationContent } from "../types";

const validateLocationContent = (content: unknown): content is LocationContent => {
    return (
        typeof content === 'object' &&
        content !== null &&
        'city' in content &&
        'country' in content &&
        typeof (content as LocationContent).city === 'string' &&
        typeof (content as LocationContent).country === 'string'
    );
};

export const getWaterQualityAction: Action = {
    name: "GET_WATER_QUALITY",
    similes: [
        "WATER_QUALITY",
        "WATER_POLLUTION",
        "WATER_INDEX",
        "CHECK_WATER",
        "WATER_CHECK",
        "WATER_SAFETY",
        "WATER_CLEANLINESS",
        "WATER_PURITY",
    ],
    description: "Get the current water quality for a given location",
    validate: async (runtime: IAgentRuntime) => {
        await validateMeersensConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        }
        state = await runtime.updateRecentMessageState(state);

        const locationContext = composeContext({
            state,
            template: getLocationTemplate,
        });

        const rawContent = await generateMessageResponse({
            runtime,
            context: locationContext,
            modelClass: ModelClass.SMALL,
        });

        if (!validateLocationContent(rawContent)) {
            callback({
                text: "I couldn't understand the location. Please provide a city and country.",
                content: { error: "Invalid location format" },
            });
            return false;
        }

        const content = rawContent;

        if (content.error) {
            callback({
                text: "I need a location to check the water quality. Could you please specify a city?",
                content: { error: "No location provided" },
            });
            return false;
        }

        try {
            // Initialize services
            const config = await validateMeersensConfig(runtime);
            const meersensService = createMeersensService(config.MEERSENS_API_KEY);
            const geocoder = createCachedGeocoder(createNominatimGeocoder());

            // Get coordinates
            elizaLogger.info(`Getting coordinates for ${content.city}, ${content.country}`);
            const coordinates = await geocoder.geocodeLocation(content.city, content.country);

            // Get water quality data
            elizaLogger.info(`Fetching water quality for coordinates: ${coordinates.lat}, ${coordinates.lng}`);
            const waterData = await meersensService.getWaterQuality(
                coordinates.lat,
                coordinates.lng
            );

            elizaLogger.success(
                `Successfully fetched water quality for ${content.city}, ${content.country}`
            );

            if (!waterData.found) {
                throw new Error("Water quality data not found");
              }
              const timestamp = new Date(waterData.datetime).toLocaleString();
              
              let responseText = `The current water quality in ${content.city}, ${content.country} is ${waterData.index.description} (${waterData.index.value}).`;
              
              // You can iterate over pollutants if needed:
              if (waterData.pollutants) {
                const params = Object.entries(waterData.pollutants)
                  .map(([param, data]) => `${param}: ${data.value} ${data.unit}`)
                  .join(', ');
                responseText += `\nParameters: ${params}.`;
              }
              
              // Health recommendations
              if (waterData.health_recommendations) {
                responseText += `\n\nHealth Recommendations:\n`;
                for (const [group, rec] of Object.entries(waterData.health_recommendations)) {
                  responseText += `${group}: ${rec}\n`;
                }
              }
              
              responseText += `\nMeasurement taken at ${timestamp}.`;

            callback({
                text: responseText,
                content: waterData,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error in GET_WATER_QUALITY handler:", error);

            const errorMessage = error.message.includes('No results found')
                ? `I couldn't find the location "${content.city}, ${content.country}". Please check the spelling or try a different location.`
                : `Error fetching water quality: ${error.message}`;

            callback({
                text: errorMessage,
                content: { error: error.message },
            });

            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the water quality like in Venice?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check the current water quality in Venice for you.",
                    action: "GET_WATER_QUALITY",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "The current water quality in Venice is Good (85). Parameters: pH: 7.2, Turbidity: 2.1 NTU, Dissolved Oxygen: 8.5 mg/L.\n\nHealth Recommendations:\nGeneral: Water is safe for recreational activities. Regular monitoring is maintained.\nFor sensitive groups: Consider using additional filtration for drinking water. Measurement taken at 2024-02-18 14:30:00.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Is the water safe in Amsterdam?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check the current water quality in Amsterdam for you.",
                    action: "GET_WATER_QUALITY",
                },
            },
        ],
    ],
};
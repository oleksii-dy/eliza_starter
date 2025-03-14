import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import {
  Action,
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

// Helper to validate location content
const validateLocationContent = (content: unknown): content is LocationContent => {
  return (
    typeof content === "object" &&
    content !== null &&
    "city" in content &&
    "country" in content &&
    typeof (content as LocationContent).city === "string" &&
    typeof (content as LocationContent).country === "string"
  );
};

export const getAirQualityAction: Action = {
  name: "GET_AIR_QUALITY",
  similes: [
    "AIR_QUALITY",
    "AIR_POLLUTION",
    "AIR_INDEX",
    "CHECK_AIR",
    "AIR_CHECK",
    "POLLUTION_LEVEL",
    "AIR_POLLUTION_INDEX",
  ],
  description: "Get the current air quality for a given location",
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
        text: "I need a location to check the air quality. Could you please specify a city?",
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

      // Get air quality data
      elizaLogger.info(`Fetching air quality for coordinates: ${coordinates.lat}, ${coordinates.lng}`);
      const airData = await meersensService.getAirQuality(coordinates.lat, coordinates.lng);

      if (!airData.found) {
        throw new Error("Air quality data not found");
      }

      // Format timestamp
      const timestamp = new Date(airData.datetime).toLocaleString();

      // Build response text
      let responseText = `The current air quality in ${content.city}, ${content.country} is ${airData.index.description} (${airData.index.value}).\n`;

      // List pollutants
      const pollutantsInfo = Object.entries(airData.pollutants)
        .map(
          ([key, data]) =>
            `${data.name} (${key}): ${data.value} ${data.unit}`
        )
        .join(", ");
      responseText += `Pollutants: ${pollutantsInfo}.\n`;
      responseText += `Measurement taken at ${timestamp}.`;

      callback({
        text: responseText,
        content: airData,
      });

      return true;
    } catch (error) {
      elizaLogger.error("Error in GET_AIR_QUALITY handler:", error);

      const errorMessage = error.message.includes("No results found")
        ? `I couldn't find the location "${content.city}, ${content.country}". Please check the spelling or try a different location.`
        : `Error fetching air quality: ${error.message}`;

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
          text: "What's the air quality in Paris?",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current air quality in Paris for you.",
          action: "GET_AIR_QUALITY",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "The current air quality in Paris is Air quality level will present a risk for health for an exposure time superior to several days (37.4). Pollutants: Ozone (o3): 70.5 µg/m³, Nitrogen dioxide (no2): 4.5 µg/m³, Carbon monoxide (co): 215.7 µg/m³, Particulate matter 10 (pm10): 21.6 µg/m³, Particulate matter 2.5 (pm25): 7 µg/m³, Sulfur dioxide (so2): 0.6 µg/m³. Measurement taken at ...",
        },
      },
    ],
  ],
};

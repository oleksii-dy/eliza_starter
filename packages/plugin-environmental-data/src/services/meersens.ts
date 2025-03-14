// src/services/meersens.ts
import { AirQualityResponse, WaterQualityResponse } from "../types";
import { elizaLogger } from "@elizaos/core";

const BASE_URL = "https://api.meersens.com/environment/public";

export const createMeersensService = (apiKey: string) => {
    // Validate API key immediately
    if (!apiKey) {
        elizaLogger.error("No API key provided to Meersens service");
        throw new Error("MEERSENS_API_KEY is required");
    }

    elizaLogger.info("Creating Meersens service with API key", apiKey.substring(0, 4) + "...");

    const getWaterQuality = async (
        lat: number,
        lng: number
    ): Promise<WaterQualityResponse> => {
        try {
            elizaLogger.info(`Fetching water quality for coordinates: ${lat}, ${lng}`);
            
            const url = new URL(`${BASE_URL}/water/current`);
            url.searchParams.append("lat", lat.toString());
            url.searchParams.append("lng", lng.toString());
            url.searchParams.append("health_recommendations", "true");

            elizaLogger.info(`Making request to: ${url.toString()}`);
            elizaLogger.info(`Using API key: ${apiKey.substring(0, 4)}...`);

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'apikey': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                elizaLogger.error("API Response not OK:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody
                });
                
                throw new Error(
                    errorBody?.message || 
                    `API request failed with status ${response.status}: ${response.statusText}`
                );
            }

            const data = await response.json();
            elizaLogger.success("Successfully fetched water quality data");
            return data;
        } catch (error) {
            elizaLogger.error("Water Quality API Error:", {
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });
            throw error;
        }
    };

    const getAirQuality = async (
        lat: number,
        lng: number
    ): Promise<AirQualityResponse> => {
        try {
            elizaLogger.info(`Fetching air quality for coordinates: ${lat}, ${lng}`);
            
            const url = new URL(`${BASE_URL}/air/current`);
            url.searchParams.append("lat", lat.toString());
            url.searchParams.append("lng", lng.toString());
            url.searchParams.append("index_type", "meersens");
            url.searchParams.append("health_recommendations", "false");

            elizaLogger.info(`Making request to: ${url.toString()}`);
            elizaLogger.info(`Using API key: ${apiKey.substring(0, 4)}...`);

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'apikey': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                elizaLogger.error("API Response not OK:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody
                });
                
                throw new Error(
                    errorBody?.message || 
                    `API request failed with status ${response.status}: ${response.statusText}`
                );
            }

            const data = await response.json();
            elizaLogger.success("Successfully fetched air quality data");
            return data;
        } catch (error) {
            elizaLogger.error("Air Quality API Error:", {
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });
            throw error;
        }
    };

    return { getAirQuality, getWaterQuality };
};
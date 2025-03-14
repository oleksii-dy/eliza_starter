// src/services.ts
import { AirQualityResponse, WaterQualityResponse } from "./types";

const BASE_URL = "https://api.meersens.com/environment/public";

export const createMeersensService = (apiKey: string) => {
    const getAirQuality = async (
        lat: number,
        lng: number
    ): Promise<AirQualityResponse> => {
        try {
            const url = new URL(`${BASE_URL}/air/current`);
            url.searchParams.append("lat", lat.toString());
            url.searchParams.append("lng", lng.toString());
            url.searchParams.append("index_type", "meersens");
            url.searchParams.append("health_recommendations", "false");

            const response = await fetch(url, {
                headers: {
                    accept: "application/json",
                    apikey: apiKey,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error?.message || response.statusText);
            }

            return await response.json();
        } catch (error) {
            console.error("Air Quality API Error:", error.message);
            throw error;
        }
    };

    const getWaterQuality = async (
        lat: number,
        lng: number
    ): Promise<WaterQualityResponse> => {
        try {
            const url = new URL(`${BASE_URL}/water/current`);
            url.searchParams.append("lat", lat.toString());
            url.searchParams.append("lng", lng.toString());
            url.searchParams.append("health_recommendations", "true");

            const response = await fetch(url, {
                headers: {
                    accept: "application/json",
                    apikey: apiKey,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error?.message || response.statusText);
            }

            return await response.json();
        } catch (error) {
            console.error("Water Quality API Error:", error.message);
            throw error;
        }
    };

    return { getAirQuality, getWaterQuality };
};
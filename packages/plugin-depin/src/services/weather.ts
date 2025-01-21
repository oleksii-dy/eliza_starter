import { IAgentRuntime } from "@elizaos/core";
import axios from "axios";

export type WeatherData = {
    latitude: number;
    longitude: number;
    temperature: number;
    condition: string;
    condition_desc: string;
    condition_code: number;
    temperature_min: number;
    temperature_max: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    wind_scale: number;
    wind_direction: number;
    uv: number;
    luminance: number;
    elevation: number;
    rain: number;
    wet_bulb: number;
    timestamp: number;
    parsed_timestamp: string;
    timezone: number;
    location_name: string;
    address: string;
    source: string;
    tag: string;
};

export async function getWeather(
    runtime: IAgentRuntime,
    coordinates: { lat: number; lon: number }
): Promise<WeatherData> {
    const apiKey = runtime.getSetting("NUBILA_API_KEY");
    const apiUrl = `https://api.nubila.ai/api/v1/weather?lat=${coordinates.lat}&lon=${coordinates.lon}`;
    const response = await axios.get(apiUrl, {
        headers: { "x-api-key": apiKey },
    });
    if (response.data.ok) {
        return {
            ...response.data.data,
            parsed_timestamp: new Date(
                response.data.data.timestamp * 1000
            ).toISOString(),
        };
    } else {
        throw new Error("Failed to fetch weather data");
    }
}
